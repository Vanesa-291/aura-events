// Igual que los otros controllers: traduce entre HTTP y el service, sin
// tomar decisiones de negocio. Los usuarios pasan por UserDTO antes de salir,
// así que el password nunca viaja en la respuesta.

import UsersService from '../services/users.service.js';
import { UserDTO } from '../dto/user.dto.js';

const service = new UsersService();

export const getUsers = async (req, res) => {
  const users = await service.getAllUsers();

  res.status(200).json({
    status: 'success',
    payload: UserDTO.fromList(users),
  });
};
