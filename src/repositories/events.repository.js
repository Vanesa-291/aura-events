// El repository es el intermediario entre el service y el DAO. Ofrece
// operaciones con nombres del dominio y arma, con las operaciones genéricas
// del DAO, lo que el service necesita. No importa ningún modelo: todo lo que
// toca la base pasa por el DAO.

import EventsDAO from '../dao/events.dao.js';

// Los estados válidos de un evento, para que el service los use sin tener que
// importar el modelo.
export { EVENT_STATUSES } from '../dao/events.dao.js';

const dao = new EventsDAO();

class EventsRepository {
  async findById(id) {
    return await dao.findById(id);
  }

  // Trae UNA página de eventos que cumplan el filtro y además cuenta cuántos
  // eventos cumplen el filtro en total (sin importar la página). Ese total es
  // el que permite calcular cuántas páginas hay. Las dos consultas son
  // independientes, así que se lanzan juntas con Promise.all.
  async findPaginated(filter, { sort, skip, limit }) {
    const [items, total] = await Promise.all([
      dao.find(filter, { sort, skip, limit }),
      dao.count(filter),
    ]);

    return { items, total };
  }

  async create(eventData) {
    return await dao.create(eventData);
  }

  async update(id, changes) {
    return await dao.update(id, changes);
  }

  async updateStatus(id, status) {
    return await dao.update(id, { status });
  }
}

export default EventsRepository;
