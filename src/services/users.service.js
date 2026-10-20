// Reglas de negocio de la gestión de usuarios (distinto de sessions.service,
// que se ocupa del registro y de validar credenciales). Por ahora solo
// existe el listado, que es una operación administrativa: quién puede
// pedirlo lo decide el middleware authorize() en la ruta, no este código.

import UsersRepository from '../repositories/users.repository.js';

const repository = new UsersRepository();

class UsersService {
  async getAllUsers() {
    const users = await repository.getAll();

    // Segunda barrera de seguridad: aunque el DAO ya pidió los usuarios
    // sin password, acá lo sacamos de nuevo de forma explícita. Así, si
    // alguien en el futuro cambiara el DAO y se olvidara de ese detalle,
    // la contraseña seguiría sin poder salir en la respuesta.
    return users.map((user) => {
      const plainUser = typeof user.toObject === 'function' ? user.toObject() : user;
      const { password: _password, ...userWithoutPassword } = plainUser;
      return userWithoutPassword;
    });
  }
}

export default UsersService;
