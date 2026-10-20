// Herramienta de línea de comandos para asignarle un rol a un usuario que
// ya se registró. Se usa así, desde la carpeta del proyecto:
//
//   npm run set-role -- ana@mail.com organizer
//   npm run set-role -- ana@mail.com admin
//
// ¿Por qué existe? Porque el registro público (POST /api/sessions/register)
// SIEMPRE crea usuarios con rol 'user' y nunca acepta un rol desde el
// body — así nadie puede auto-asignarse el rol de admin. Pero alguien
// tiene que poder crear el primer admin y los primeros organizers. Esa
// persona es quien tiene acceso a la base de datos y al servidor, y lo
// hace desde acá, NO desde un endpoint de la API: de esa manera no hay
// ninguna ruta pública ni protegida por la que se pueda cambiar un rol
// mandándolo en el body.
//
// Después de cambiar el rol, la persona tiene que volver a iniciar
// sesión (login): el rol viaja adentro del JWT, y el token que ya tenía
// guarda el rol viejo hasta que venza.

import '../src/config/env.config.js';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import { ROLES } from '../src/config/roles.config.js';

const [emailArg, roleArg] = process.argv.slice(2);
const validRoles = Object.values(ROLES);

if (!emailArg || !roleArg || !validRoles.includes(roleArg)) {
  console.error('Uso: npm run set-role -- <email> <rol>');
  console.error(`Roles válidos: ${validRoles.join(', ')}`);
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();

try {
  await connectDB();

  const user = await User.findOneAndUpdate(
    { email },
    { role: roleArg },
    { new: true, runValidators: true }
  );

  if (!user) {
    console.error(`No existe ningún usuario registrado con el email ${email}.`);
    console.error('Primero tiene que registrarse con POST /api/sessions/register.');
    process.exitCode = 1;
  } else {
    console.log(`Listo: ${user.email} ahora tiene el rol "${user.role}".`);
    console.log('Tiene que volver a hacer login para que el nuevo rol quede en su token.');
  }
} catch (error) {
  console.error('No se pudo cambiar el rol:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
