import { Router } from 'express';
import { sessionsPlaceholder } from '../controllers/sessions.controller.js';

const router = Router();

router.get('/', sessionsPlaceholder);

export default router;
