// Herramienta OPCIONAL para cargar eventos de ejemplo en la base de datos y
// poder probar el listado con filtros, paginación y orden sin tener que
// crear los eventos uno por uno a mano. Se usa así, desde la carpeta del
// proyecto:
//
//   npm run seed-events -- organizer1@mail.com
//
// El email tiene que ser el de un usuario YA registrado y con rol
// organizer o admin (ver scripts/set-role.js): es el que queda como
// organizador de todos los eventos de ejemplo.
//
// Todos los títulos empiezan con "[Demo]" para reconocerlos fácil. Si se
// vuelve a correr el script, no duplica los eventos que ya existen.
//
// Igual que set-role.js, esto es una herramienta de quien administra el
// servidor: no es un endpoint de la API.

import '../src/config/env.config.js';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import Event from '../src/models/Event.js';
import User from '../src/models/User.js';
import { PERMISSIONS } from '../src/config/roles.config.js';

const emailArg = process.argv[2];

if (!emailArg) {
  console.error('Uso: npm run seed-events -- <email-del-organizer>');
  process.exit(1);
}

const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (days) => new Date(Date.now() + days * DAY_MS);

// [título, categoría, ciudad, días desde hoy, capacidad, precio, estado]
const DEMO_EVENTS = [
  ['[Demo] Taller de Node.js', 'workshop', 'Mendoza', 5, 30, 0, 'published'],
  ['[Demo] Taller de Express', 'workshop', 'Mendoza', 8, 25, 1500, 'published'],
  ['[Demo] Taller de MongoDB', 'workshop', 'Buenos Aires', 12, 40, 2000, 'published'],
  ['[Demo] Taller de JWT y cookies', 'workshop', 'Córdoba', 15, 20, 0, 'published'],
  ['[Demo] Taller de Passport.js', 'workshop', 'Mendoza', 18, 35, 1200, 'published'],
  ['[Demo] Taller de testing de APIs', 'workshop', 'Buenos Aires', 22, 30, 1800, 'published'],
  ['[Demo] Taller de Git y GitHub', 'workshop', 'Córdoba', 25, 50, 0, 'published'],
  ['[Demo] Taller de arquitectura por capas', 'workshop', 'Mendoza', 30, 25, 2500, 'published'],
  ['[Demo] Congreso Backend 2026', 'conference', 'Buenos Aires', 45, 300, 15000, 'published'],
  ['[Demo] Congreso de Seguridad Web', 'conference', 'Córdoba', 60, 200, 12000, 'published'],
  ['[Demo] Encuentro de Desarrolladoras', 'meetup', 'Mendoza', 10, 80, 0, 'published'],
  ['[Demo] Meetup de Node.js', 'meetup', 'Buenos Aires', 20, 60, 0, 'published'],
  ['[Demo] Taller de Docker (borrador)', 'workshop', 'Mendoza', 40, 30, 3000, 'draft'],
  ['[Demo] Taller de GraphQL (cancelado)', 'workshop', 'Córdoba', 35, 30, 2200, 'cancelled'],
];

try {
  await connectDB();

  const organizer = await User.findOne({ email: emailArg.trim().toLowerCase() });

  if (!organizer) {
    console.error(`No existe ningún usuario registrado con el email ${emailArg}.`);
    process.exitCode = 1;
  } else if (!PERMISSIONS.CREATE_EVENT.includes(organizer.role)) {
    console.error(
      `El usuario ${organizer.email} tiene rol "${organizer.role}" y solo ` +
        `${PERMISSIONS.CREATE_EVENT.join(' o ')} pueden organizar eventos.`
    );
    console.error('Asignale el rol con: npm run set-role -- <email> organizer');
    process.exitCode = 1;
  } else {
    let created = 0;

    for (const [title, category, location, days, capacity, price, status] of DEMO_EVENTS) {
      const exists = await Event.exists({ title, organizer: organizer._id });
      if (exists) continue;

      await Event.create({
        title,
        description: `Evento de ejemplo: ${title.replace('[Demo] ', '')}.`,
        category,
        date: daysFromNow(days),
        location,
        capacity,
        price,
        status,
        organizer: organizer._id,
      });
      created += 1;
    }

    console.log(
      `Listo: se crearon ${created} eventos de ejemplo para ${organizer.email} ` +
        `(${DEMO_EVENTS.length - created} ya existían).`
    );
  }
} catch (error) {
  console.error('No se pudieron cargar los eventos de ejemplo:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
