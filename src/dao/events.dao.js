// El DAO es la única capa que sabe que "por debajo" hay una base de datos
// Mongo. Si el día de mañana cambiamos de motor de base de datos, esto es
// lo único que habría que tocar.

import Event from '../models/Event.js';

class EventsDAO {
  async getAll() {
    return await Event.find();
  }

  async getById(id) {
    return await Event.findById(id);
  }

  // Trae UNA página de eventos que cumplan el filtro, con el orden pedido,
  // y además cuenta cuántos eventos cumplen el filtro en total (sin
  // importar la página). Ese total es el que permite calcular cuántas
  // páginas hay. Las dos consultas son independientes, así que se lanzan
  // juntas con Promise.all.
  //
  //   filter → qué eventos buscar (ya armado y validado por el service)
  //   sort   → por qué campos ordenar, por ejemplo { date: 1 }
  //   skip   → cuántos eventos saltear (las páginas anteriores)
  //   limit  → cuántos traer (tamaño de la página)
  async findPaginated(filter, { sort, skip, limit }) {
    const [items, total] = await Promise.all([
      Event.find(filter).sort(sort).skip(skip).limit(limit),
      Event.countDocuments(filter),
    ]);

    return { items, total };
  }

  async create(eventData) {
    return await Event.create(eventData);
  }

  // { new: true } hace que devuelva el documento ya actualizado (por
  // defecto devuelve el de antes del cambio), y runValidators aplica las
  // reglas del modelo (por ejemplo, el enum de status) también al
  // actualizar.
  async updateById(id, changes) {
    return await Event.findByIdAndUpdate(id, changes, {
      new: true,
      runValidators: true,
    });
  }
}

export default EventsDAO;
