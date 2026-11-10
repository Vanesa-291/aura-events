// Variables de entorno de mentira para los tests. Tiene que ser lo PRIMERO
// que se importa en cada test: env.config.js valida estas variables apenas
// se carga. Como dotenv no pisa las variables que ya existen, los tests nunca
// usan los datos reales de tu .env (ni la base de datos, ni el mail).
process.env.PORT = '0';
process.env.NODE_ENV = 'test';
process.env.MONGO_URL = 'mongodb://127.0.0.1:1/aura-events-tests-no-se-usa';
process.env.JWT_SECRET = 'secreto-solo-para-tests';
process.env.JWT_EXPIRES_IN = '1h';
process.env.MAIL_HOST = 'localhost';
process.env.MAIL_PORT = '2525';
process.env.MAIL_USER = 'test';
process.env.MAIL_PASS = 'test';
process.env.MAIL_FROM = 'tests@aura-events.test';
