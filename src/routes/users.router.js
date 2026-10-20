// Rutas administrativas sobre usuarios. Todas pasan primero por
// authenticate (401 si no hay sesión) y después por authorize (403 si el
// rol no alcanza). El rol permitido sale de la matriz de permisos
// (src/config/roles.config.js), no está escrito a mano acá.

import { Router } from 'express';
import { getUsers } from '../controllers/users.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/authorize.middleware.js';
import { PERMISSIONS } from '../config/roles.config.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// Ruta administrativa: solo admin.
router.get(
  '/',
  authenticate,
  authorize(...PERMISSIONS.VIEW_ALL_USERS),
  asyncHandler(getUsers)
);

export default router;
