// El DAO (Data Access Object) es la única capa que le habla directamente a
// Mongoose/MongoDB. Y es el único archivo del proyecto que importa el modelo
// User. Acá no hay reglas de negocio ni nombres "del dominio": solo
// operaciones genéricas de acceso a datos (crear, buscar, contar...). Si el
// día de mañana cambiara el motor de base de datos, esto es lo único que
// habría que reescribir: el resto de las capas no se enteraría.

import User from '../models/User.js';

class UsersDAO {
  async create(userData) {
    return await User.create(userData);
  }

  async findById(id) {
    return await User.findById(id);
  }

  // Busca UN usuario que cumpla el filtro, por ejemplo { email: 'a@b.com' }.
  // Devuelve el documento completo (con password incluido), porque el login
  // necesita comparar el hash. Quién puede ver ese hash y quién no lo decide
  // el resto de las capas (el DTO nunca lo deja salir en una respuesta).
  async findOne(filter) {
    return await User.findOne(filter);
  }

  // Lista todos los usuarios SIN el campo password: .select('-password') le
  // dice a MongoDB que no lo traiga. Es la primera barrera para que el hash
  // de una contraseña nunca salga de la base en un listado; la segunda es el
  // DTO (ver src/dto/user.dto.js).
  async findAll() {
    return await User.find().select('-password');
  }
}

export default UsersDAO;
