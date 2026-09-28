import { Router } from 'express';
import { sessionsPlaceholder, register } from '../controllers/sessions.controller.js';

const router = Router();

router.get('/', sessionsPlaceholder);

// Nueva ruta de esta entrega: registro de usuarios.
router.post('/register', register);

export default router;
