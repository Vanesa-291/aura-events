// Acá viven TODAS las reglas del negocio relacionadas a eventos: qué datos
// son válidos, qué cambios de estado se permiten, quién puede ver o
// modificar cada evento y cómo se arma un listado con filtros, paginación
// y orden. La consigna pide que esto esté en la capa de services (y no en
// las rutas ni en los controllers), así que ni el router ni el controller
// de eventos toman ninguna decisión: solo reciben, le pasan los datos a
// este archivo y devuelven lo que este archivo resuelve.
//
// Sobre los permisos, hay DOS niveles y es importante no confundirlos:
//
//   1) Permiso por ROL ("¿un user puede crear eventos?"): lo resuelve el
//      middleware authorize() en la ruta, ANTES de llegar acá. Si el rol
//      no alcanza, este código ni siquiera se ejecuta.
//
//   2) Permiso por PROPIEDAD ("¿este organizer puede tocar ESTE evento
//      en particular?"): no se puede decidir en un middleware genérico
//      porque hace falta mirar el evento en la base de datos para saber
//      de quién es. Por eso esa comprobación vive acá, en
//      assertCanManage().

import EventsRepository, { EVENT_STATUSES } from '../repositories/events.repository.js';
import { PERMISSIONS } from '../config/roles.config.js';
import { AppError } from '../utils/appError.js';

const repository = new EventsRepository();

// ============================================================================
// CONSTANTES
// ============================================================================

// Un id de MongoDB son 24 caracteres hexadecimales. Si llega otra cosa
// en la URL (por ejemplo /api/events/abc), respondemos 400 de entrada en
// vez de dejar que Mongoose falle al intentar convertirlo.
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

// Una fecha "sola", sin hora (por ejemplo 2026-12-31).
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Campos de texto que un evento necesita sí o sí.
const TEXT_FIELDS = ['title', 'description', 'category', 'location'];

// Un evento nuevo solo puede nacer como borrador o ya publicado. Nacer
// "cancelado" o "finalizado" no tiene sentido.
const CREATABLE_STATUSES = ['draft', 'published'];

// Qué cambios de estado se permiten. Cada estado lista a cuáles se puede
// pasar. 'cancelled' y 'finished' son estados finales: no tienen salida.
//
//   draft ──► published ──► finished
//     │           │
//     └───────────┴──► cancelled
const STATUS_TRANSITIONS = {
  draft: ['published', 'cancelled'],
  published: ['cancelled', 'finished'],
  cancelled: [],
  finished: [],
};

// Cómo se nombra cada estado en los mensajes de error.
const STATUS_LABELS = {
  draft: 'en borrador',
  published: 'publicado',
  cancelled: 'cancelado',
  finished: 'finalizado',
};
const FINAL_STATUS_LABELS = { cancelled: 'cancelado', finished: 'finalizado' };

// Valores del listado paginado.
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MAX_FILTER_TEXT_LENGTH = 100;

// Campos por los que se permite ordenar, y el orden por defecto (los
// eventos más próximos primero). Solo se aceptan estos campos para que
// nadie pueda pedir un orden raro por un campo interno.
const SORTABLE_FIELDS = ['date', 'price', 'title', 'capacity', 'createdAt'];
const DEFAULT_SORT = { date: 1 };

// ============================================================================
// FUNCIONES AUXILIARES: validar el cuerpo de un evento
// ============================================================================

// Valida y limpia los campos de un evento. Si "requireAll" es true (crear),
// exige que estén todos los obligatorios. Si es false (modificar), valida
// solo los que llegaron. Devuelve un objeto NUEVO con los datos ya
// limpios: los textos recortados, la fecha convertida a Date y los
// números como números.
//
// Fijate que solo se leen los campos de esta lista. Cualquier otro que
// venga en el body (organizer, status, _id...) simplemente se ignora,
// igual que pasa con "role" en el registro: el cliente no decide esos
// datos.
function parseEventFields(body, { requireAll }) {
  const input = body && typeof body === 'object' ? body : {};
  const data = {};

  for (const field of TEXT_FIELDS) {
    if (input[field] === undefined) continue;

    // .trim() para que un texto de puros espacios cuente como vacío.
    const value = typeof input[field] === 'string' ? input[field].trim() : '';
    if (!value) {
      throw new AppError(`El campo ${field} no puede estar vacío`, 400);
    }
    data[field] = value;
  }

  if (input.date !== undefined) {
    // Se exige un texto (por ejemplo "2026-12-01T10:00:00.000Z"). Sin esta
    // comprobación, new Date(null) daría una fecha válida de 1970.
    const date = typeof input.date === 'string' ? new Date(input.date) : null;
    if (!date || Number.isNaN(date.getTime())) {
      throw new AppError('La fecha del evento no es válida', 400);
    }
    data.date = date;
  }

  if (input.capacity !== undefined) {
    // Number.isInteger descarta decimales, textos, null, etc.
    if (!Number.isInteger(input.capacity) || input.capacity <= 0) {
      throw new AppError('La capacidad debe ser un número entero mayor a 0', 400);
    }
    data.capacity = input.capacity;
  }

  if (input.price !== undefined) {
    if (
      typeof input.price !== 'number' ||
      !Number.isFinite(input.price) ||
      input.price < 0
    ) {
      throw new AppError('El precio debe ser un número mayor o igual a 0', 400);
    }
    data.price = input.price;
  }

  if (requireAll) {
    const required = [...TEXT_FIELDS, 'date', 'capacity'];
    if (required.some((field) => data[field] === undefined)) {
      throw new AppError('Faltan campos obligatorios', 400);
    }
  }

  return data;
}

// ============================================================================
// FUNCIONES AUXILIARES: buscar eventos y controlar permisos
// ============================================================================

function assertValidId(id) {
  if (!OBJECT_ID_REGEX.test(id)) {
    throw new AppError('El id del evento no es válido', 400);
  }
}

async function findEventOrFail(id) {
  assertValidId(id);

  const event = await repository.findById(id);
  if (!event) {
    throw new AppError('Evento no encontrado', 404);
  }

  return event;
}

// ¿Esta persona puede gestionar este evento? Un admin puede con cualquiera;
// un organizer, solo con los que creó él. "user" es req.user (los datos
// que salieron del JWT) y puede ser undefined si quien consulta es un
// visitante sin sesión.
function canManage(event, user) {
  if (!user) return false;

  const canManageAny = PERMISSIONS.MANAGE_ANY_EVENT.includes(user.role);
  const isOwner = event.organizer && event.organizer.toString() === user.id;

  return canManageAny || Boolean(isOwner);
}

// Regla de propiedad: si no puede gestionarlo, 403.
function assertCanManage(event, user) {
  if (!canManage(event, user)) {
    throw new AppError('No tenés permisos sobre este evento', 403);
  }
}

// Los eventos cancelados y los finalizados no se modifican.
function assertNotInFinalStatus(event) {
  if (FINAL_STATUS_LABELS[event.status]) {
    throw new AppError(
      `No se puede modificar un evento ${FINAL_STATUS_LABELS[event.status]}`,
      409
    );
  }
}

// ============================================================================
// FUNCIONES AUXILIARES: leer los filtros del listado (query string)
// ============================================================================

// Lee un parámetro de texto. Devuelve undefined si no vino (o vino
// vacío). Si vino algo que NO es un texto (por ejemplo ?status[$ne]=x o
// ?page=1&page=2, que Express convierte en un objeto o una lista), responde
// 400. Esto es importante: sin esta comprobación, alguien podría colar
// operadores de MongoDB dentro de la búsqueda.
function readTextParam(query, name) {
  const value = query[name];
  if (value === undefined) return undefined;

  if (typeof value !== 'string') {
    throw new AppError(`El parámetro ${name} no es válido`, 400);
  }

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (trimmed.length > MAX_FILTER_TEXT_LENGTH) {
    throw new AppError(`El parámetro ${name} es demasiado largo`, 400);
  }

  return trimmed;
}

// Los textos de búsqueda se usan para armar una expresión regular, así
// que se "escapan" los caracteres especiales (como . o *) para que
// cuenten como letras comunes y no como parte de la expresión.
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseIntegerParam(query, name, defaultValue, max) {
  const value = readTextParam(query, name);
  if (value === undefined) return defaultValue;

  const number = /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isInteger(number) || number < 1 || (max && number > max)) {
    const range = max ? `entre 1 y ${max}` : 'mayor o igual a 1';
    throw new AppError(`El parámetro ${name} debe ser un entero ${range}`, 400);
  }

  return number;
}

// dateFrom y dateTo aceptan una fecha sola (2026-12-31) o con hora. Si es
// una fecha sola y es el límite superior (dateTo), se toma hasta el final
// de ese día, para que dateTo=2026-12-31 incluya los eventos del 31.
function parseDateParam(query, name, { endOfDay }) {
  const value = readTextParam(query, name);
  if (value === undefined) return undefined;

  const isDateOnly = DATE_ONLY_REGEX.test(value);
  const text = isDateOnly && endOfDay ? `${value}T23:59:59.999Z` : value;
  const date = new Date(text);

  const invalidDateError = new AppError(
    `El parámetro ${name} no es una fecha válida (usá el formato AAAA-MM-DD)`,
    400
  );

  if (Number.isNaN(date.getTime())) {
    throw invalidDateError;
  }

  // JavaScript es "generoso" con los días que no existen: 2026-02-31 lo
  // acomoda solo como 2 de marzo. Para fechas sin hora lo evitamos
  // comprobando que el día, vuelto a escribir, dé exactamente lo mismo.
  if (isDateOnly && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) !== value) {
    throw invalidDateError;
  }

  return date;
}

// sort=date → de menor a mayor. sort=-date → de mayor a menor. Se pueden
// pedir varios separados por coma: sort=-price,date.
function parseSort(query) {
  const value = readTextParam(query, 'sort');
  if (value === undefined) return DEFAULT_SORT;

  const sort = {};
  for (const part of value.split(',').map((item) => item.trim()).filter(Boolean)) {
    const descending = part.startsWith('-');
    const field = descending ? part.slice(1) : part;

    if (!SORTABLE_FIELDS.includes(field)) {
      throw new AppError(
        `No se puede ordenar por "${field}". Opciones: ${SORTABLE_FIELDS.join(', ')}`,
        400
      );
    }
    sort[field] = descending ? -1 : 1;
  }

  return Object.keys(sort).length > 0 ? sort : DEFAULT_SORT;
}

// Los borradores no son públicos. Quien pide ?status=draft tiene que tener
// sesión (401 si no), tiene que ser organizer o admin (403 si no) y, si es
// organizer, solo ve los suyos. El admin ve los de todos.
function restrictDraftListing(filter, user) {
  if (!user) {
    throw new AppError('Para consultar borradores tenés que iniciar sesión', 401);
  }

  if (!PERMISSIONS.MANAGE_OWN_EVENT.includes(user.role)) {
    throw new AppError('No tenés permisos para consultar borradores', 403);
  }

  if (!PERMISSIONS.MANAGE_ANY_EVENT.includes(user.role)) {
    filter.organizer = user.id;
  }
}

// ============================================================================
// EL SERVICE
// ============================================================================

class EventsService {
  // Listado con filtros, paginación y orden.
  //
  //   status          published (por defecto), cancelled, finished o draft
  //   category        coincidencia exacta, sin distinguir mayúsculas
  //   location        contiene el texto, sin distinguir mayúsculas
  //   dateFrom/dateTo rango de fechas del evento (ambos inclusivos)
  //   page / limit    paginación (por defecto página 1, 10 por página)
  //   sort            campo de orden (date, -date, price, ...)
  async getEvents(query = {}, user) {
    const filter = {};

    // Si no se pide un estado, se muestran solo los publicados: es lo que
    // espera ver el público.
    const status = readTextParam(query, 'status') ?? 'published';
    if (!EVENT_STATUSES.includes(status)) {
      throw new AppError(`El estado debe ser uno de: ${EVENT_STATUSES.join(', ')}`, 400);
    }
    filter.status = status;
    if (status === 'draft') {
      restrictDraftListing(filter, user);
    }

    const category = readTextParam(query, 'category');
    if (category) {
      filter.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
    }

    const location = readTextParam(query, 'location');
    if (location) {
      filter.location = new RegExp(escapeRegex(location), 'i');
    }

    const dateFrom = parseDateParam(query, 'dateFrom', { endOfDay: false });
    const dateTo = parseDateParam(query, 'dateTo', { endOfDay: true });
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new AppError('dateFrom no puede ser posterior a dateTo', 400);
    }
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = dateFrom;
      if (dateTo) filter.date.$lte = dateTo;
    }

    const page = parseIntegerParam(query, 'page', DEFAULT_PAGE);
    const limit = parseIntegerParam(query, 'limit', DEFAULT_LIMIT, MAX_LIMIT);

    // Se agrega _id como último criterio de orden para que, si dos eventos
    // empatan (misma fecha, por ejemplo), siempre queden en el mismo
    // orden. Sin esto, un evento podría repetirse o saltearse al pasar de
    // una página a la otra.
    const sort = { ...parseSort(query), _id: 1 };

    const { items, total } = await repository.findPaginated(filter, {
      sort,
      skip: (page - 1) * limit,
      limit,
    });

    return {
      data: items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Un evento por id. Es público, salvo los borradores: esos solo los ve
  // su organizer o un admin, y para cualquier otra persona responden como
  // si no existieran (404), para no revelar que están.
  async getEventById(id, user) {
    const event = await findEventOrFail(id);

    if (event.status === 'draft' && !canManage(event, user)) {
      throw new AppError('Evento no encontrado', 404);
    }

    return event;
  }

  // "user" es req.user: los datos que salieron del JWT ({ id, email,
  // role }). El organizador del evento SIEMPRE se toma de ahí — nunca del
  // body — para que nadie pueda crear un evento "a nombre de" otra
  // persona.
  async createEvent(body, user) {
    const data = parseEventFields(body, { requireAll: true });

    // No se crean eventos en el pasado.
    if (data.date < new Date()) {
      throw new AppError('La fecha del evento no puede ser pasada', 400);
    }

    // Estado inicial: borrador, salvo que se pida publicarlo ya.
    const requestedStatus = body ? body.status : undefined;
    if (requestedStatus !== undefined && !CREATABLE_STATUSES.includes(requestedStatus)) {
      throw new AppError(
        `Un evento nuevo solo puede crearse como: ${CREATABLE_STATUSES.join(' o ')}`,
        400
      );
    }

    return await repository.create({
      ...data,
      price: data.price ?? 0,
      status: requestedStatus ?? 'draft',
      organizer: user.id,
    });
  }

  // Modifica los datos del evento (no su estado: eso lo hace
  // updateEventStatus). Actualiza solo los campos que lleguen.
  async updateEvent(id, body, user) {
    const event = await findEventOrFail(id);

    assertCanManage(event, user);
    assertNotInFinalStatus(event);

    const changes = parseEventFields(body, { requireAll: false });
    if (Object.keys(changes).length === 0) {
      throw new AppError('No hay campos válidos para actualizar', 400);
    }

    return await repository.update(id, changes);
  }

  // Cambia el estado del evento respetando STATUS_TRANSITIONS. Cancelar un
  // evento es esto mismo: pasar a 'cancelled'. Nunca se borra nada de la
  // base de datos.
  async updateEventStatus(id, body, user) {
    assertValidId(id);

    const newStatus = body ? body.status : undefined;
    if (typeof newStatus !== 'string' || !EVENT_STATUSES.includes(newStatus)) {
      throw new AppError(`El estado debe ser uno de: ${EVENT_STATUSES.join(', ')}`, 400);
    }

    const event = await findEventOrFail(id);
    assertCanManage(event, user);

    if (event.status === newStatus) {
      throw new AppError(`El evento ya está ${STATUS_LABELS[newStatus]}`, 409);
    }

    // Un evento cancelado o finalizado no vuelve atrás.
    if (FINAL_STATUS_LABELS[event.status]) {
      const label = FINAL_STATUS_LABELS[event.status];
      const message =
        newStatus === 'published'
          ? `No se puede publicar un evento ${label}`
          : `No se puede cambiar el estado de un evento ${label}`;
      throw new AppError(message, 409);
    }

    if (!STATUS_TRANSITIONS[event.status].includes(newStatus)) {
      throw new AppError(
        `No se puede pasar un evento de "${event.status}" a "${newStatus}"`,
        409
      );
    }

    return await repository.updateStatus(id, newStatus);
  }
}

export default EventsService;
