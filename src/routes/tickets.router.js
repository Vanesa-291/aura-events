// Las rutas de tickets mezclan dos "familias" de URL: las que cuelgan de un
// evento (/api/events/:eid/tickets) y las que son del ticket en sí
// (/api/tickets/...). Por eso este router se monta en /api (ver app.js) y
// cada ruta lleva su camino completo desde ahí. De esta manera, el router
// de eventos no se toca para nada.
//
// Se arman con el mismo patrón de siempre, de izquierda a derecha:
//
//   authenticate  → ¿hay sesión válida?        si no: 401
//   authorize(..) → ¿el rol alcanza?           si no: 403
//   controlador   → recién ahora se hace el trabajo
//
// Los roles no están escritos acá: salen de PERMISSIONS (ver
// src/config/roles.config.js). Y las reglas de propiedad (¿es TU ticket?,
// ¿es un evento TUYO?) las resuelve el service, porque hace falta mirar el
// ticket o el evento en la base para saber de quién es.

import { Router } from 'express';
import {
  createTicket,
  getMyTickets,
  getEventTickets,
  cancelTicket,
} from '../controllers/tickets.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/authorize.middleware.js';
import { PERMISSIONS } from '../config/roles.config.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// Inscribirse a un evento: cualquier persona con sesión.
router.post('/events/:eid/tickets', authenticate, asyncHandler(createTicket));

// Los tickets de quien tiene la sesión iniciada.
router.get('/tickets/my-tickets', authenticate, asyncHandler(getMyTickets));

// Los tickets de un evento: el middleware deja pasar a organizer y admin, y
// después el service verifica que el organizer sea dueño de ESE evento (el
// admin puede con cualquiera).
router.get(
  '/events/:eid/tickets',
  authenticate,
  authorize(...PERMISSIONS.VIEW_EVENT_TICKETS),
  asyncHandler(getEventTickets)
);

// Cancelar un ticket: lo puede hacer su dueño o un admin (lo resuelve el
// service).
router.patch('/tickets/:tid/cancel', authenticate, asyncHandler(cancelTicket));

export default router;
