// Tests de los DTO: lo que se muestra en las respuestas. Funcionan como una
// lista blanca, así que lo sensible (password) nunca puede salir.

import './helpers/setup-env.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { UserDTO, CurrentUserDTO } from '../src/dto/user.dto.js';
import { EventDTO } from '../src/dto/event.dto.js';
import { TicketDTO } from '../src/dto/ticket.dto.js';
import { fakeId } from './helpers/builders.js';

const rawUser = () => ({
  _id: fakeId(),
  first_name: 'Ana',
  last_name: 'García',
  email: 'ana@mail.com',
  password: '$2b$10$hashhashhashhashhashhashhashhashhashhashhashhashhash',
  role: 'user',
  createdAt: new Date(),
  updatedAt: new Date(),
  __v: 0,
});

describe('UserDTO', () => {
  it('nunca expone password ni __v', () => {
    const dto = new UserDTO(rawUser());
    assert.ok(!('password' in dto));
    assert.ok(!('__v' in dto));
    assert.ok(!JSON.stringify(dto).includes('$2b$'));
    assert.deepEqual(Object.keys(dto).sort(), ['_id', 'createdAt', 'email', 'first_name', 'last_name', 'role', 'updatedAt']);
  });

  it('funciona con documentos de Mongoose (toObject) y con listas', () => {
    const doc = { toObject: () => rawUser() };
    const [dto] = UserDTO.fromList([doc]);
    assert.ok(!('password' in dto));
    assert.equal(dto.email, 'ana@mail.com');
  });
});

describe('CurrentUserDTO', () => {
  it('solo muestra id, email, role, iat y exp del token', () => {
    const dto = new CurrentUserDTO({ id: 'x', email: 'a@a.com', role: 'user', iat: 1, exp: 2, password: 'secreta', extra: 'no' });
    assert.deepEqual({ ...dto }, { id: 'x', email: 'a@a.com', role: 'user', iat: 1, exp: 2 });
  });
});

describe('EventDTO', () => {
  it('muestra solo los campos del evento y no __v', () => {
    const dto = new EventDTO({
      _id: fakeId(), title: 't', description: 'd', category: 'c', date: new Date(), location: 'l',
      capacity: 10, price: 0, status: 'published', organizer: fakeId(), createdAt: new Date(), updatedAt: new Date(),
      __v: 3, campoInterno: 'no',
    });
    assert.ok(!('__v' in dto));
    assert.ok(!('campoInterno' in dto));
    assert.equal(dto.title, 't');
    assert.equal(dto.status, 'published');
  });
});

describe('TicketDTO', () => {
  const base = () => ({
    _id: fakeId(), user: fakeId(), event: fakeId(), status: 'confirmed', quantity: 2,
    reservationCode: 'AURA-ABCDEFGH', cancelledAt: null, createdAt: new Date(), updatedAt: new Date(), __v: 0,
  });

  it('muestra las referencias como ids y no expone __v', () => {
    const dto = new TicketDTO(base());
    assert.ok(!('__v' in dto));
    assert.equal(typeof dto.user, 'string');
    assert.equal(typeof dto.event, 'string');
    assert.equal(dto.cancelledAt, null);
  });

  it('con populate de evento, deja solo _id, title, date y location', () => {
    const dto = new TicketDTO({
      ...base(),
      event: { _id: fakeId(), title: 'Fiesta', date: new Date(), location: 'Mendoza', capacity: 500, organizer: fakeId() },
    });
    assert.deepEqual(Object.keys(dto.event).sort(), ['_id', 'date', 'location', 'title']);
  });

  it('con populate de usuario, deja solo nombre y email: nunca password ni rol', () => {
    const dto = new TicketDTO({
      ...base(),
      user: { _id: fakeId(), first_name: 'Ana', last_name: 'García', email: 'ana@mail.com', password: '$2b$hash', role: 'admin' },
    });
    assert.deepEqual(Object.keys(dto.user).sort(), ['_id', 'email', 'first_name', 'last_name']);
    assert.ok(!JSON.stringify(dto).includes('$2b$'));
  });
});
