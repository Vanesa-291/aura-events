// Este archivo tiene una sola responsabilidad: convertir contraseñas en
// "hashes" (con hashPassword) y comprobar si una contraseña coincide con
// un hash ya guardado (con comparePassword). La consigna pide
// explícitamente que esta lógica esté en utils/ y sea reutilizable — así,
// cuando en una próxima entrega se implemente el login, va a usar
// comparePassword sin tener que escribir esta lógica de nuevo.
//
// ¿Por qué "hashear" y no guardar la contraseña tal cual?
// Si alguna vez alguien accediera a la base de datos sin permiso, con las
// contraseñas en texto plano vería literalmente la contraseña de cada
// persona. Con un hash, en cambio, ve una cadena de caracteres que no se
// puede "revertir" para recuperar la contraseña original. Lo único que
// se puede hacer con un hash es comparar: "¿esta contraseña nueva,
// hasheada de la misma forma, da el mismo resultado que la guardada?".
// Eso es exactamente lo que hace comparePassword.
//
// Elegí la librería bcryptjs (en vez de bcrypt a secas) a propósito:
// hacen lo mismo y con la misma API, pero bcrypt "puro" necesita
// compilar código en C++ al instalarse (node-gyp), lo cual en Windows a
// veces requiere instalar herramientas extra de Visual Studio y puede
// trabar el "npm install" con errores confusos. bcryptjs está escrito
// enteramente en JavaScript, así que se instala siempre sin fricción.
// Si en algún momento preferís la versión original, el cambio es mínimo:
// se reemplaza esta única importación por 'bcrypt' y el resto del
// proyecto sigue funcionando exactamente igual.

import bcrypt from 'bcryptjs';

// SALT_ROUNDS controla cuánto "trabajo" le cuesta a la computadora
// generar cada hash. Cuanto más alto, más seguro pero más lento. 10 es
// el valor que la propia documentación de bcrypt recomienda como
// equilibrio entre seguridad y velocidad para una aplicación típica.
const SALT_ROUNDS = 10;

export async function hashPassword(plainPassword) {
  return await bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function comparePassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}
