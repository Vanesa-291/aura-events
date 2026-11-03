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

// ----------------------------------------------------------------------
// Configuración del correo (Nodemailer) — Pre-entrega 7
// ----------------------------------------------------------------------
// Estas cinco variables sirven para enviar el email de confirmación cuando
// alguien se inscribe a un evento. Las credenciales NUNCA se escriben en el
// código: solo viven en el archivo .env (que no se sube a GitHub).
//
// A diferencia de las variables de arriba, a propósito NO son obligatorias
// para arrancar: si faltan, el servidor igual levanta y todo lo demás sigue
// funcionando (incluso las inscripciones); lo único que no se hace es
// mandar el email, y se avisa en la consola. Así, quien clone el proyecto
// puede probarlo sin tener una cuenta de correo configurada.
export const MAIL_HOST = process.env.MAIL_HOST;
export const MAIL_PORT = Number(process.env.MAIL_PORT);
export const MAIL_USER = process.env.MAIL_USER;
export const MAIL_PASS = process.env.MAIL_PASS;
export const MAIL_FROM = process.env.MAIL_FROM;

const MAIL_VARS = ['MAIL_HOST', 'MAIL_PORT', 'MAIL_USER', 'MAIL_PASS', 'MAIL_FROM'];
const missingMailVars = MAIL_VARS.filter((key) => !process.env[key]);
const invalidMailPort =
  !missingMailVars.includes('MAIL_PORT') &&
  !(Number.isInteger(MAIL_PORT) && MAIL_PORT > 0);

// true solo si están las cinco variables y el puerto es un número válido.
export const MAIL_CONFIGURED = missingMailVars.length === 0 && !invalidMailPort;

if (!MAIL_CONFIGURED) {
  console.warn('Aviso: el envío de emails no está configurado, así que las inscripciones se');
  console.warn('guardan igual pero no se manda el email de confirmación.');
  missingMailVars.forEach((key) => console.warn(`  - falta ${key}`));
  if (invalidMailPort) console.warn('  - MAIL_PORT tiene que ser un número (por ejemplo 2525)');
  console.warn('Revisá el archivo .env.example para ver cómo configurarlo.');
}
