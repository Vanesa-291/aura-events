// Acá vive TODA la lógica de negocio del registro: qué es un dato
// válido, qué es un duplicado, cómo se protege una contraseña. El
// controller no sabe nada de esto — solo le pasa lo que llegó en la
// petición y espera una respuesta. Y la ruta (sessions.router.js) no
// sabe nada de ninguna de las dos cosas. Esa separación es justamente lo
// que pide la consigna ("ruta → controller → service → repository/DAO
// → modelo"), y también es lo que hace que este código sea fácil de
// probar y de cambiar sin romper el resto.

import UsersRepository from '../repositories/users.repository.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { signToken } from '../utils/jwt.js';
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
    //
    // Para first_name y last_name hacemos algo más: los recortamos con
    // .trim() ANTES de validar. ¿Por qué? Porque un string como "   "
    // (puros espacios) no está vacío para JavaScript — "!'   '" da
    // false, entonces pasaría la validación de arriba sin problema,
    // pero evidentemente no es un nombre real. Guardamos el resultado
    // recortado en una constante nueva para no tener que recortarlo de
    // nuevo más abajo, al momento de guardar.
    const trimmedFirstName = (first_name || '').trim();
    const trimmedLastName = (last_name || '').trim();

    if (!trimmedFirstName || !trimmedLastName || !email || !password) {
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
    //
    // Este paso va envuelto en try/catch por una razón puntual: el
    // chequeo de duplicados del Paso 5 (findByEmail) y este guardado
    // NO son una sola operación atómica. Si dos peticiones de registro
    // con el mismo email llegan casi al mismo tiempo, es posible que
    // AMBAS pasen el Paso 5 (porque en ese instante, para las dos,
    // todavía no existía ningún usuario con ese email) y recién
    // choquen acá, cuando MongoDB intenta guardar el segundo documento
    // y se da cuenta de que ya existe un usuario con ese email gracias
    // al índice "unique" del modelo. Mongo responde con un error que
    // tiene código 11000 ("clave duplicada"). Sin este try/catch, ese
    // error pasaría como "inesperado" y el errorHandler respondería
    // 500 — un error del servidor que en realidad NO lo es: es la
    // misma situación de "email ya registrado" que ya manejamos en el
    // Paso 5, solo que detectada un instante más tarde. Por eso la
    // traducimos al mismo AppError 409 con el mismo mensaje, para que
    // quien use la API vea siempre la misma respuesta ante un email
    // duplicado, llegue por el camino que llegue.
    let newUser;
    try {
      newUser = await repository.create({
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        email: normalizedEmail,
        password: hashedPassword,
      });
    } catch (err) {
      if (err.code === 11000) {
        throw new AppError('El email ya está registrado', 409);
      }
      // Cualquier otro error (por ejemplo, que MongoDB no responda) no
      // lo conocemos de antemano, así que lo dejamos seguir su curso:
      // asyncHandler lo va a atrapar y el errorHandler lo va a tratar
      // como lo que es, un error inesperado (500).
      throw err;
    }

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

  // ========================================================================
  // LOGIN
  // ========================================================================
  //
  // Devuelve un JWT firmado si el email y la contraseña son correctos.
  // No devuelve datos del usuario acá — el controller se encarga de
  // guardar este token en una cookie, y quien quiera saber quién es el
  // usuario autenticado lo averigua llamando a GET /api/sessions/current
  // (ahí sí se devuelven los datos, tomados del propio token).
  async loginUser({ email, password }) {
    // --- Paso 1: validar que vengan ambos campos ---
    // Esto es una validación de formato de la petición ("mandaste un
    // JSON incompleto"), no una validación de identidad. Por eso usa
    // 400, no 401: 401 lo reservamos para cuando SÍ se mandaron ambos
    // datos pero no coinciden con ningún usuario real.
    if (!email || !password) {
      throw new AppError('Faltan campos obligatorios', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    // --- Paso 2: buscar el usuario por email ---
    const user = await repository.findByEmail(normalizedEmail);

    // --- Paso 3: comparar la contraseña ---
    //
    // Este es el punto más importante de seguridad de todo el login, así
    // que vale la pena detenerse a explicarlo bien. Tenemos DOS motivos
    // posibles de fallo, que son muy distintos entre sí:
    //   (a) no existe ningún usuario con ese email
    //   (b) el usuario existe, pero la contraseña no coincide
    //
    // Es MUY tentador responder cosas distintas para cada caso, como
    // "ese email no está registrado" vs. "contraseña incorrecta" — a
    // veces hasta parece "más prolijo" o "más útil". Pero es, en
    // realidad, una falla de seguridad conocida como "enumeración de
    // usuarios": si los mensajes son distintos, cualquiera podría ir
    // probando emails al azar y, por la respuesta que recibe, deducir
    // CUÁLES de esos emails están registrados en el sistema — sin
    // siquiera necesitar la contraseña correcta. Eso ya es información
    // sensible que no debería poder "adivinarse" desde afuera.
    //
    // Por eso la consigna pide (y hacemos) responder EXACTAMENTE el
    // mismo mensaje — "Credenciales inválidas" — tanto si el email no
    // existe como si la contraseña está mal. Para lograrlo sin repetir
    // código, usamos un pequeño truco: si el usuario no existe,
    // comparamos la contraseña recibida contra un hash "de relleno"
    // (en vez de cortar camino de inmediato). Esto además evita una
    // fuga de información más sutil: si cortáramos apenas no
    // encontramos el usuario, esa respuesta sería más RÁPIDA que
    // cuando sí existe (porque nos salteamos el cálculo del hash, que
    // es la parte más lenta de todo esto) — y ese tiempo de respuesta
    // distinto, en teoría, también podría usarse para deducir qué
    // emails existen. Comparando siempre, el tiempo de respuesta es
    // más parejo en ambos casos.
    const hashToCompare = user ? user.password : DUMMY_HASH;
    const passwordMatches = await comparePassword(password, hashToCompare);

    if (!user || !passwordMatches) {
      throw new AppError('Credenciales inválidas', 401);
    }

    // --- Paso 4: generar el JWT ---
    // El payload lleva solo lo mínimo necesario para identificar al
    // usuario y saber su rol — nunca la contraseña (ni su hash), según
    // pide explícitamente la consigna. user._id es un ObjectId de
    // Mongoose, así que lo convertimos a texto plano con .toString()
    // para que quede como un dato simple dentro del token.
    const token = signToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return token;
  }
}

// Un hash de bcrypt válido pero que no corresponde a ninguna contraseña
// real conocida. Se usa únicamente como "relleno" en el Paso 3 de
// loginUser, para que comparePassword() tenga siempre algo contra qué
// comparar y tarde un tiempo similar, exista o no el usuario. Nunca
// coincide con ninguna contraseña real porque nadie conoce el texto
// plano que lo originó.
const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8Z7/6/U.j.nQ4Y0aKcTIdI0D0DUj4O';

export default SessionsService;
