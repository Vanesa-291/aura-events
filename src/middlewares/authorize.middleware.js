// Middleware de AUTORIZACIÓN: responde la pregunta "¿tenés permiso para
// hacer esto?". Es distinto del de autenticación (auth.middleware.js), y
// la diferencia es justamente lo que pide la consigna:
//
//   401 → "No autenticado": no hay sesión válida. No sabemos quién sos.
//   403 → "Sin permisos": SÍ sabemos quién sos, pero tu rol no alcanza
//         para esta acción.
//
// Por eso authorize() siempre va DESPUÉS de authenticate en la ruta:
// primero se averigua quién es la persona (si falla, 401) y recién
// después se mira qué rol tiene (si falla, 403).
//
// authorize es una "fábrica de middlewares": una función que recibe los
// roles permitidos y devuelve el middleware ya configurado. Así se puede
// reutilizar en cualquier ruta con roles distintos:
//
//   authorize('organizer', 'admin')                 // roles sueltos
//   authorize(...PERMISSIONS.CREATE_EVENT)          // desde la matriz
//   authorize(PERMISSIONS.CREATE_EVENT)             // o pasando la lista

import { AppError } from '../utils/appError.js';

export const authorize = (...allowedRoles) => {
  // .flat() permite que quien lo use pase tanto roles sueltos como un
  // array de roles: ambos terminan siendo una lista plana.
  const roles = allowedRoles.flat();

  return (req, res, next) => {
    // Red de seguridad: si por un error de programación alguien pone
    // authorize() sin authenticate() antes, no hay req.user. Lo
    // tratamos como "no autenticado" (401), que es lo correcto, en vez
    // de dejar que el servidor se rompa con un 500.
    if (!req.user) {
      return next(new AppError('No autenticado', 401));
    }

    // El rol sale de req.user, que lo dejó authenticate a partir del JWT
    // firmado por el servidor. Nunca se lee del body ni de la URL, así
    // que quien hace la petición no puede inventarse un rol.
    if (!roles.includes(req.user.role)) {
      return next(new AppError('No tenés permisos para realizar esta acción', 403));
    }

    next();
  };
};
