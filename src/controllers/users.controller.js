// Igual que los otros controllers: traduce entre HTTP y el service, sin
// tomar decisiones de negocio.

import UsersService from '../services/users.service.js';

const service = new UsersService();

export const getUsers = async (req, res) => {
  const users = await service.getAllUsers();

  res.status(200).json({
    status: 'success',
    payload: users,
  });
};
