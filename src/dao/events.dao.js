// El DAO es la única capa que sabe que "por debajo" hay una base de datos
// Mongo. Si el día de mañana cambiamos de motor de base de datos, esto es
// lo único que habría que tocar.

import Event from '../models/Event.js';

class EventsDAO {
  async getAll() {
    return await Event.find();
  }
}

export default EventsDAO;
