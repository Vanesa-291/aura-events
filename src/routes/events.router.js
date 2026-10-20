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
  createEvent,
  updateEvent,
  cancelEvent,
} from '../controllers/events.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/authorize.middleware.js';
import { PERMISSIONS } from '../config/roles.config.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// Pública: cualquiera puede consultar los eventos publicados (esta ruta
// ya existía antes de los roles y se mantiene igual).
router.get('/', asyncHandler(getEvents));

// Solo organizer o admin.
router.post(
  '/',
  authenticate,
  authorize(...PERMISSIONS.CREATE_EVENT),
  asyncHandler(createEvent)
);

// Modificar y cancelar: el middleware deja pasar a organizer y admin, y
// después el service verifica que el organizer sea dueño de ESE evento
// (el admin puede con cualquiera).
router.patch(
  '/:id',
  authenticate,
  authorize(...PERMISSIONS.MANAGE_OWN_EVENT),
  asyncHandler(updateEvent)
);

router.patch(
  '/:id/cancel',
  authenticate,
  authorize(...PERMISSIONS.MANAGE_OWN_EVENT),
  asyncHandler(cancelEvent)
);

export default router;
