// Igual que events.repository.js: por ahora es un intermediario simple
// que reenvía el pedido al DAO. La ventaja de que exista esta capa,
// aunque hoy parezca "de más", es que el service nunca importa el DAO
// directamente — siempre pasa por acá. Si más adelante necesitáramos,
// por ejemplo, buscar datos de usuario combinando MongoDB con otra
// fuente, este es el lugar donde se resolvería, sin que el service se
// entere de ese detalle.

import UsersDAO from '../dao/users.dao.js';

const dao = new UsersDAO();

class UsersRepository {
  async create(userData) {
    return await dao.create(userData);
  }

  async findByEmail(email) {
    return await dao.findByEmail(email);
  }
}

export default UsersRepository;
