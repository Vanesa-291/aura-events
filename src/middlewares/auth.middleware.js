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

// Variante OPCIONAL de authenticate, para rutas públicas que se comportan
// distinto si quien consulta tiene sesión. Por ejemplo, GET /api/events/:id
// es público, pero un evento en borrador solo lo puede ver su organizer o
// un admin: para saberlo, hace falta reconocer a la persona SI es que hay
// sesión.
//
// La diferencia con authenticate: acá nunca se corta la petición.
//   - Con una sesión válida, deja los datos en req.user, igual que
//     authenticate.
//   - Sin cookie, o con un token inválido o vencido, simplemente sigue
//     sin req.user (como un visitante anónimo). No responde 401.
//
// Para lograrlo se le pasa a Passport una función propia (el tercer
// parámetro) que recibe el resultado en vez de dejar que Passport
// responda por su cuenta.
export const authenticateOptional = (req, res, next) =>
  passport.authenticate('current', { session: false }, (err, user) => {
    if (user) {
      req.user = user;
    }
    next();
  })(req, res, next);
