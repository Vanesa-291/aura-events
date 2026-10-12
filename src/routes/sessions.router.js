// A partir de la Pre-entrega 4, esta ruta queda lo más simple posible:
// cada endpoint de autenticación delega directamente en una estrategia
// de Passport (ver src/config/passport.config.js), pasada como
// middleware. { session: false } le dice a Passport que no intentemos
// usar sesiones de Express (req.session, cookies de sesión del propio
// Passport) — no las necesitamos porque toda nuestra sesión vive en el
// JWT dentro de la cookie "currentUser", que manejamos nosotros mismos
// en el controller.

import { Router } from 'express';
import passport from '../config/passport.config.js';
import {
  sessionsPlaceholder,
  register,
  login,
  current,
  logout,
} from '../controllers/sessions.controller.js';

const router = Router();

router.get('/', sessionsPlaceholder);

// Registro de usuarios. La estrategia 'register' hace toda la
// validación (campos, formato de email, duplicados) y, si todo sale
// bien, deja el usuario recién creado en req.user.
router.post('/register', passport.authenticate('register', { session: false }), register);

// Login. La estrategia 'login' valida las credenciales y deja el
// usuario autenticado en req.user; el controller es quien genera el
// JWT y lo guarda en la cookie.
router.post('/login', passport.authenticate('login', { session: false }), login);

// Ruta protegida. La estrategia 'current' lee y valida la cookie
// "currentUser"; si es válida, deja el payload del token en req.user.
router.get('/current', passport.authenticate('current', { session: false }), current);

// Logout no pasa por Passport: no hay nada que autenticar para borrar
// una cookie.
router.post('/logout', logout);

export default router;
