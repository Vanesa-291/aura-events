// Acá viven TODAS las reglas del negocio de las inscripciones: qué hace
// falta para poder anotarse a un evento, cómo se calculan los cupos, quién
// puede ver o cancelar cada ticket. Igual que con los eventos, la consigna
// pide que esto esté en la capa de services y no en las rutas ni en los
// controllers: el router y el controller de tickets no toman ninguna
// decisión, solo reciben, le pasan los datos a este archivo y devuelven
// lo que este archivo resuelve.
//
// Reglas de esta entrega:
//
//   • Una persona puede tener UN solo ticket activo por evento (puede
//     reservar varios lugares en ese ticket usando "quantity"). Si cancela,
//     puede volver a anotarse.
//   • El cupo de un evento es su "capacity". Ocupan cupo los tickets
//     activos (confirmed y pending), sumando su "quantity". Los
//     cancelled NO ocupan cupo.
//   • El cupo disponible NO se guarda en ningún lado: se calcula cada vez
//     sumando los tickets activos. Por eso, al cancelar un ticket, el lugar
//     queda libre automáticamente, sin tener que "devolver" nada.

import TicketsRepository from '../repositories/tickets.repository.js';
import EventsRepository from '../repositories/events.repository.js';
import MailService from './mail.service.js';
import { TICKET_STATUSES } from '../models/Ticket.js';
import { PERMISSIONS } from '../config/roles.config.js';
import { AppError } from '../utils/appError.js';
import { randomInt } from 'node:crypto';

const ticketsRepository = new TicketsRepository();
const eventsRepository = new EventsRepository();
const mailService = new MailService();

// ============================================================================
// CONSTANTES
// ============================================================================

// Un id de MongoDB son 24 caracteres hexadecimales (ver events.service.js).
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

// Cómo se nombra cada estado de evento en los mensajes de error.
const EVENT_STATUS_LABELS = { cancelled: 'cancelado', finished: 'finalizado' };

// Alfabeto del código de reserva. A propósito sin letras ni números que se
// confunden al leerlos (0/O, 1/I/L).
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;
const MAX_CODE_ATTEMPTS = 5;

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function assertValidId(id, label) {
  if (!OBJECT_ID_REGEX.test(id)) {
    throw new AppError(`El id del ${label} no es válido`, 400);
  }
}

async function findEventOrFail(eventId) {
  assertValidId(eventId, 'evento');

  const event = await eventsRepository.getById(eventId);
  if (!event) {
    throw new AppError('Evento no encontrado', 404);
  }

  return event;
}

// Solo se puede inscribir a un evento publicado. Cada otro estado tiene su
// propio mensaje para que se entienda por qué no se puede.
function assertEventOpenForTickets(event) {
  if (event.status === 'published') return;

  if (EVENT_STATUS_LABELS[event.status]) {
    throw new AppError(
      `No se puede inscribir a un evento ${EVENT_STATUS_LABELS[event.status]}`,
      409
    );
  }

  throw new AppError('El evento todavía no está publicado', 409);
}

// La cantidad es opcional (si no viene, se reserva 1 lugar). Si viene, tiene
// que ser un número entero mayor a 0: Number.isSafeInteger descarta
// decimales, textos, null, números gigantes, etc.
function parseQuantity(body) {
  const input = body && typeof body === 'object' ? body : {};

  if (input.quantity === undefined) return 1;

  if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) {
    throw new AppError('La cantidad (quantity) debe ser un número entero mayor a 0', 400);
  }

  return input.quantity;
}

// Arma el código de reserva, por ejemplo AURA-K7M2QX9P. randomInt usa un
// generador seguro, así que los códigos no se pueden adivinar.
function generateReservationCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return `AURA-${code}`;
}

function isDuplicateCodeError(err) {
  return err && err.code === 11000 && /reservationCode/.test(JSON.stringify(err.keyPattern || err.message));
}

// Guarda el ticket. Si por una casualidad enorme el código generado ya
// existía (el índice único de Mongo lo rechaza), se prueba con otro.
async function createWithUniqueCode(ticketData) {
  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt += 1) {
    try {
      return await ticketsRepository.create({
        ...ticketData,
        reservationCode: generateReservationCode(),
      });
    } catch (err) {
      if (!isDuplicateCodeError(err) || attempt === MAX_CODE_ATTEMPTS) throw err;
    }
  }
}

function noSeatsError(available, requested) {
  if (available <= 0) {
    return new AppError('No quedan cupos disponibles para este evento', 409);
  }

  return new AppError(
    `No hay cupo suficiente: quedan ${available} ${available === 1 ? 'lugar' : 'lugares'} y pediste ${requested}`,
    409
  );
}

// ¿Esta persona es dueña del ticket o es admin?
function canManageTicket(ticket, user) {
  const isAdmin = PERMISSIONS.MANAGE_ANY_TICKET.includes(user.role);
  const isOwner = ticket.user && ticket.user.toString() === user.id;

  return isAdmin || Boolean(isOwner);
}

// ¿Esta persona puede ver los tickets de este evento? Un admin puede con
// cualquiera; un organizer, solo con los de los eventos que creó él (igual
// que en events.service.js: el rol lo revisa el middleware authorize() y la
// propiedad se revisa acá, porque hace falta mirar el evento).
function canViewEventTickets(event, user) {
  const isAdmin = PERMISSIONS.MANAGE_ANY_EVENT.includes(user.role);
  const isOwner = event.organizer && event.organizer.toString() === user.id;

  return isAdmin || Boolean(isOwner);
}

// ============================================================================
// SERVICE
// ============================================================================

class TicketsService {
  // Inscribe a la persona autenticada a un evento. "user" es req.user (datos
  // del JWT): de ahí sale quién es. El body solo puede aportar "quantity";
  // cualquier otro campo (user, event, status, reservationCode...) se
  // ignora, igual que "role" en el registro o "organizer" al crear eventos.
  async createTicket(eventId, body, user) {
    // 1) El evento existe.
    const event = await findEventOrFail(eventId);

    // 2) Está publicado (no cancelado, no finalizado, no borrador).
    assertEventOpenForTickets(event);

    // 3) La cantidad es válida.
    const quantity = parseQuantity(body);

    // 4) La persona no tiene ya un ticket activo para este evento.
    const alreadyActive = await ticketsRepository.countActiveByUserAndEvent(user.id, event.id);
    if (alreadyActive > 0) {
      throw new AppError('Ya tenés una inscripción activa para este evento', 409);
    }

    // 5) Hay cupo: lo ocupado se calcula sumando los tickets ACTIVOS.
    const occupied = await ticketsRepository.sumActiveQuantityByEvent(event.id);
    const available = Math.max(event.capacity - occupied, 0);
    if (quantity > available) {
      throw noSeatsError(available, quantity);
    }

    const ticket = await createWithUniqueCode({
      user: user.id,
      event: event.id,
      quantity,
      status: 'confirmed',
    });

    // 6) Segunda comprobación, por si dos pedidos llegaron al mismo tiempo.
    // Los pasos 4 y 5 se hicieron ANTES de guardar, así que dos pedidos
    // simultáneos podrían haber pasado los dos. Ahora que el ticket ya está
    // guardado, se vuelve a mirar: si la reserva quedó duplicada o se pasó
    // del cupo, este ticket se cancela (no se borra) y se avisa. Es la
    // manera de no vender más lugares de los que hay.
    const [totalOccupied, activeOfUser] = await Promise.all([
      ticketsRepository.sumActiveQuantityByEvent(event.id),
      ticketsRepository.countActiveByUserAndEvent(user.id, event.id),
    ]);

    if (activeOfUser > 1) {
      await ticketsRepository.cancelById(ticket.id);
      throw new AppError('Ya tenés una inscripción activa para este evento', 409);
    }

    if (totalOccupied > event.capacity) {
      await ticketsRepository.cancelById(ticket.id);
      throw new AppError(
        'No se pudo completar la inscripción porque otra persona reservó al mismo tiempo. Volvé a intentarlo para ver el cupo actualizado',
        409
      );
    }

    // 7) Email de confirmación. Si el envío falla, la inscripción sigue en
    // pie: solo se informa con emailSent: false.
    const emailSent = await mailService.sendTicketConfirmation({
      to: user.email,
      event,
      ticket,
    });

    return { ticket, emailSent };
  }

  // Los tickets de la persona autenticada, con título, fecha y lugar de
  // cada evento (populate). Se busca SIEMPRE por el id que sale del JWT, así
  // que no hay forma de pedir los tickets de otra persona.
  async getMyTickets(user) {
    return await ticketsRepository.findByUser(user.id);
  }

  // Los tickets de un evento, para su organizer o para un admin. Incluye un
  // resumen del cupo para ver de un vistazo cuántos lugares quedan.
  async getEventTickets(eventId, query, user) {
    const event = await findEventOrFail(eventId);

    if (!canViewEventTickets(event, user)) {
      throw new AppError('No tenés permisos sobre este evento', 403);
    }

    // Filtro opcional ?status=confirmed. Tiene que ser un texto y uno de los
    // estados válidos (si no, 400): así tampoco se pueden colar operadores
    // de MongoDB por la URL.
    let status;
    if (query && query.status !== undefined) {
      if (typeof query.status !== 'string' || !TICKET_STATUSES.includes(query.status)) {
        throw new AppError(
          `El parámetro status no es válido (usá: ${TICKET_STATUSES.join(', ')})`,
          400
        );
      }
      status = query.status;
    }

    const [tickets, occupied] = await Promise.all([
      ticketsRepository.findByEvent(event.id, status),
      ticketsRepository.sumActiveQuantityByEvent(event.id),
    ]);

    return {
      tickets,
      summary: {
        capacity: event.capacity,
        occupied,
        available: Math.max(event.capacity - occupied, 0),
      },
    };
  }

  // Cancela un ticket. Solo su dueño o un admin. No elimina nada: cambia el
  // estado a cancelled y anota cancelledAt. Como el cupo se calcula
  // sumando solo los tickets activos, el lugar queda libre solo.
  async cancelTicket(ticketId, user) {
    assertValidId(ticketId, 'ticket');

    const ticket = await ticketsRepository.getById(ticketId);
    if (!ticket) {
      throw new AppError('Ticket no encontrado', 404);
    }

    if (!canManageTicket(ticket, user)) {
      throw new AppError('No tenés permisos sobre este ticket', 403);
    }

    if (ticket.status === 'cancelled') {
      throw new AppError('El ticket ya está cancelado', 409);
    }

    const cancelled = await ticketsRepository.cancelById(ticket.id);

    // Si dos pedidos intentaron cancelar el mismo ticket a la vez, uno de
    // los dos llega acá con null.
    if (!cancelled) {
      throw new AppError('El ticket ya está cancelado', 409);
    }

    return cancelled;
  }
}

export default TicketsService;
