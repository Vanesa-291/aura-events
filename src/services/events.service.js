// Acá viven las reglas del negocio relacionadas a eventos: qué datos son
// válidos para un evento, y quién puede modificar o cancelar cada uno.
//
// Sobre los permisos, hay DOS niveles y es importante no confundirlos:
//
//   1) Permiso por ROL ("¿un user puede crear eventos?"): lo resuelve el
//      middleware authorize() en la ruta, ANTES de llegar acá. Si el rol
//      no alcanza, este código ni siquiera se ejecuta.
//
//   2) Permiso por PROPIEDAD ("¿este organizer puede tocar ESTE evento
//      en particular?"): no se puede decidir en un middleware genérico
//      porque hace falta mirar el evento en la base de datos para saber
//      de quién es. Por eso esa comprobación vive acá, en
//      assertCanManage().

import EventsRepository from '../repositories/events.repository.js';
import { PERMISSIONS } from '../config/roles.config.js';
import { AppError } from '../utils/appError.js';

const repository = new EventsRepository();

// Un id de MongoDB son 24 caracteres hexadecimales. Si llega otra cosa
// en la URL (por ejemplo /api/events/abc), respondemos 400 de entrada en
// vez de dejar que Mongoose falle al intentar convertirlo.
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

// Los únicos campos que se pueden recibir del body al crear o modificar
// un evento. Todo lo demás (createdBy, status, _id, etc.) se ignora, igual
// que pasa con "role" en el registro: el cliente no decide esos datos.
const TEXT_FIELDS = ['title', 'description', 'location'];

// Valida y limpia los campos de un evento. Si "requireAll" es true (crear),
// exige que estén todos. Si es false (modificar), valida solo los que
// llegaron. Devuelve un objeto nuevo con los datos ya limpios: los textos
// recortados, la fecha convertida a Date y la capacidad como número.
function parseEventFields(body, { requireAll }) {
  const data = {};
  const input = body || {};

  for (const field of TEXT_FIELDS) {
    if (input[field] === undefined) continue;

    // .trim() para que un texto de puros espacios cuente como vacío.
    const value = typeof input[field] === 'string' ? input[field].trim() : '';
    if (!value) {
      throw new AppError(`El campo ${field} no puede estar vacío`, 400);
    }
    data[field] = value;
  }

  if (input.date !== undefined) {
    const date = new Date(input.date);
    if (Number.isNaN(date.getTime())) {
      throw new AppError('La fecha del evento no es válida', 400);
    }
    data.date = date;
  }

  if (input.capacity !== undefined) {
    // Number.isInteger descarta decimales, strings, null, etc.
    if (!Number.isInteger(input.capacity) || input.capacity <= 0) {
      throw new AppError('La capacidad debe ser un número entero mayor a 0', 400);
    }
    data.capacity = input.capacity;
  }

  if (requireAll) {
    const required = [...TEXT_FIELDS, 'date', 'capacity'];
    if (required.some((field) => data[field] === undefined)) {
      throw new AppError('Faltan campos obligatorios', 400);
    }
  }

  return data;
}

// Regla de propiedad: un admin puede gestionar cualquier evento; un
// organizer, solo los que creó él. "user" es una persona autenticada que
// pasó el middleware de rol: esta función se encarga del segundo nivel.
function assertCanManage(event, user) {
  const canManageAny = PERMISSIONS.MANAGE_ANY_EVENT.includes(user.role);
  const isOwner = event.createdBy && event.createdBy.toString() === user.id;

  if (!canManageAny && !isOwner) {
    throw new AppError('No tenés permisos sobre este evento', 403);
  }
}

// Busca el evento y valida que exista y que el usuario pueda gestionarlo.
async function findManageableEvent(id, user) {
  if (!OBJECT_ID_REGEX.test(id)) {
    throw new AppError('El id del evento no es válido', 400);
  }

  const event = await repository.getById(id);
  if (!event) {
    throw new AppError('Evento no encontrado', 404);
  }

  assertCanManage(event, user);

  return event;
}

class EventsService {
  // Lista pública: solo eventos no cancelados.
  async getEvents() {
    return await repository.getPublished();
  }

  // "user" es req.user: los datos que salieron del JWT ({ id, email,
  // role }). El organizador del evento SIEMPRE se toma de ahí — nunca del
  // body — para que nadie pueda crear un evento "a nombre de" otra
  // persona.
  async createEvent(body, user) {
    const data = parseEventFields(body, { requireAll: true });

    return await repository.create({
      ...data,
      createdBy: user.id,
    });
  }

  async updateEvent(id, body, user) {
    const event = await findManageableEvent(id, user);

    if (event.status === 'cancelled') {
      throw new AppError('No se puede modificar un evento cancelado', 409);
    }

    const changes = parseEventFields(body, { requireAll: false });
    if (Object.keys(changes).length === 0) {
      throw new AppError('No hay campos válidos para actualizar', 400);
    }

    return await repository.updateById(id, changes);
  }

  async cancelEvent(id, user) {
    const event = await findManageableEvent(id, user);

    if (event.status === 'cancelled') {
      throw new AppError('El evento ya está cancelado', 409);
    }

    return await repository.updateById(id, { status: 'cancelled' });
  }
}

export default EventsService;
