// El router solo define qué URL dispara qué controlador. La lógica real
// nunca va acá adentro.
//
// Las rutas protegidas se arman siempre con el mismo patrón, de izquierda
// a derecha, y el orden importa:
//
//   authenticate  → ¿hay sesión válida?        si no: 401
//   authorize(..) → ¿el rol alcanza?           si no: 403
//   controlador   → recién ahora se hace el trabajo
//
// Fijate que los roles no están escritos acá: salen de PERMISSIONS (ver
// src/config/roles.config.js), la matriz de permisos del proyecto.

import { Router } from 'express';
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  updateEventStatus,
} from '../controllers/events.controller.js';
import { authenticate, authenticateOptional } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/authorize.middleware.js';
import { PERMISSIONS } from '../config/roles.config.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// Públicas: cualquiera puede consultar eventos, tenga o no sesión.
// authenticateOptional no corta nada: solo reconoce a la persona si hay
// sesión, para que los borradores sigan siendo visibles únicamente para su
// organizer y para los admin.
router.get('/', authenticateOptional, asyncHandler(getEvents));
router.get('/:id', authenticateOptional, asyncHandler(getEventById));

// Solo organizer o admin.
router.post(
  '/',
  authenticate,
  authorize(...PERMISSIONS.CREATE_EVENT),
  asyncHandler(createEvent)
);

// Modificar y cambiar de estado (cancelar es un cambio de estado): el
// middleware deja pasar a organizer y admin, y después el service verifica
// que el organizer sea dueño de ESE evento (el admin puede con cualquiera).
router.put(
  '/:id',
  authenticate,
  authorize(...PERMISSIONS.MANAGE_OWN_EVENT),
  asyncHandler(updateEvent)
);

router.patch(
  '/:id/status',
  authenticate,
  authorize(...PERMISSIONS.MANAGE_OWN_EVENT),
  asyncHandler(updateEventStatus)
);

export default router;
