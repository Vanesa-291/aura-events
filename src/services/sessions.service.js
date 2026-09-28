// Acá vive TODA la lógica de negocio del registro: qué es un dato
// válido, qué es un duplicado, cómo se protege una contraseña. El
// controller no sabe nada de esto — solo le pasa lo que llegó en la
// petición y espera una respuesta. Y la ruta (sessions.router.js) no
// sabe nada de ninguna de las dos cosas. Esa separación es justamente lo
// que pide la consigna ("ruta → controller → service → repository/DAO
// → modelo"), y también es lo que hace que este código sea fácil de
// probar y de cambiar sin romper el resto.

import UsersRepository from '../repositories/users.repository.js';
import { hashPassword } from '../utils/hash.js';
import { AppError } from '../utils/appError.js';

const repository = new UsersRepository();

// Una expresión regular simple para reconocer un formato de email
// razonable: algo@algo.algo. No pretende cubrir cada caso extremo que
// contempla el estándar oficial de emails (esa lista es enorme y la
// mayoría de los proyectos reales no la implementan completa) — el
// objetivo acá es rechazar los errores típicos de tipeo, como
// "ana@mail" (sin dominio) o "anamail.com" (sin arroba).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// La consigna pide "longitud mínima de contraseña" sin especificar un
// número exacto, así que elegí 6 caracteres: es el mínimo que se suele
// considerar razonable (ni tan corto que sea trivial de adivinar, ni
// tan largo que resulte una exigencia rara para un proyecto de
// aprendizaje). Está aislado en esta constante para que, si en algún
// momento querés otro valor, sea un cambio de una sola línea.
const MIN_PASSWORD_LENGTH = 6;

class SessionsService {
  async registerUser({ first_name, last_name, email, password }) {
    // Fíjate que, a propósito, NO recibimos "role" en la desestructuración
    // de arriba. Aunque alguien mande { "role": "admin" } en el body del
    // POST, ese dato ni siquiera llega a existir como variable acá
    // adentro — es como si no lo hubiéramos leído. Así, el modelo User
    // se encarga de ponerle siempre el valor por defecto ('user') a
    // cualquier usuario que se registre por esta vía pública. Esta es
    // la forma más segura de "no dejar manipular el rol desde el body":
    // ni siquiera se llega a mirar ese campo.

    // --- Paso 1: validar que los campos obligatorios estén presentes ---
    // Usamos "!valor" para detectar tanto que falte el campo (undefined)
    // como que llegue vacío (""), porque un string vacío no es un dato
    // válido tampoco.
    if (!first_name || !last_name || !email || !password) {
      throw new AppError('Faltan campos obligatorios', 400);
    }

    // --- Paso 2: validar el formato del email ---
    if (!EMAIL_REGEX.test(email.trim())) {
      throw new AppError('El formato del email no es válido', 400);
    }

    // --- Paso 3: validar la longitud mínima de la contraseña ---
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new AppError(
        `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
        400
      );
    }

    // --- Paso 4: normalizar el email ---
    // .trim() saca espacios accidentales al principio o al final (por
    // ejemplo, si alguien copia y pega el email desde otro lado).
    // .toLowerCase() hace que "Ana@Mail.com" y "ana@mail.com" se
    // consideren EL MISMO email. Esto es importante: sin normalizar,
    // alguien podría registrarse dos veces con el mismo email real
    // escrito con mayúsculas distintas, y el chequeo de duplicados del
    // paso siguiente no lo detectaría.
    const normalizedEmail = email.trim().toLowerCase();

    // --- Paso 5: rechazar si el email ya está registrado ---
    const existingUser = await repository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new AppError('El email ya está registrado', 409);
    }

    // --- Paso 6: hashear la contraseña ---
    // A partir de acá, "password" en texto plano deja de existir en
    // cualquier variable que vaya a guardarse. Solo circula su versión
    // hasheada.
    const hashedPassword = await hashPassword(password);

    // --- Paso 7: guardar el usuario ---
    // Nótese que "role" no se pasa acá tampoco: dejamos que el modelo
    // le aplique su valor por defecto ('user').
    const newUser = await repository.create({
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    // --- Paso 8: armar la respuesta SIN la contraseña ---
    // newUser es un documento de Mongoose, no un objeto común de
    // JavaScript. .toObject() lo convierte en uno, y recién ahí podemos
    // desestructurarlo cómodamente. Sacamos "password" con
    // desestructuración (la variable "password" de acá abajo se crea
    // pero nunca se usa, a propósito: es la forma más clara de decir
    // "todo lo demás, menos esto") y con "...rest" nos quedamos con
    // todo lo demás (id, first_name, last_name, email, role,
    // createdAt, updatedAt).
    const { password: _password, ...userWithoutPassword } = newUser.toObject();

    return userWithoutPassword;
  }
}

export default SessionsService;
