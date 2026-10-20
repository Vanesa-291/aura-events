// El DAO es la única capa que sabe que "por debajo" hay una base de datos
// Mongo. Si el día de mañana cambiamos de motor de base de datos, esto es
// lo único que habría que tocar.

import Event from '../models/Event.js';

class EventsDAO {
  async getAll() {
    return await Event.find();
  }

  // Eventos visibles para el público: todos los que NO están cancelados.
  // Usamos $ne ("distinto de") en vez de pedir status === 'published'
  // para que también aparezcan los eventos que se hayan guardado antes de
  // que existiera el campo "status" (esos documentos no tienen el campo,
  // y una búsqueda por 'published' no los encontraría).
  async getPublished() {
    return await Event.find({ status: { $ne: 'cancelled' } });
  }

  async getById(id) {
    return await Event.findById(id);
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
