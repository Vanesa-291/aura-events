// ============================================================================
// ESTRATEGIAS DE PASSPORT
// ============================================================================
//
// Este archivo es, a partir de la Pre-entrega 4, el único lugar del
// proyecto donde se define "qué significa autenticarse" para cada ruta
// de sesiones. Antes (Pre-entrega 3) esa lógica estaba repartida entre
// el service (sessions.service.js) y un middleware manual que
// escribimos a mano (auth.middleware.js). Ahora la organizamos con
// Passport, una librería hecha justamente para esto: definir
// "estrategias" de autenticación reutilizables y enchufables en
// cualquier ruta con una sola línea.
//
// Una "estrategia" de Passport, en el fondo, es solo un objeto con una
// función que Passport ejecuta cuando alguien pega a una ruta protegida
// por esa estrategia. Esa función recibe la petición (req) y tiene que
// terminar llamando a una de estas tres cosas:
//   - done(null, datoDelUsuario)  → autenticación exitosa
//   - done(errorDeAppError)        → algo salió mal (credenciales
//                                     inválidas, email duplicado, etc.)
//   - done(null, false)            → "no autenticado", sin error puntual
//
// Elegimos la variante "passport-custom" de Passport (en vez de, por
// ejemplo, "passport-local") para las tres estrategias, a propósito.
// passport-local está pensada para el caso clásico de "usuario +
// contraseña" y, por defecto, corta la petición ANTES de llegar a
// nuestro código si falta el campo "username" o "password" — respondiendo
// con un mensaje genérico de Passport, no con nuestro formato JSON
// { status: 'error', message: '...' }. Eso rompería el contrato que ya
// tenía la API en la Pre-entrega 3 (por ejemplo, "Faltan campos
// obligatorios" con 400). passport-custom, en cambio, nos da control
// total: nosotros decidimos exactamente qué validar y qué responder,
// simplemente moviendo el código que ya funcionaba a este archivo.

import passport from 'passport';
import { Strategy as CustomStrategy } from 'passport-custom';

import SessionsService from '../services/sessions.service.js';
import { verifyToken } from '../utils/jwt.js';
import { AppError } from '../utils/appError.js';

const service = new SessionsService();

// ----------------------------------------------------------------------
// Estrategia 'register'
// ----------------------------------------------------------------------
// Se usa en POST /api/sessions/register. Toda la validación (campos
// obligatorios, formato de email, longitud de contraseña, email
// duplicado), la normalización y el hasheo de la contraseña siguen
// viviendo en sessions.service.js — acá no se repite nada de esa
// lógica, solo se la invoca. Si el service lanza un AppError, lo
// pasamos tal cual a done(err): Passport lo reenvía automáticamente a
// next(err), que es exactamente lo mismo que hacía asyncHandler antes.
// Así, el errorHandler central sigue respondiendo con el status code y
// el mensaje correctos, sin que esta estrategia tenga que saber nada de
// códigos HTTP.
passport.use(
  'register',
  new CustomStrategy(async (req, done) => {
    try {
      const newUser = await service.registerUser(req.body);
      return done(null, newUser);
    } catch (err) {
      return done(err);
    }
  })
);

// ----------------------------------------------------------------------
// Estrategia 'login'
// ----------------------------------------------------------------------
// Se usa en POST /api/sessions/login. Delega en
// service.validateCredentials(), que valida el email y la contraseña y
// devuelve el documento del usuario si son correctos (o lanza
// AppError('Credenciales inválidas', 401) si no). Fijate que ACÁ no se
// genera ningún JWT: esa es, a propósito, la única responsabilidad que
// le dejamos al controller (ver sessions.controller.js), tal como pide
// la consigna de esta entrega. La estrategia solo responde la pregunta
// "¿sos quién decís ser?" — qué hacer con esa identidad ya autenticada
// (firmar un token, guardarlo en una cookie) es un problema de HTTP, no
// de autenticación, y por eso vive un nivel más arriba.
passport.use(
  'login',
  new CustomStrategy(async (req, done) => {
    try {
      const user = await service.validateCredentials(req.body);
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

// ----------------------------------------------------------------------
// Estrategia 'current'
// ----------------------------------------------------------------------
// Se usa en GET /api/sessions/current, como reemplazo directo del
// middleware auth.middleware.js que teníamos en la Pre-entrega 3 (ese
// archivo ya no existe: toda su lógica se mudó acá). El flujo es
// idéntico al de antes, nada más que expresado como estrategia de
// Passport en vez de como un middleware escrito a mano:
//   1. Buscar la cookie "currentUser" en la petición.
//   2. Si no está, no hay nada que autenticar.
//   3. Si está, verificar que el JWT adentro sea válido (firma correcta
//      y no vencido).
//   4. Si todo salió bien, pasar el payload decodificado (id, email,
//      role, iat, exp) como el "usuario autenticado" — Passport lo va a
//      dejar disponible en req.user para el controller "current".
//
// Tanto "no hay cookie" como "el token es inválido o expiró" terminan
// en el mismo mensaje genérico ("No autenticado", 401) — por la misma
// razón de seguridad que ya vimos en el login: no conviene darle a
// quien hace la petición información de más sobre qué, específicamente,
// salió mal.
passport.use(
  'current',
  new CustomStrategy((req, done) => {
    const token = req.cookies?.currentUser;

    if (!token) {
      return done(new AppError('No autenticado', 401));
    }

    try {
      const payload = verifyToken(token);
      return done(null, payload);
    } catch (err) {
      // Acá caen dos situaciones distintas (token manipulado o
      // vencido), y respondemos lo mismo en ambos casos, igual que en
      // la Pre-entrega 3.
      return done(new AppError('No autenticado', 401));
    }
  })
);

// ----------------------------------------------------------------------
// Preparado para sumar más estrategias a futuro
// ----------------------------------------------------------------------
// Si en una próxima entrega hace falta login con Google, GitHub, u otro
// proveedor externo, ese código se agrega ACÁ, con su propio
// passport.use('google', new GoogleStrategy({ ... })), sin tocar
// absolutamente nada de app.js ni de las rutas existentes. app.js solo
// necesita saber que Passport existe y que hay que inicializarlo
// (passport.initialize()) — no necesita conocer cuántas ni cuáles
// estrategias hay configuradas. Esa es la ventaja central de centralizar
// todo acá: este archivo es el único punto que hay que tocar para sumar
// una nueva forma de autenticarse.

export default passport;
