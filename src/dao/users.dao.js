// Igual que events.dao.js: este es el único archivo de todo el proyecto
// que le habla directamente a Mongoose/MongoDB sobre usuarios. Si el día
// de mañana cambiara el motor de base de datos, esto es lo único que
// habría que reescribir — el resto de las capas (repository, service,
// controller) no tendrían que enterarse del cambio.

import User from '../models/User.js';

class UsersDAO {
  async create(userData) {
    return await User.create(userData);
  }

  async findByEmail(email) {
    return await User.findOne({ email });
  }
}

export default UsersDAO;
