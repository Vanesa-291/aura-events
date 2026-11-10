// El repository es la capa intermedia entre el service y el DAO. Habla en el
// idioma del dominio ("buscar por email", "listar usuarios") y se apoya en el
// DAO para resolver cómo se hace eso en la base. No importa ningún modelo: si
// necesitara datos, se los pide al DAO. El service nunca importa el DAO
// directamente, siempre pasa por acá.

import UsersDAO from '../dao/users.dao.js';

const dao = new UsersDAO();

class UsersRepository {
  async create(userData) {
    return await dao.create(userData);
  }

  async findById(id) {
    return await dao.findById(id);
  }

  async findByEmail(email) {
    return await dao.findOne({ email });
  }

  async findAll() {
    return await dao.findAll();
  }
}

export default UsersRepository;
