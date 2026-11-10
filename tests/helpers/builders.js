// Pequeñas funciones para armar datos de prueba (usuarios, eventos y tickets
// "de mentira") y para comprobar errores de la API.

import assert from 'node:assert/strict';

let counter = 0;

// Un id de MongoDB de mentira: 24 caracteres hexadecimales y distinto cada vez.
export function fakeId() {
  counter += 1;
  return counter.toString(16).padStart(24, '0');
}

export function fakeUser(role = 'user', overrides = {}) {
  return { id: fakeId(), email: `${role}-${counter}@mail.com`, role, ...overrides };
}

const DAY = 24 * 60 * 60 * 1000;

// Un evento como lo devolvería el repository: publicado, dentro de un día y
// con capacidad para 5 personas, salvo que se indique otra cosa.
export function fakeEvent(overrides = {}) {
  const id = overrides.id ?? fakeId();
  return {
    id,
    _id: id,
    title: 'Evento de prueba',
    status: 'published',
    date: new Date(Date.now() + DAY),
    capacity: 5,
    organizer: fakeId(),
    ...overrides,
  };
}

export const inDays = (days) => new Date(Date.now() + days * DAY);

// Comprueba que la promesa falle con un AppError de cierto código y mensaje.
export async function assertAppError(promise, statusCode, messagePattern) {
  await assert.rejects(promise, (err) => {
    assert.equal(err.statusCode, statusCode, `código esperado ${statusCode}, llegó ${err.statusCode} (${err.message})`);
    if (messagePattern) assert.match(err.message, messagePattern);
    return true;
  });
}
