// El controlador sigue con la misma responsabilidad de siempre: traduce
// entre HTTP y el resto del sistema. No valida nada, no hashea nada, no
// decide si un email está duplicado — todo eso vive en el service. Acá
// solo se lee lo que llegó en req.body, se lo pasa al service, y se
// responde con lo que el service devuelva.

import SessionsService from '../services/sessions.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const service = new SessionsService();

// Se mantiene el aviso original en GET /api/sessions, ya que el login
// todavía no existe (llega en una próxima entrega).
export const sessionsPlaceholder = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Módulo de sesiones preparado. La autenticación se implementa en una próxima entrega.',
  });
};

// POST /api/sessions/register
//
// Está envuelto en asyncHandler porque registerUser es una función
// async: si el service lanza un AppError (por ejemplo, "email
// duplicado"), asyncHandler se encarga de atraparlo y mandarlo al
// errorHandler con next(err), en vez de que el servidor se cuelgue o
// tire un error feo de "unhandled promise rejection" en la consola.
export const register = asyncHandler(async (req, res) => {
  const newUser = await service.registerUser(req.body);

  res.status(201).json({
    status: 'success',
    payload: newUser,
  });
});
