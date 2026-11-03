// El DAO de tickets es, igual que el de eventos y el de usuarios, la única
// capa que conversa directamente con MongoDB. Acá no hay reglas de negocio:
// solo consultas. Qué se considera "cupo ocupado" o "ticket duplicado" lo
// decide el service; este archivo solo sabe CÓMO preguntarle a la base.

import mongoose from 'mongoose';
import Ticket, { ACTIVE_TICKET_STATUSES } from '../models/Ticket.js';
// Se importan los modelos que se usan en populate() para asegurarnos de que
// estén registrados en Mongoose antes de la primera consulta.
import '../models/Event.js';
import '../models/User.js';

class TicketsDAO {
  async create(ticketData) {
    return await Ticket.create(ticketData);
  }

  async getById(id) {
    return await Ticket.findById(id);
  }

  // Los tickets de UNA persona, los más nuevos primero. populate() reemplaza
  // el id del evento por sus datos, pero solo los tres campos que se
  // necesitan mostrar (así no se devuelve de más).
  async findByUser(userId) {
    return await Ticket.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate('event', 'title date location');
  }

  // Los tickets de UN evento, los más nuevos primero. Para el organizer se
  // completan nombre y email de cada persona (nunca la contraseña ni el
  // rol). "status" es opcional: sirve para filtrar, por ejemplo, solo los
  // confirmados.
  async findByEvent(eventId, status) {
    const filter = { event: eventId };
    if (status) filter.status = status;

    return await Ticket.find(filter)
      .sort({ createdAt: -1 })
      .populate('user', 'first_name last_name email');
  }

  // Cuántos lugares están ocupados en un evento: la SUMA de "quantity" de
  // los tickets activos (confirmed y pending). Los cancelled no entran.
  // aggregate() no convierte los ids de texto a ObjectId por su cuenta
  // (find() sí), por eso se hace a mano.
  async sumActiveQuantityByEvent(eventId) {
    const result = await Ticket.aggregate([
      {
        $match: {
          event: new mongoose.Types.ObjectId(eventId),
          status: { $in: ACTIVE_TICKET_STATUSES },
        },
      },
      { $group: { _id: null, total: { $sum: '$quantity' } } },
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  // Cuántos tickets activos tiene una persona en un evento (sirve para
  // detectar inscripciones duplicadas).
  async countActiveByUserAndEvent(userId, eventId) {
    return await Ticket.countDocuments({
      user: userId,
      event: eventId,
      status: { $in: ACTIVE_TICKET_STATUSES },
    });
  }

  // Cancela un ticket: cambia el estado y anota cuándo. NO borra el
  // documento. El filtro "status distinto de cancelled" hace que, si dos
  // pedidos intentan cancelar el mismo ticket a la vez, solo uno lo logre
  // (el otro recibe null).
  async cancelById(id) {
    return await Ticket.findOneAndUpdate(
      { _id: id, status: { $ne: 'cancelled' } },
      { $set: { status: 'cancelled', cancelledAt: new Date() } },
      { new: true, runValidators: true }
    );
  }
}

export default TicketsDAO;
