// Tests de EventsService (reglas de eventos, permisos y listado). Sin base de
// datos: el repository se reemplaza por una versión de mentira.

import './helpers/setup-env.js';
import { describe, it, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import EventsService from '../src/services/events.service.js';
import EventsRepository from '../src/repositories/events.repository.js';
import { fakeId, fakeUser, fakeEvent, inDays, assertAppError } from './helpers/builders.js';

const service = new EventsService();

afterEach(() => mock.restoreAll());

const validBody = (overrides = {}) => ({
  title: '  Congreso Tech  ',
  description: 'Un congreso',
  category: 'tecnologia',
  location: 'Mendoza',
  date: inDays(10).toISOString(),
  capacity: 100,
  price: 2500,
  ...overrides,
});

describe('EventsService.createEvent', () => {
  function setupCreate() {
    return mock.method(EventsRepository.prototype, 'create', async (data) => ({ id: fakeId(), ...data }));
  }

  it('crea el evento como borrador, con el organizer que sale de la sesión y los textos recortados', async () => {
    const create = setupCreate();
    const organizer = fakeUser('organizer');
    const event = await service.createEvent(validBody(), organizer);

    const saved = create.mock.calls[0].arguments[0];
    assert.equal(event.status, 'draft');
    assert.equal(saved.organizer, organizer.id);
    assert.equal(saved.title, 'Congreso Tech');
    assert.ok(saved.date instanceof Date);
    assert.equal(saved.price, 2500);
  });

  it('sin price el evento es gratuito (0)', async () => {
    const create = setupCreate();
    const body = validBody();
    delete body.price;
    await service.createEvent(body, fakeUser('organizer'));
    assert.equal(create.mock.calls[0].arguments[0].price, 0);
  });

  it('se puede crear directamente como published', async () => {
    setupCreate();
    const event = await service.createEvent(validBody({ status: 'published' }), fakeUser('organizer'));
    assert.equal(event.status, 'published');
  });

  it('el organizer del body se ignora: siempre es quien tiene la sesión', async () => {
    const create = setupCreate();
    const organizer = fakeUser('organizer');
    await service.createEvent(validBody({ organizer: fakeId(), _id: fakeId() }), organizer);
    assert.equal(create.mock.calls[0].arguments[0].organizer, organizer.id);
  });

  for (const status of ['cancelled', 'finished', 'inventado']) {
    it(`no se puede crear un evento con estado "${status}": 400`, async () => {
      setupCreate();
      await assertAppError(service.createEvent(validBody({ status }), fakeUser('organizer')), 400, /solo puede crearse como/);
    });
  }

  it('una fecha pasada responde 400', async () => {
    setupCreate();
    await assertAppError(
      service.createEvent(validBody({ date: inDays(-1).toISOString() }), fakeUser('organizer')),
      400,
      /no puede ser pasada/
    );
  });

  for (const date of ['no-es-fecha', 123, null]) {
    it(`una fecha inválida (${JSON.stringify(date)}) responde 400`, async () => {
      setupCreate();
      await assertAppError(service.createEvent(validBody({ date }), fakeUser('organizer')), 400, /fecha del evento no es válida/);
    });
  }

  for (const capacity of [0, -5, 1.5, '10', null]) {
    it(`capacity inválida (${JSON.stringify(capacity)}) responde 400`, async () => {
      setupCreate();
      await assertAppError(service.createEvent(validBody({ capacity }), fakeUser('organizer')), 400, /capacidad/);
    });
  }

  for (const price of [-1, '100', null, Infinity]) {
    it(`price inválido (${JSON.stringify(price)}) responde 400`, async () => {
      setupCreate();
      await assertAppError(service.createEvent(validBody({ price }), fakeUser('organizer')), 400, /precio/);
    });
  }

  it('el precio 0 es válido', async () => {
    setupCreate();
    const event = await service.createEvent(validBody({ price: 0 }), fakeUser('organizer'));
    assert.equal(event.price, 0);
  });

  for (const field of ['title', 'description', 'category', 'location']) {
    it(`un ${field} de puros espacios responde 400`, async () => {
      setupCreate();
      await assertAppError(service.createEvent(validBody({ [field]: '   ' }), fakeUser('organizer')), 400, /no puede estar vacío/);
    });

    it(`si falta ${field}, responde 400`, async () => {
      setupCreate();
      const body = validBody();
      delete body[field];
      await assertAppError(service.createEvent(body, fakeUser('organizer')), 400, /Faltan campos obligatorios/);
    });
  }

  it('un body vacío o inexistente responde 400', async () => {
    setupCreate();
    await assertAppError(service.createEvent({}, fakeUser('organizer')), 400, /Faltan campos/);
    await assertAppError(service.createEvent(undefined, fakeUser('organizer')), 400, /Faltan campos/);
  });
});

describe('EventsService.updateEvent (PUT)', () => {
  function setupUpdate(event) {
    mock.method(EventsRepository.prototype, 'findById', async () => event);
    return mock.method(EventsRepository.prototype, 'update', async (id, changes) => ({ ...event, ...changes }));
  }

  it('el organizer dueño puede modificar su evento', async () => {
    const owner = fakeUser('organizer');
    const event = fakeEvent({ organizer: owner.id });
    const update = setupUpdate(event);

    const result = await service.updateEvent(event.id, { title: 'Nuevo título' }, owner);
    assert.equal(result.title, 'Nuevo título');
    assert.deepEqual(update.mock.calls[0].arguments, [event.id, { title: 'Nuevo título' }]);
  });

  it('un organizer NO puede modificar el evento de otro: 403', async () => {
    const event = fakeEvent();
    const update = setupUpdate(event);
    await assertAppError(service.updateEvent(event.id, { title: 'x' }, fakeUser('organizer')), 403, /No tenés permisos/);
    assert.equal(update.mock.callCount(), 0);
  });

  it('un admin puede modificar el evento de cualquier organizer', async () => {
    const event = fakeEvent();
    setupUpdate(event);
    const result = await service.updateEvent(event.id, { location: 'Córdoba' }, fakeUser('admin'));
    assert.equal(result.location, 'Córdoba');
  });

  for (const status of ['cancelled', 'finished']) {
    it(`un evento ${status} no se puede modificar: 409`, async () => {
      const owner = fakeUser('organizer');
      const event = fakeEvent({ organizer: owner.id, status });
      const update = setupUpdate(event);
      await assertAppError(service.updateEvent(event.id, { title: 'x' }, owner), 409, /No se puede modificar un evento/);
      assert.equal(update.mock.callCount(), 0);
    });
  }

  it('un body sin campos válidos responde 400', async () => {
    const owner = fakeUser('organizer');
    const event = fakeEvent({ organizer: owner.id });
    setupUpdate(event);
    await assertAppError(service.updateEvent(event.id, { foo: 'bar' }, owner), 400, /No hay campos válidos/);
  });

  it('no permite cambiar organizer ni status por esta vía', async () => {
    const owner = fakeUser('organizer');
    const event = fakeEvent({ organizer: owner.id });
    const update = setupUpdate(event);
    await service.updateEvent(event.id, { title: 'ok', organizer: fakeId(), status: 'cancelled' }, owner);
    assert.deepEqual(update.mock.calls[0].arguments[1], { title: 'ok' });
  });

  it('un id inválido responde 400 y uno inexistente 404', async () => {
    mock.method(EventsRepository.prototype, 'findById', async () => null);
    await assertAppError(service.updateEvent('abc', { title: 'x' }, fakeUser('admin')), 400, /id del evento/);
    await assertAppError(service.updateEvent(fakeId(), { title: 'x' }, fakeUser('admin')), 404, /no encontrado/i);
  });
});

describe('EventsService.updateEventStatus (PATCH /:id/status)', () => {
  function setupStatus(event) {
    mock.method(EventsRepository.prototype, 'findById', async () => event);
    return mock.method(EventsRepository.prototype, 'updateStatus', async (id, status) => ({ ...event, status }));
  }

  const allowed = [
    ['draft', 'published'],
    ['draft', 'cancelled'],
    ['published', 'cancelled'],
    ['published', 'finished'],
  ];
  for (const [from, to] of allowed) {
    it(`permite pasar de ${from} a ${to}`, async () => {
      const owner = fakeUser('organizer');
      const event = fakeEvent({ organizer: owner.id, status: from });
      setupStatus(event);
      const result = await service.updateEventStatus(event.id, { status: to }, owner);
      assert.equal(result.status, to);
    });
  }

  const forbidden = [
    ['draft', 'finished'],
    ['published', 'draft'],
    ['cancelled', 'published'],
    ['cancelled', 'draft'],
    ['cancelled', 'finished'],
    ['finished', 'published'],
    ['finished', 'cancelled'],
  ];
  for (const [from, to] of forbidden) {
    it(`NO permite pasar de ${from} a ${to}: 409`, async () => {
      const owner = fakeUser('organizer');
      const event = fakeEvent({ organizer: owner.id, status: from });
      const update = setupStatus(event);
      await assertAppError(service.updateEventStatus(event.id, { status: to }, owner), 409);
      assert.equal(update.mock.callCount(), 0);
    });
  }

  it('un evento cancelado no se puede volver a publicar (mensaje claro)', async () => {
    const owner = fakeUser('organizer');
    const event = fakeEvent({ organizer: owner.id, status: 'cancelled' });
    setupStatus(event);
    await assertAppError(service.updateEventStatus(event.id, { status: 'published' }, owner), 409, /No se puede publicar un evento cancelado/);
  });

  it('pedir el mismo estado en el que ya está responde 409', async () => {
    const owner = fakeUser('organizer');
    const event = fakeEvent({ organizer: owner.id, status: 'published' });
    setupStatus(event);
    await assertAppError(service.updateEventStatus(event.id, { status: 'published' }, owner), 409, /ya está publicado/);
  });

  it('un estado inexistente o que no es texto responde 400', async () => {
    const owner = fakeUser('organizer');
    const event = fakeEvent({ organizer: owner.id });
    setupStatus(event);
    await assertAppError(service.updateEventStatus(event.id, { status: 'inventado' }, owner), 400, /El estado debe ser uno de/);
    await assertAppError(service.updateEventStatus(event.id, { status: { $ne: 'x' } }, owner), 400, /El estado debe ser uno de/);
    await assertAppError(service.updateEventStatus(event.id, undefined, owner), 400, /El estado debe ser uno de/);
  });

  it('un organizer ajeno recibe 403; un admin puede', async () => {
    const event = fakeEvent({ status: 'draft' });
    setupStatus(event);
    await assertAppError(service.updateEventStatus(event.id, { status: 'published' }, fakeUser('organizer')), 403);
    const result = await service.updateEventStatus(event.id, { status: 'published' }, fakeUser('admin'));
    assert.equal(result.status, 'published');
  });
});

describe('EventsService.getEventById', () => {
  it('un evento publicado es público (sin sesión)', async () => {
    const event = fakeEvent();
    mock.method(EventsRepository.prototype, 'findById', async () => event);
    assert.equal(await service.getEventById(event.id, undefined), event);
  });

  it('un borrador responde 404 para cualquiera que no sea su dueño o un admin', async () => {
    const owner = fakeUser('organizer');
    const event = fakeEvent({ status: 'draft', organizer: owner.id });
    mock.method(EventsRepository.prototype, 'findById', async () => event);

    await assertAppError(service.getEventById(event.id, undefined), 404);
    await assertAppError(service.getEventById(event.id, fakeUser('user')), 404);
    await assertAppError(service.getEventById(event.id, fakeUser('organizer')), 404);
    assert.equal(await service.getEventById(event.id, owner), event);
    assert.equal(await service.getEventById(event.id, fakeUser('admin')), event);
  });
});

describe('EventsService.getEvents (listado con filtros y paginación)', () => {
  function setupList(items = [], total = items.length) {
    return mock.method(EventsRepository.prototype, 'findPaginated', async () => ({ items, total }));
  }
  const filterOf = (spy) => spy.mock.calls[0].arguments[0];
  const optionsOf = (spy) => spy.mock.calls[0].arguments[1];

  it('devuelve data, page, limit, total y totalPages', async () => {
    setupList([fakeEvent(), fakeEvent()], 27);
    const result = await service.getEvents({ page: '2', limit: '5' });
    assert.equal(result.data.length, 2);
    assert.equal(result.page, 2);
    assert.equal(result.limit, 5);
    assert.equal(result.total, 27);
    assert.equal(result.totalPages, 6);
  });

  it('por defecto: solo publicados, página 1, 10 por página, ordenados por fecha', async () => {
    const spy = setupList();
    const result = await service.getEvents({});
    assert.equal(filterOf(spy).status, 'published');
    assert.equal(result.page, 1);
    assert.equal(result.limit, 10);
    assert.deepEqual(optionsOf(spy), { sort: { date: 1, _id: 1 }, skip: 0, limit: 10 });
  });

  it('la página 3 con límite 5 saltea 10 eventos', async () => {
    const spy = setupList();
    await service.getEvents({ page: '3', limit: '5' });
    assert.equal(optionsOf(spy).skip, 10);
    assert.equal(optionsOf(spy).limit, 5);
  });

  it('filtra por estado, categoría y ubicación', async () => {
    const spy = setupList();
    await service.getEvents({ status: 'cancelled', category: 'Música', location: 'mendoza' });
    const filter = filterOf(spy);
    assert.equal(filter.status, 'cancelled');
    assert.ok(filter.category.test('música') && !filter.category.test('música en vivo'), 'categoría: coincidencia exacta sin importar mayúsculas');
    assert.ok(filter.location.test('Gran MENDOZA centro'), 'ubicación: contiene el texto');
  });

  it('los caracteres especiales de la búsqueda se tratan como texto común', async () => {
    const spy = setupList();
    await service.getEvents({ location: '.*' });
    const { location } = filterOf(spy);
    assert.ok(location.test('sala .* uno'));
    assert.ok(!location.test('Mendoza'), '".*" no debe comportarse como comodín');
  });

  it('filtra por rango de fechas (dateTo incluye todo ese día)', async () => {
    const spy = setupList();
    await service.getEvents({ dateFrom: '2026-12-01', dateTo: '2026-12-31' });
    const { date } = filterOf(spy);
    assert.equal(date.$gte.toISOString(), '2026-12-01T00:00:00.000Z');
    assert.equal(date.$lte.toISOString(), '2026-12-31T23:59:59.999Z');
  });

  it('dateFrom posterior a dateTo responde 400', async () => {
    setupList();
    await assertAppError(service.getEvents({ dateFrom: '2026-12-31', dateTo: '2026-12-01' }), 400, /dateFrom no puede ser posterior/);
  });

  for (const value of ['2026-02-31', 'ayer', '2026-13-01']) {
    it(`una fecha inválida en el filtro (${value}) responde 400`, async () => {
      setupList();
      await assertAppError(service.getEvents({ dateFrom: value }), 400, /no es una fecha válida/);
    });
  }

  it('ordena por el campo pedido; con "-" es descendente', async () => {
    const spy = setupList();
    await service.getEvents({ sort: '-price,title' });
    assert.deepEqual(optionsOf(spy).sort, { price: -1, title: 1, _id: 1 });
  });

  it('no se puede ordenar por un campo interno: 400', async () => {
    setupList();
    await assertAppError(service.getEvents({ sort: 'password' }), 400, /No se puede ordenar/);
  });

  for (const [name, value] of [['page', '0'], ['page', 'abc'], ['page', '-1'], ['limit', '0'], ['limit', '51'], ['limit', '2.5']]) {
    it(`${name}=${value} responde 400`, async () => {
      setupList();
      await assertAppError(service.getEvents({ [name]: value }), 400, new RegExp(`parámetro ${name}`));
    });
  }

  it('limit=50 es el máximo permitido', async () => {
    setupList();
    const result = await service.getEvents({ limit: '50' });
    assert.equal(result.limit, 50);
  });

  it('operadores de MongoDB en la URL (?status[$ne]=x o parámetros repetidos) responden 400', async () => {
    setupList();
    await assertAppError(service.getEvents({ status: { $ne: 'published' } }), 400, /status no es válido/);
    await assertAppError(service.getEvents({ category: ['a', 'b'] }), 400, /category no es válido/);
    await assertAppError(service.getEvents({ page: ['1', '2'] }), 400, /page no es válido/);
  });

  it('un estado inexistente responde 400', async () => {
    setupList();
    await assertAppError(service.getEvents({ status: 'inventado' }), 400, /El estado debe ser uno de/);
  });

  it('los borradores: sin sesión 401, rol user 403, organizer solo los suyos, admin todos', async () => {
    const spy = setupList();
    await assertAppError(service.getEvents({ status: 'draft' }, undefined), 401, /iniciar sesión/);
    await assertAppError(service.getEvents({ status: 'draft' }, fakeUser('user')), 403, /No tenés permisos/);

    const organizer = fakeUser('organizer');
    await service.getEvents({ status: 'draft' }, organizer);
    assert.equal(spy.mock.calls[0].arguments[0].organizer, organizer.id);

    await service.getEvents({ status: 'draft' }, fakeUser('admin'));
    assert.equal(spy.mock.calls[1].arguments[0].organizer, undefined);
  });
});
