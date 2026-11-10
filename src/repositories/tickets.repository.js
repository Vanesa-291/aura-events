// El repository de tickets traduce las preguntas del dominio ("¿cuántos
// lugares están ocupados?", "cancelá este ticket") a las operaciones
// genéricas del DAO. Acá vive la definición de qué es un ticket ACTIVO
// (confirmed y pending; los cancelled no cuentan) y qué quiere decir
// "cancelar": cambiar el estado, nunca borrar. No importa ningún modelo.

import TicketsDAO, { ACTIVE_TICKET_STATUSES } from '../dao/tickets.dao.js';

// Los estados válidos de un ticket, para que el service los use sin tener que
// importar el modelo.
export { TICKET_STATUSES } from '../dao/tickets.dao.js';

const dao = new TicketsDAO();

// Filtro de estado que deja pasar solo los tickets activos.
const activeStatuses = () => ({ $in: ACTIVE_TICKET_STATUSES });

class TicketsRepository {
  async create(ticketData) {
    return await dao.create(ticketData);
  }

  async findById(id) {
    return await dao.findById(id);
  }

  // Los tickets de UNA persona, los más nuevos primero, con título, fecha y
  // lugar de cada evento (nada más).
  async findByUser(userId) {
    return await dao.find(
      { user: userId },
      {
        sort: { createdAt: -1 },
        populate: { path: 'event', select: 'title date location' },
      }
    );
  }

  // Los tickets de UN evento, los más nuevos primero. De cada persona se
  // completan nombre y email (nunca la contraseña ni el rol). "status" es
  // opcional: sirve para filtrar, por ejemplo, solo los confirmados.
  async findByEvent(eventId, status) {
    const filter = { event: eventId };
    if (status) filter.status = status;

    return await dao.find(filter, {
      sort: { createdAt: -1 },
      populate: { path: 'user', select: 'first_name last_name email' },
    });
  }

  // Cuántos tickets activos tiene una persona en un evento (sirve para
  // detectar inscripciones duplicadas).
  async countActiveTickets(userId, eventId) {
    return await dao.count({
      user: userId,
      event: eventId,
      status: activeStatuses(),
    });
  }

  // Cuántos lugares están ocupados en un evento: la SUMA de "quantity" de los
  // tickets activos. Los cancelled no entran, por eso al cancelar el lugar
  // queda libre solo.
  async countOccupiedSeats(eventId) {
    return await dao.sum('quantity', {
      event: eventId,
      status: activeStatuses(),
    });
  }

  // Cancela un ticket: cambia el estado y anota cuándo. NO borra el
  // documento. El filtro "status distinto de cancelled" hace que, si dos
  // pedidos intentan cancelar el mismo ticket a la vez, solo uno lo logre (el
  // otro recibe null).
  async cancelTicket(id) {
    return await dao.updateOne(
      { _id: id, status: { $ne: 'cancelled' } },
      { $set: { status: 'cancelled', cancelledAt: new Date() } }
    );
  }
}

export default TicketsRepository;
