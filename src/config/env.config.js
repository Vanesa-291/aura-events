// Este archivo se encarga de una sola cosa: asegurarse de que el proyecto
// tenga todo lo que necesita para arrancar (el puerto, la conexión a la
// base de datos, etc.) antes de que se ejecute cualquier otra cosa.
//
// Si falta alguna variable en el archivo .env, el servidor no arranca y
// muestra un mensaje claro sobre qué falta configurar, en vez de fallar
// más adelante de forma confusa.

import 'dotenv/config';

const REQUIRED_VARS = ['PORT', 'NODE_ENV', 'MONGO_URL', 'JWT_SECRET', 'JWT_EXPIRES_IN'];

function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('No se pudo iniciar el servidor: faltan variables de entorno.');
    missing.forEach((key) => console.error(`  - ${key}`));
    console.error('Revisá el archivo .env.example para ver qué se necesita.');
    process.exit(1);
  }

  console.log('Variables de entorno verificadas correctamente.');
}

validateEnv();

export const PORT           = process.env.PORT;
export const NODE_ENV       = process.env.NODE_ENV;
export const MONGO_URL      = process.env.MONGO_URL;
export const JWT_SECRET     = process.env.JWT_SECRET;

// Cuánto tiempo dura un token antes de vencer. Se escribe con el mismo
// formato que entiende la librería jsonwebtoken: por ejemplo "1h" (una
// hora), "15m" (quince minutos), "7d" (siete días). Tenerlo en una
// variable de entorno (y no escrito fijo en el código) permite, por
// ejemplo, usar sesiones más cortas en producción y más largas mientras
// se está desarrollando y probando, sin tocar ni una línea de código.
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
