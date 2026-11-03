// Igual que los otros repositories: un intermediario simple entre el
// service y el DAO. El service nunca importa el DAO directamente, siempre
// pasa por acá.

import TicketsDAO from '../dao/tickets.dao.js';

const dao = new TicketsDAO();

class TicketsRepository {
  async create(ticketData) {
    return await dao.create(ticketData);
  }

  async getById(id) {
    return await dao.getById(id);
  }

  async findByUser(userId) {
    return await dao.findByUser(userId);
  }

  async findByEvent(eventId, status) {
    return await dao.findByEvent(eventId, status);
  }

  async sumActiveQuantityByEvent(eventId) {
    return await dao.sumActiveQuantityByEvent(eventId);
  }

  async countActiveByUserAndEvent(userId, eventId) {
    return await dao.countActiveByUserAndEvent(userId, eventId);
  }

  async cancelById(id) {
    return await dao.cancelById(id);
  }
}

export default TicketsRepository;
