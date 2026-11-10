// Reglas de negocio de la gestión de usuarios (distinto de sessions.service,
// que se ocupa del registro y de validar credenciales). Por ahora solo
// existe el listado, que es una operación administrativa: quién puede
// pedirlo lo decide el middleware authorize() en la ruta, no este código.
//
// Este service devuelve los usuarios tal cual salen del repository. Qué datos
// de cada usuario viajan en la respuesta HTTP lo decide el DTO
// (src/dto/user.dto.js), que el controller aplica antes de responder: así el
// password nunca sale, ni siquiera hasheado.

import UsersRepository from '../repositories/users.repository.js';

const repository = new UsersRepository();

class UsersService {
  async getAllUsers() {
    return await repository.findAll();
  }
}

export default UsersService;
