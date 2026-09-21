// El repository es un intermediario simple entre el service y el DAO.
// Por ahora solo reenvía el pedido, pero a medida que crezca el proyecto
// es el lugar indicado para combinar datos de más de una fuente si hiciera
// falta, sin que el service tenga que saber de dónde vienen.

import EventsDAO from '../dao/events.dao.js';

const dao = new EventsDAO();

class EventsRepository {
  async getAll() {
    return await dao.getAll();
  }
}

export default EventsRepository;
