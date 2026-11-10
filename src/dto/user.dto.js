// DTOs de usuario. Ninguno de los dos expone jamás el campo "password", ni
// siquiera hasheado: como son listas blancas, el password simplemente no
// figura entre los campos permitidos.

import { toPlain, pick } from './dto.helpers.js';

const USER_FIELDS = ['_id', 'first_name', 'last_name', 'email', 'role', 'createdAt', 'updatedAt'];

// Un usuario tal como se muestra en las respuestas: el registro y el listado
// de usuarios.
export class UserDTO {
  constructor(user) {
    Object.assign(this, pick(toPlain(user), USER_FIELDS));
  }

  static fromList(users) {
    return users.map((user) => new UserDTO(user));
  }
}

// El usuario autenticado que devuelve GET /api/sessions/current. Son los
// datos que viajan en el JWT (no se consulta la base): quién es, su rol y
// cuándo se emitió y vence la sesión.
const CURRENT_USER_FIELDS = ['id', 'email', 'role', 'iat', 'exp'];

export class CurrentUserDTO {
  constructor(payload) {
    Object.assign(this, pick(payload, CURRENT_USER_FIELDS));
  }
}
