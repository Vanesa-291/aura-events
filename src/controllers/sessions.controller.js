// El controlador sigue con la misma responsabilidad de siempre: traduce
// entre HTTP y el resto del sistema. No valida nada, no hashea nada, no
// decide si un email está duplicado — todo eso vive en el service. Acá
// solo se lee lo que llegó en req.body, se lo pasa al service, y se
// responde con lo que el service devuelva.

import SessionsService from '../services/sessions.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NODE_ENV } from '../config/env.config.js';

const service = new SessionsService();

// GET /api/sessions — un endpoint informativo simple, no forma parte de
// la consigna pero se mantiene desde la Pre-entrega 1 como un "aviso de
// que el módulo existe". Ya no hace falta que diga que falta la
// autenticación, porque ahora sí está implementada.
export const sessionsPlaceholder = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Módulo de sesiones activo: register, login, current y logout disponibles.',
  });
};

// El nombre de la cookie se define acá, una sola vez, porque la usan
// tres handlers distintos (login la crea, current la necesita leer a
// través del middleware, y logout la borra) y queremos evitar el riesgo
// de escribir "currentUser" mal en alguno de los tres lugares.
const COOKIE_NAME = 'currentUser';

// Cuánto dura la cookie en el navegador, en milisegundos. 3600000 ms
// equivale a 1 hora — el mismo valor que normalmente se configura en
// JWT_EXPIRES_IN (por ejemplo, JWT_EXPIRES_IN=1h). Lo ideal es que la
// cookie y el token venzan al mismo tiempo: si la cookie durara más que
// el token, el navegador seguiría mandando una cookie "vieja" cuyo
// token ya no es válido (el middleware la rechazaría de todas formas,
// así que no es un riesgo de seguridad, pero si durara MENOS, se
// perdería la sesión antes de que el token venza, lo cual es confuso
// para quien usa la app). Si cambiás JWT_EXPIRES_IN en tu .env, conviene
// actualizar también este número para que los dos sigan coordinados.
const COOKIE_MAX_AGE_MS = 3600000;

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

// POST /api/sessions/login
//
// Si las credenciales son correctas, el service devuelve un JWT ya
// firmado. Acá, en el controller, es donde decidimos QUÉ hacer con ese
// token en términos de HTTP: lo guardamos en una cookie en vez de, por
// ejemplo, devolverlo en el cuerpo de la respuesta. Guardarlo en una
// cookie httpOnly es más seguro que devolverlo en el JSON porque un
// script de JavaScript corriendo en el navegador (por ejemplo, código
// malicioso inyectado por un ataque XSS) NO puede leer una cookie
// httpOnly — solo el navegador se la reenvía automáticamente al
// servidor en cada petición siguiente. Si el token viajara en el body
// de la respuesta, cualquier script en esa misma página podría leerlo y
// robarlo.
export const login = asyncHandler(async (req, res) => {
  const token = await service.loginUser(req.body);

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
});

// GET /api/sessions/current
//
// Para cuando este handler se ejecuta, el middleware "auth" (ver
// middlewares/auth.middleware.js) ya hizo todo el trabajo pesado: leyó
// la cookie, verificó el token, y si todo estaba bien, dejó los datos
// del usuario en req.user. Si algo hubiera fallado, el middleware ya
// habría respondido 401 y este handler ni se ejecutaría. Por eso acá no
// hay nada que validar: simplemente devolvemos lo que el middleware ya
// nos dejó preparado.
export const current = (req, res) => {
  res.status(200).json({
    status: 'success',
    payload: req.user,
  });
};

// POST /api/sessions/logout
//
// "Cerrar sesión" con JWT no significa "invalidar el token" (eso
// requeriría guardar una lista de tokens invalidados en la base de
// datos, algo que esta consigna no pide) — significa simplemente
// borrarle al navegador la cookie que lo contiene. Sin la cookie, el
// navegador ya no tiene forma de volver a mandar ese token, así que en
// la práctica la sesión queda cerrada desde el lado del cliente.
// res.clearCookie necesita las mismas opciones (path, sameSite) con las
// que se creó la cookie para poder encontrarla y borrarla bien.
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
