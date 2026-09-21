// El router solo define qué URL dispara qué controlador. La lógica real
// nunca va acá adentro.

import { Router } from 'express';
import { getEvents } from '../controllers/events.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(getEvents));

export default router;
