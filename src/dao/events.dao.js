// El DAO es la única capa que sabe que "por debajo" hay una base de datos
// Mongo, y el único archivo (junto con los otros dos DAOs) que importa el
// modelo Event. Solo ofrece operaciones genéricas de acceso a datos: lo que
// significa cada filtro (qué es un evento "publicado", por ejemplo) lo
// deciden las capas de arriba.

import Event from '../models/Event.js';

// Los estados válidos de un evento viven junto al modelo. Se vuelven a
// exportar desde acá para que las capas de arriba (repository y service) los
// puedan usar sin importar el modelo directamente.
export { EVENT_STATUSES } from '../models/Event.js';

class EventsDAO {
  async findById(id) {
    return await Event.findById(id);
  }

  // Trae los eventos que cumplan el filtro, y opcionalmente solo una página
  // con un orden dado:
  //
  //   filter → qué eventos buscar (ya armado y validado por el service)
  //   sort   → por qué campos ordenar, por ejemplo { date: 1 }
  //   skip   → cuántos eventos saltear (las páginas anteriores)
  //   limit  → cuántos traer (tamaño de la página)
  async find(filter = {}, { sort, skip, limit } = {}) {
    let query = Event.find(filter);

    if (sort) query = query.sort(sort);
    if (skip !== undefined) query = query.skip(skip);
    if (limit !== undefined) query = query.limit(limit);

    return await query;
  }

  // Cuántos eventos cumplen el filtro (sin importar la página).
  async count(filter = {}) {
    return await Event.countDocuments(filter);
  }

  async create(eventData) {
    return await Event.create(eventData);
  }

  // { new: true } hace que devuelva el documento ya actualizado (por defecto
  // devuelve el de antes del cambio), y runValidators aplica las reglas del
  // modelo (por ejemplo, el enum de status) también al actualizar.
  async update(id, changes) {
    return await Event.findByIdAndUpdate(id, changes, {
      new: true,
      runValidators: true,
    });
  }
}

export default EventsDAO;
