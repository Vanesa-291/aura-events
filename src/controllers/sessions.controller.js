// A partir de la Pre-entrega 4, este controller quedó MÁS liviano que
// antes: ya no llama al service directamente, ni valida nada. Esa parte
// del trabajo ahora la hacen las estrategias de Passport (ver
// src/config/passport.config.js), que se ejecutan ANTES que estos
// handlers, como middleware en la ruta (ver sessions.router.js). Cuando
// un handler de acá abajo se ejecuta, significa que Passport ya hizo
// todo el trabajo pesado y dejó el resultado en req.user.
//
// La única responsabilidad nueva y exclusiva del controller, que la
// consigna pide explícitamente que NO esté en la estrategia, es: una
// vez que el login fue exitoso, generar el JWT y guardarlo en la
// cookie. Es una decisión de diseño a propósito: autenticar a alguien
// (verificar quién es) y decidir cómo representar esa sesión en HTTP
// (un JWT en una cookie, un header, lo que sea) son dos trabajos
// distintos, y separarlos hace que mañana se pueda cambiar uno sin
// tocar el otro — por ejemplo, si algún día quisiéramos devolver el
// token en el body en vez de una cookie, alcanzaría con cambiar este
// controller, sin tocar ni una línea de la estrategia 'login'.

import { signToken } from '../utils/jwt.js';
import { NODE_ENV, JWT_EXPIRES_IN } from '../config/env.config.js';
import ms from 'ms';

// El nombre de la cookie se define acá, una sola vez, porque la usan
// dos handlers distintos (login la crea, logout la borra) y queremos
// evitar el riesgo de escribir "currentUser" mal en alguno de los dos
// lugares.
const COOKIE_NAME = 'currentUser';

// Cuánto dura la cookie en el navegador, en milisegundos.
//
// Corrección pedida en la devolución de la Pre-entrega 3: antes este
// valor estaba escrito a mano como "3600000" (1 hora), con un
// comentario que decía "si cambiás JWT_EXPIRES_IN en tu .env, conviene
// actualizar también este número" — es decir, dependía de que una
// persona se acordara de cambiar DOS lugares a la vez. Eso es frágil:
// si alguien cambia JWT_EXPIRES_IN a "15m" para probar algo y se olvida
// de tocar este número, la cookie sigue durando 1 hora aunque el token
// ya haya vencido, y durante esos minutos de diferencia el navegador
// manda una cookie "viva" con un token "muerto" — el middleware la
// rechaza igual (no es un agujero de seguridad), pero sí genera un
// comportamiento confuso para quien usa la app.
//
// La solución es derivar este valor DIRECTAMENTE de JWT_EXPIRES_IN, en
// vez de escribirlo de nuevo: así los dos quedan sincronizados siempre,
// con un solo lugar de verdad (el .env). Para eso usamos el paquete
// "ms" — la misma librería que jsonwebtoken usa por dentro para
// entender strings como "1h", "15m" o "7d" — y le pedimos que convierta
// ese string a milisegundos. Si mañana cambiás JWT_EXPIRES_IN=30m en tu
// .env, COOKIE_MAX_AGE_MS se recalcula solo la próxima vez que arranque
// el servidor, sin tocar código.
const COOKIE_MAX_AGE_MS = ms(JWT_EXPIRES_IN);

// GET /api/sessions — endpoint informativo, sin cambios de lógica.
export const sessionsPlaceholder = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Módulo de sesiones activo: register, login, current y logout disponibles.',
  });
};

// POST /api/sessions/register
//
// La ruta ya pasó por passport.authenticate('register', ...) antes de
// llegar acá (ver sessions.router.js). Si el registro falló (campos
// faltantes, email duplicado, etc.), la estrategia ya cortó la petición
// con next(err) y este handler ni se llega a ejecutar. Si llegamos
// hasta acá, req.user ES el usuario recién creado, ya sin password
// (sessions.service.js lo arma así) y con el rol por defecto aplicado
// por el modelo.
export const register = (req, res) => {
  res.status(201).json({
    status: 'success',
    payload: req.user,
  });
};

// POST /api/sessions/login
//
// Al llegar acá, la estrategia 'login' ya validó el email y la
// contraseña, y req.user es el documento completo del usuario (con su
// password hasheado adentro, tal cual lo devuelve la base de datos).
// Esto es seguro porque req.user NUNCA se manda tal cual en la
// respuesta HTTP — acá abajo se leen únicamente tres campos puntuales
// (id, email, role) para meterlos en el JWT, y la respuesta final no
// incluye nada del usuario, solo un mensaje de éxito.
//
// Guardar el token en una cookie httpOnly (en vez de devolverlo en el
// JSON) es más seguro porque un script de JavaScript corriendo en el
// navegador (por ejemplo, código malicioso inyectado por un ataque XSS)
// NO puede leer una cookie httpOnly — solo el navegador se la reenvía
// automáticamente al servidor en cada petición siguiente.
export const login = (req, res) => {
  const user = req.user;

  const token = signToken({
    id: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true, // JavaScript del navegador no puede leer esta cookie
    sameSite: 'lax', // protección básica contra ataques CSRF
    maxAge: COOKIE_MAX_AGE_MS,
    // "secure: true" le dice al navegador que SOLO mande esta cookie
    // por HTTPS, nunca por HTTP sin cifrar. En desarrollo local
    // trabajamos sobre HTTP simple (http://localhost:8080), así que si
    // pusiéramos secure:true siempre, la cookie nunca se guardaría y el
    // login "funcionaría" pero /current jamás encontraría la cookie.
    // Por eso esta condición: estricto en producción, flexible en
    // desarrollo.
    secure: NODE_ENV === 'production',
  });

  res.status(200).json({
    status: 'success',
    message: 'Login correcto',
  });
};

// GET /api/sessions/current
//
// La ruta pasó por passport.authenticate('current', ...) antes de
// llegar acá. Esa estrategia ya leyó la cookie, verificó el token, y
// dejó el payload decodificado (id, email, role, iat, exp) en req.user.
// Si algo hubiera fallado, la estrategia ya habría cortado la petición
// con 401 y este handler ni se ejecutaría. Por eso acá no hay nada que
// validar: simplemente devolvemos lo que Passport ya nos dejó
// preparado.
export const current = (req, res) => {
  res.status(200).json({
    status: 'success',
    payload: req.user,
  });
};

// POST /api/sessions/logout
//
// Logout no pasa por ninguna estrategia de Passport (la consigna lo
// pide explícitamente así): no hay nada que "autenticar" para cerrar
// una sesión, solo hay que borrarle al navegador la cookie que la
// contiene. Sin la cookie, el navegador ya no tiene forma de volver a
// mandar ese token, así que en la práctica la sesión queda cerrada
// desde el lado del cliente. res.clearCookie necesita las mismas
// opciones (sameSite, httpOnly) con las que se creó la cookie para
// poder encontrarla y borrarla bien.
export const logout = (req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: NODE_ENV === 'production',
  });

  res.status(200).json({
    status: 'success',
    message: 'Sesión cerrada',
  });
};
