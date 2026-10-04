// Este archivo arma la aplicación de Express: qué middlewares usa, qué
// rutas tiene disponibles, y qué hacer con los errores. A propósito NO
// levanta el servidor acá — eso es trabajo de server.js. Separarlos así
// permite, por ejemplo, testear la aplicación sin necesidad de que esté
// escuchando en un puerto real.

import express from 'express';
import cookieParser from 'cookie-parser';

import healthRouter   from './routes/health.router.js';
import eventsRouter    from './routes/events.router.js';
import sessionsRouter  from './routes/sessions.router.js';

import { notFound } from './middlewares/notFound.middleware.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';

const app = express();

// Permite que Express entienda los cuerpos de petición en formato JSON.
app.use(express.json());

// Permite que Express lea las cookies que vienen en cada petición y las
// deje disponibles en req.cookies (un objeto normal de JavaScript). Sin
// esto, el middleware de autenticación no tendría forma de leer la
// cookie "currentUser" que genera el login.
app.use(cookieParser());

// Cada recurso vive bajo su propio prefijo, y cada router se ocupa
// únicamente de las rutas de su propio tema.
app.use('/api/health',   healthRouter);
app.use('/api/events',   eventsRouter);
app.use('/api/sessions', sessionsRouter);

// Si ninguna ruta anterior respondió, caemos acá.
app.use(notFound);

// Si algo se rompe en el camino, termina respondiendo desde acá.
app.use(errorHandler);

export default app;
