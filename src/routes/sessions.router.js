import { Router } from 'express';
import {
  sessionsPlaceholder,
  register,
  login,
  current,
  logout,
} from '../controllers/sessions.controller.js';
import { auth } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', sessionsPlaceholder);

// Registro de usuarios (Pre-entrega 2).
router.post('/register', register);

// Autenticación (Pre-entrega 3). "auth" se coloca como segundo
// argumento de router.get para la ruta /current: Express ejecuta los
// middlewares en el orden en que se los pasa, así que primero corre
// "auth" (que verifica la cookie y el token) y, solo si auth llama a
// next(), recién después se ejecuta "current". Si auth responde 401
// directamente, "current" nunca llega a ejecutarse.
router.post('/login', login);
router.get('/current', auth, current);
router.post('/logout', logout);

export default router;
