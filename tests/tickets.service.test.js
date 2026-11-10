// Tests de TicketsService (la lógica de las inscripciones). No usan base de
// datos: los repositories y el envío de email se reemplazan por versiones de
// mentira (mock), así que se prueba SOLO la lógica del service.

import './helpers/setup-env.js';
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import TicketsService from '../src/services/tickets.service.js';
import TicketsRepository from '../src/repositories/tickets.repository.js';
import EventsRepository from '../src/repositories/events.repository.js';
import MailService from '../src/services/mail.service.js';
import { fakeId, fakeUser, fakeEvent, inDays, assertAppError } from './helpers/builders.js';

const service = new TicketsService();

// Arma los mocks de los repositories. "state" permite que cada test decida
// qué devuelve la "base de datos", y "calls" registra en qué orden se llamó
// a cada cosa.
function setup({ event = fakeEvent(), lockedEvent, active = 0, occupied = 0, emailResult = true } = {}) {
  const calls = [];
  const state = { event, lockedEvent: lockedEvent === undefined ? event : lockedEvent, active, occupied };

  mock.method(EventsRepository.prototype, 'findById', async () => { calls.push('findById'); return state.event; });
  mock.method(EventsRepository.prototype, 'lock', async () => { calls.push('lock'); return state.lockedEvent; });
  mock.method(TicketsRepository.prototype, 'transaction', async (work) => {
    calls.push('transaction:start');
    const result = await work('tx');
    calls.push('transaction:commit');
    return result;
  });
  mock.method(TicketsRepository.prototype, 'countActiveTickets', async () => { calls.push('countActive'); return state.active; });
  mock.method(TicketsRepository.prototype, 'countOccupiedSeats', async () => { calls.push('countOccupied'); return state.occupied; });
  mock.method(TicketsRepository.prototype, 'create', async (data) => { calls.push('create'); return { id: fakeId(), ...data }; });
  mock.method(MailService.prototype, 'sendTicketConfirmation', async () => { calls.push('email'); return emailResult; });

  return { calls, state };
}

afterEach(() => mock.restoreAll());

describe('TicketsService.createTicket — validaciones previas', () => {
  it('un id con formato inválido responde 400 sin consultar nada', async () => {
    const { calls } = setup();
    await assertAppError(service.createTicket('abc', {}, fakeUser()), 400, /id del evento/);
    assert.deepEqual(calls, []);
  });

  it('un evento que no existe responde 404', async () => {
    setup({ event: null });
    await assertAppError(service.createTicket(fakeId(), {}, fakeUser()), 404, /no encontrado/i);
  });

  it('un evento en borrador responde 409', async () => {
    setup({ event: fakeEvent({ status: 'draft' }) });
    await assertAppError(service.createTicket(fakeId(), {}, fakeUser()), 409, /todavía no está publicado/);
  });

  it('un evento cancelado responde 409', async () => {
    setup({ event: fakeEvent({ status: 'cancelled' }) });
    await assertAppError(service.createTicket(fakeId(), {}, fakeUser()), 409, /cancelado/);
  });

  it('un evento finalizado responde 409', async () => {
    setup({ event: fakeEvent({ status: 'finished' }) });
    await assertAppError(service.createTicket(fakeId(), {}, fakeUser()), 409, /finalizado/);
  });

  it('un evento publicado cuya fecha ya pasó responde 409', async () => {
    const { calls } = setup({ event: fakeEvent({ date: inDays(-1) }) });
    await assertAppError(service.createTicket(fakeId(), {}, fakeUser()), 409, /fecha ya pasó/);
    assert.ok(!calls.includes('transaction:start'), 'ni siquiera debe abrir la transacción');
  });

  it('un evento que empezó hace un segundo ya no acepta inscripciones', async () => {
    setup({ event: fakeEvent({ date: new Date(Date.now() - 1000) }) });
    await assertAppError(service.createTicket(fakeId(), {}, fakeUser()), 409, /fecha ya pasó/);
  });

  it('si el estado es finished y además la fecha pasó, gana el mensaje del estado', async () => {
    setup({ event: fakeEvent({ status: 'finished', date: inDays(-3) }) });
    await assertAppError(service.createTicket(fakeId(), {}, fakeUser()), 409, /finalizado/);
  });

  for (const quantity of [0, -1, 1.5, '2', null, NaN]) {
    it(`quantity inválida (${JSON.stringify(quantity)}) responde 400`, async () => {
      setup();
      await assertAppError(
        service.createTicket(fakeId(), { quantity }, fakeUser()),
        400,
        /entero mayor a 0/
      );
    });
  }
});

describe('TicketsService.createTicket — reserva', () => {
  it('sin quantity reserva 1 lugar, queda confirmada y responde con emailSent', async () => {
    const { state } = setup();
    const user = fakeUser();
    const { ticket, emailSent } = await service.createTicket(state.event.id, {}, user);

    assert.equal(ticket.quantity, 1);
    assert.equal(ticket.status, 'confirmed');
    assert.equal(ticket.user, user.id);
    assert.equal(ticket.event, state.event.id);
    assert.match(ticket.reservationCode, /^AURA-[A-HJKMNP-Z2-9]{8}$/);
    assert.equal(emailSent, true);
  });

  it('puede reservar varios lugares con quantity', async () => {
    const { state } = setup({ occupied: 1 });
    const { ticket } = await service.createTicket(state.event.id, { quantity: 4 }, fakeUser());
    assert.equal(ticket.quantity, 4);
  });

  it('el último lugar disponible se puede reservar', async () => {
    const { state } = setup({ event: fakeEvent({ capacity: 3 }), occupied: 2 });
    const { ticket } = await service.createTicket(state.event.id, { quantity: 1 }, fakeUser());
    assert.equal(ticket.quantity, 1);
  });

  it('ignora user, status, event y reservationCode que lleguen en el body', async () => {
    const { state } = setup();
    const user = fakeUser();
    const { ticket } = await service.createTicket(
      state.event.id,
      { quantity: 1, user: 'otro', status: 'cancelled', event: 'otro', reservationCode: 'HACK-1234' },
      user
    );
    assert.equal(ticket.user, user.id);
    assert.equal(ticket.status, 'confirmed');
    assert.equal(ticket.event, state.event.id);
    assert.notEqual(ticket.reservationCode, 'HACK-1234');
  });

  it('una inscripción duplicada activa responde 409 y no crea nada', async () => {
    const { calls } = setup({ active: 1 });
    await assertAppError(service.createTicket(fakeId(), {}, fakeUser()), 409, /Ya tenés una inscripción activa/);
    assert.ok(!calls.includes('create'));
    assert.ok(!calls.includes('email'));
  });

  it('sin cupo responde 409 con mensaje claro', async () => {
    const { calls } = setup({ event: fakeEvent({ capacity: 5 }), occupied: 5 });
    await assertAppError(service.createTicket(fakeId(), {}, fakeUser()), 409, /No quedan cupos disponibles/);
    assert.ok(!calls.includes('create'));
  });

  it('pedir más lugares de los que quedan responde 409 explicando cuántos quedan', async () => {
    setup({ event: fakeEvent({ capacity: 5 }), occupied: 4 });
    await assertAppError(
      service.createTicket(fakeId(), { quantity: 2 }, fakeUser()),
      409,
      /quedan 1 lugar y pediste 2/
    );
  });

  it('usa "lugares" en plural cuando quedan varios', async () => {
    setup({ event: fakeEvent({ capacity: 5 }), occupied: 2 });
    await assertAppError(
      service.createTicket(fakeId(), { quantity: 4 }, fakeUser()),
      409,
      /quedan 3 lugares y pediste 4/
    );
  });

  it('el cupo se calcula con lo ocupado: capacity - ocupados', async () => {
    // capacity 10, ocupados 7 → quedan 3: 3 entra, 4 no.
    setup({ event: fakeEvent({ capacity: 10 }), occupied: 7 });
    await service.createTicket(fakeId(), { quantity: 3 }, fakeUser());
    await assertAppError(service.createTicket(fakeId(), { quantity: 4 }, fakeUser()), 409, /quedan 3 lugares/);
  });
});

describe('TicketsService.createTicket — transacción y email', () => {
  it('bloquea el evento ANTES de contar duplicados y cupo, y todo dentro de la transacción', async () => {
    const { calls, state } = setup();
    await service.createTicket(state.event.id, {}, fakeUser());

    const order = calls.filter((c) => c !== 'findById');
    assert.deepEqual(order, [
      'transaction:start',
      'lock',
      'countActive',
      'countOccupied',
      'create',
      'transaction:commit',
      'email',
    ]);
  });

  it('el email se envía DESPUÉS de confirmar la transacción', async () => {
    const { calls, state } = setup();
    await service.createTicket(state.event.id, {}, fakeUser());
    assert.ok(calls.indexOf('email') > calls.indexOf('transaction:commit'));
  });

  it('no se envía email si la inscripción es rechazada', async () => {
    const { calls } = setup({ occupied: 5 });
    await assert.rejects(service.createTicket(fakeId(), {}, fakeUser()));
    assert.ok(!calls.includes('email'));
  });

  it('si el email falla, la inscripción sigue en pie con emailSent: false', async () => {
    const { state } = setup({ emailResult: false });
    const { ticket, emailSent } = await service.createTicket(state.event.id, {}, fakeUser());
    assert.ok(ticket.reservationCode);
    assert.equal(emailSent, false);
  });

  it('manda el email a quien se inscribió', async () => {
    const { state } = setup();
    const user = fakeUser('user', { email: 'persona@mail.com' });
    await service.createTicket(state.event.id, {}, user);
    const [args] = MailService.prototype.sendTicketConfirmation.mock.calls[0].arguments;
    assert.equal(args.to, 'persona@mail.com');
  });

  it('si el evento se canceló entre la primera lectura y el bloqueo, responde 409', async () => {
    const event = fakeEvent();
    setup({ event, lockedEvent: { ...event, status: 'cancelled' } });
    await assertAppError(service.createTicket(event.id, {}, fakeUser()), 409, /cancelado/);
  });

  it('si el evento desaparece antes del bloqueo, responde 404', async () => {
    setup({ lockedEvent: null });
    await assertAppError(service.createTicket(fakeId(), {}, fakeUser()), 404, /no encontrado/i);
  });

  it('si el código de reserva ya existía, repite la transacción con un código nuevo', async () => {
    const { state } = setup();
    const codes = [];
    let attempt = 0;
    TicketsRepository.prototype.create.mock.mockImplementation(async (data) => {
      codes.push(data.reservationCode);
      attempt += 1;
      if (attempt === 1) {
        const err = new Error('E11000 duplicate key');
        err.code = 11000;
        err.keyPattern = { reservationCode: 1 };
        throw err;
      }
      return { id: fakeId(), ...data };
    });

    const { ticket } = await service.createTicket(state.event.id, {}, fakeUser());
    assert.equal(codes.length, 2);
    assert.notEqual(codes[0], codes[1]);
    assert.equal(ticket.reservationCode, codes[1]);
  });

  it('si el código se repite 5 veces seguidas, el error se propaga', async () => {
    const { state } = setup();
    TicketsRepository.prototype.create.mock.mockImplementation(async () => {
      const err = new Error('E11000 duplicate key');
      err.code = 11000;
      err.keyPattern = { reservationCode: 1 };
      throw err;
    });
    await assert.rejects(service.createTicket(state.event.id, {}, fakeUser()), (err) => err.code === 11000);
    assert.equal(TicketsRepository.prototype.create.mock.callCount(), 5);
  });

  it('un error de base que no es de código duplicado no se reintenta', async () => {
    const { state } = setup();
    TicketsRepository.prototype.create.mock.mockImplementation(async () => {
      throw new Error('se cayó la base');
    });
    await assert.rejects(service.createTicket(state.event.id, {}, fakeUser()), /se cayó la base/);
    assert.equal(TicketsRepository.prototype.create.mock.callCount(), 1);
  });
});

// ============================================================================
// El caso más delicado: pedidos simultáneos por el mismo cupo.
//
// Acá la "base de datos" es un arreglo en memoria y cada operación cede el
// turno (como lo haría una consulta de red real), para que los pedidos se
// entrelacen. La transacción de mentira se comporta como la de MongoDB con el
// bloqueo del evento: las que tocan el mismo evento se atienden de a una.
// ============================================================================
describe('TicketsService.createTicket — pedidos simultáneos (carrera por el cupo)', () => {
  const tick = () => new Promise((resolve) => setImmediate(resolve));

  function setupRace({ capacity, serialize = true }) {
    const event = fakeEvent({ capacity });
    const tickets = [];
    let queue = Promise.resolve();

    mock.method(EventsRepository.prototype, 'findById', async () => { await tick(); return event; });
    mock.method(EventsRepository.prototype, 'lock', async () => { await tick(); return event; });
    mock.method(TicketsRepository.prototype, 'transaction', async (work) => {
      if (!serialize) return work('tx');
      const run = queue.then(() => work('tx'));
      queue = run.catch(() => {});
      return run;
    });
    mock.method(TicketsRepository.prototype, 'countActiveTickets', async (userId) => {
      await tick();
      return tickets.filter((t) => t.user === userId && t.status !== 'cancelled').length;
    });
    mock.method(TicketsRepository.prototype, 'countOccupiedSeats', async () => {
      await tick();
      return tickets.filter((t) => t.status !== 'cancelled').reduce((sum, t) => sum + t.quantity, 0);
    });
    mock.method(TicketsRepository.prototype, 'create', async (data) => {
      await tick();
      const ticket = { id: fakeId(), ...data };
      tickets.push(ticket);
      return ticket;
    });
    mock.method(MailService.prototype, 'sendTicketConfirmation', async () => true);

    const seatsTaken = () => tickets.reduce((sum, t) => sum + t.quantity, 0);
    return { event, tickets, seatsTaken };
  }

  const settle = (promises) => Promise.allSettled(promises);

  it('1 lugar libre y 2 pedidos a la vez: exactamente UNA persona se inscribe', async () => {
    const { event, tickets } = setupRace({ capacity: 1 });
    const results = await settle([
      service.createTicket(event.id, {}, fakeUser()),
      service.createTicket(event.id, {}, fakeUser()),
    ]);

    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    const rejected = results.find((r) => r.status === 'rejected');
    assert.equal(rejected.reason.statusCode, 409);
    assert.match(rejected.reason.message, /No quedan cupos/);
    assert.equal(tickets.length, 1);
  });

  it('se repite muchas veces sin que nunca queden 0 reservas', async () => {
    for (let i = 0; i < 50; i += 1) {
      const { event, tickets } = setupRace({ capacity: 1 });
      await settle([
        service.createTicket(event.id, {}, fakeUser()),
        service.createTicket(event.id, {}, fakeUser()),
      ]);
      assert.equal(tickets.length, 1, `ronda ${i}: debía quedar exactamente 1 reserva`);
      mock.restoreAll();
    }
  });

  it('10 pedidos por 3 lugares: se confirman exactamente 3', async () => {
    const { event, tickets, seatsTaken } = setupRace({ capacity: 3 });
    const results = await settle(Array.from({ length: 10 }, () => service.createTicket(event.id, {}, fakeUser())));

    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 3);
    assert.equal(tickets.length, 3);
    assert.equal(seatsTaken(), 3);
    for (const r of results.filter((x) => x.status === 'rejected')) {
      assert.equal(r.reason.statusCode, 409);
    }
  });

  it('la misma persona pidiendo 3 veces a la vez queda con UN solo ticket activo', async () => {
    const { event, tickets } = setupRace({ capacity: 10 });
    const user = fakeUser();
    const results = await settle([
      service.createTicket(event.id, {}, user),
      service.createTicket(event.id, {}, user),
      service.createTicket(event.id, {}, user),
    ]);

    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(tickets.length, 1);
    for (const r of results.filter((x) => x.status === 'rejected')) {
      assert.match(r.reason.message, /Ya tenés una inscripción activa/);
    }
  });

  it('con cantidades mezcladas nunca se supera la capacidad', async () => {
    const { event, seatsTaken } = setupRace({ capacity: 5 });
    await settle([2, 2, 2, 1, 3, 1].map((quantity) => service.createTicket(event.id, { quantity }, fakeUser())));
    assert.ok(seatsTaken() <= 5, `se vendieron ${seatsTaken()} lugares de 5`);
  });

  it('CONTRAPRUEBA: sin el bloqueo del evento, el test detecta que se vendería de más', async () => {
    // Si este test dejara de fallar sin bloqueo, los tests de arriba no
    // servirían para nada. Sin serializar, los dos pedidos cuentan "1 libre"
    // a la vez y los dos guardan.
    const { event, seatsTaken } = setupRace({ capacity: 1, serialize: false });
    await settle([
      service.createTicket(event.id, {}, fakeUser()),
      service.createTicket(event.id, {}, fakeUser()),
    ]);
    assert.equal(seatsTaken(), 2, 'sin bloqueo se venden 2 lugares de 1 (por eso el bloqueo es necesario)');
  });
});

describe('TicketsService.cancelTicket', () => {
  const ticketOf = (userId, status = 'confirmed') => ({ id: fakeId(), user: { toString: () => userId }, status });

  it('un id inválido responde 400', async () => {
    setup();
    await assertAppError(service.cancelTicket('abc', fakeUser()), 400, /id del ticket/);
  });

  it('un ticket inexistente responde 404', async () => {
    setup();
    mock.method(TicketsRepository.prototype, 'findById', async () => null);
    await assertAppError(service.cancelTicket(fakeId(), fakeUser()), 404, /Ticket no encontrado/);
  });

  it('el dueño puede cancelar su ticket y no se borra nada: solo cambia el estado', async () => {
    setup();
    const owner = fakeUser();
    const ticket = ticketOf(owner.id);
    mock.method(TicketsRepository.prototype, 'findById', async () => ticket);
    const cancel = mock.method(TicketsRepository.prototype, 'cancelTicket', async () => ({ ...ticket, status: 'cancelled' }));

    const result = await service.cancelTicket(ticket.id, owner);
    assert.equal(result.status, 'cancelled');
    assert.equal(cancel.mock.callCount(), 1);
  });

  it('un admin puede cancelar el ticket de otra persona', async () => {
    setup();
    const ticket = ticketOf(fakeId());
    mock.method(TicketsRepository.prototype, 'findById', async () => ticket);
    mock.method(TicketsRepository.prototype, 'cancelTicket', async () => ({ ...ticket, status: 'cancelled' }));

    const result = await service.cancelTicket(ticket.id, fakeUser('admin'));
    assert.equal(result.status, 'cancelled');
  });

  it('otra persona (aunque sea organizer) no puede cancelar: 403', async () => {
    setup();
    const ticket = ticketOf(fakeId());
    mock.method(TicketsRepository.prototype, 'findById', async () => ticket);
    const cancel = mock.method(TicketsRepository.prototype, 'cancelTicket', async () => ticket);

    await assertAppError(service.cancelTicket(ticket.id, fakeUser('user')), 403, /No tenés permisos/);
    await assertAppError(service.cancelTicket(ticket.id, fakeUser('organizer')), 403, /No tenés permisos/);
    assert.equal(cancel.mock.callCount(), 0);
  });

  it('cancelar un ticket ya cancelado responde 409', async () => {
    setup();
    const owner = fakeUser();
    const ticket = ticketOf(owner.id, 'cancelled');
    mock.method(TicketsRepository.prototype, 'findById', async () => ticket);
    await assertAppError(service.cancelTicket(ticket.id, owner), 409, /ya está cancelado/);
  });

  it('si dos cancelaciones llegan a la vez, la que pierde responde 409', async () => {
    setup();
    const owner = fakeUser();
    const ticket = ticketOf(owner.id);
    mock.method(TicketsRepository.prototype, 'findById', async () => ticket);
    mock.method(TicketsRepository.prototype, 'cancelTicket', async () => null);
    await assertAppError(service.cancelTicket(ticket.id, owner), 409, /ya está cancelado/);
  });
});

describe('TicketsService.getMyTickets y getEventTickets', () => {
  it('getMyTickets busca SIEMPRE por el id de la sesión', async () => {
    const user = fakeUser();
    const find = mock.method(TicketsRepository.prototype, 'findByUser', async () => []);
    await service.getMyTickets(user);
    assert.deepEqual(find.mock.calls[0].arguments, [user.id]);
  });

  function setupEventTickets(event) {
    mock.method(EventsRepository.prototype, 'findById', async () => event);
    const find = mock.method(TicketsRepository.prototype, 'findByEvent', async () => [{ id: 'a' }]);
    mock.method(TicketsRepository.prototype, 'countOccupiedSeats', async () => 2);
    return find;
  }

  it('el organizer dueño ve los tickets, con resumen del cupo', async () => {
    const owner = fakeUser('organizer');
    const event = fakeEvent({ capacity: 5, organizer: owner.id });
    setupEventTickets(event);

    const result = await service.getEventTickets(event.id, {}, owner);
    assert.deepEqual(result.summary, { capacity: 5, occupied: 2, available: 3 });
    assert.equal(result.tickets.length, 1);
  });

  it('un admin ve los tickets de cualquier evento', async () => {
    const event = fakeEvent();
    setupEventTickets(event);
    const result = await service.getEventTickets(event.id, {}, fakeUser('admin'));
    assert.equal(result.tickets.length, 1);
  });

  it('un organizer de otro evento recibe 403', async () => {
    const event = fakeEvent();
    setupEventTickets(event);
    await assertAppError(service.getEventTickets(event.id, {}, fakeUser('organizer')), 403, /No tenés permisos/);
  });

  it('el filtro ?status=confirmed se pasa al repository', async () => {
    const owner = fakeUser('organizer');
    const event = fakeEvent({ organizer: owner.id });
    const find = setupEventTickets(event);
    await service.getEventTickets(event.id, { status: 'confirmed' }, owner);
    assert.deepEqual(find.mock.calls[0].arguments, [event.id, 'confirmed']);
  });

  it('un status inválido o con operadores de MongoDB responde 400', async () => {
    const owner = fakeUser('organizer');
    const event = fakeEvent({ organizer: owner.id });
    setupEventTickets(event);
    await assertAppError(service.getEventTickets(event.id, { status: 'inventado' }, owner), 400, /status no es válido/);
    await assertAppError(service.getEventTickets(event.id, { status: { $ne: 'x' } }, owner), 400, /status no es válido/);
  });
});
