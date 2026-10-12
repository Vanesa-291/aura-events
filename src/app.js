// Este archivo arma la aplicación de Express: qué middlewares usa, qué
// rutas tiene disponibles, y qué hacer con los errores. A propósito NO
// levanta el servidor acá — eso es trabajo de server.js. Separarlos así
// permite, por ejemplo, testear la aplicación sin necesidad de que esté
// escuchando en un puerto real.

import express from 'express';
import cookieParser from 'cookie-parser';

import passport from './config/passport.config.js';

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
// esto, la estrategia 'current' de Passport no tendría forma de leer la
// cookie "currentUser" que genera el login. Tiene que ir ANTES de
// passport.initialize() por la misma razón: Passport necesita que
// req.cookies ya exista cuando intente autenticar una petición.
app.use(cookieParser());

// Inicializa Passport. Fijate que este archivo NO define ninguna
// estrategia — solo le avisa a Express que Passport existe y que puede
// usarse en las rutas. Las estrategias en sí (register, login, current,
// y cualquiera que se sume en el futuro) están centralizadas en
// src/config/passport.config.js, y es ESE archivo el que hay que tocar
// para agregar, por ejemplo, autenticación con Google o GitHub más
// adelante — nunca este.
app.use(passport.initialize());

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
