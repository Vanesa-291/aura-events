// Punto de entrada real del proyecto. El orden acá importa: primero nos
// aseguramos de que la configuración esté completa, después nos
// conectamos a la base de datos, y solo si todo eso salió bien, arrancamos
// a escuchar peticiones. Así evitamos que el servidor "parezca" estar
// funcionando cuando en realidad todavía le falta algo esencial.

import './config/env.config.js';
import { PORT, NODE_ENV } from './config/env.config.js';
import { connectDB } from './config/db.js';
import app from './app.js';

try {
  await connectDB();

  app.listen(PORT, () => {
    console.log('----------------------------------------------------');
    console.log('  Aura Events — Plataforma de Eventos e Inscripciones');
    console.log(`  Entorno   : ${NODE_ENV}`);
    console.log(`  Servidor  : http://localhost:${PORT}`);
    console.log('----------------------------------------------------');
    console.log(`  GET  http://localhost:${PORT}/api/health`);
    console.log(`  GET  http://localhost:${PORT}/api/events`);
    console.log(`  GET  http://localhost:${PORT}/api/sessions`);
    console.log('----------------------------------------------------');
  });
} catch (error) {
  console.error('No se pudo iniciar el servidor:', error.message);
  process.exit(1);
}
