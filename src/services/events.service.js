// Acá van a vivir las reglas del negocio relacionadas a eventos (por
// ejemplo, más adelante: filtrar por fecha, validar cupos disponibles,
// etc.). Por ahora solo pide la lista completa, sin reglas adicionales.

import EventsRepository from '../repositories/events.repository.js';

const repository = new EventsRepository();

class EventsService {
  async getEvents() {
    return await repository.getAll();
  }
}

export default EventsService;
