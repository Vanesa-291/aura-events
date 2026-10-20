// Middleware de AUTENTICACIÓN: responde la pregunta "¿quién sos?".
//
// No reimplementa nada: reutiliza la estrategia 'current' de Passport
// (ver src/config/passport.config.js), que es la que lee la cookie
// "currentUser", verifica la firma y el vencimiento del JWT y, si todo
// está bien, deja los datos del usuario ({ id, email, role }) en
// req.user. Si no hay cookie, o el token es inválido o venció, la
// estrategia corta con un AppError 401 "No autenticado" y el
// errorHandler arma la respuesta.
//
// ¿Para qué un archivo aparte si ya existía passport.authenticate('current')?
// Para que las rutas protejan un endpoint con una sola palabra
// (authenticate) sin tener que conocer Passport ni sus opciones, y para
// que, si algún día cambia la forma de autenticar, se cambie acá y no en
// cada ruta.
//
// Es un middleware reutilizable: se usa igual en cualquier router.
//
//   router.get('/algo-privado', authenticate, controlador);

import passport from '../config/passport.config.js';

export const authenticate = passport.authenticate('current', { session: false });
