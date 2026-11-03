// Acá vive la definición de los roles y de la matriz de permisos de Aura
// Events. Está en un archivo propio por una razón muy concreta: la
// consigna pide NO escribir los roles "a mano" adentro de las rutas
// (algo como authorize('admin') regado por todo el proyecto), porque si
// un día cambia una regla (por ejemplo, que los organizadores también
// puedan ver la lista de usuarios), habría que ir a buscar esa palabra
// en cada archivo. Con esta definición central, ese cambio se hace en un
// solo lugar y el resto del código se entera solo.
//
// Esta tabla es la versión "en código" de la matriz de permisos que
// también está explicada en el README:
//
//   Acción                              user   organizer   admin
//   Consultar eventos publicados         ✅        ✅         ✅
//   Crear eventos                        ❌        ✅         ✅
//   Modificar/cancelar eventos propios   ❌        ✅         ✅
//   Modificar cualquier evento           ❌        ❌         ✅
//   Ver todos los usuarios               ❌        ❌         ✅
//   Inscribirse y cancelar tickets propios  ✅     ✅         ✅
//   Ver los tickets de un evento         ❌   solo de los suyos  ✅
//   Cancelar el ticket de otra persona   ❌        ❌         ✅

// Object.freeze evita que alguien, por accidente, modifique estos
// valores mientras el servidor está corriendo.
export const ROLES = Object.freeze({
  USER: 'user',
  ORGANIZER: 'organizer',
  ADMIN: 'admin',
});

// Cada permiso es una lista con los roles que tienen derecho a hacer esa
// acción. Las rutas le pasan la lista al middleware authorize(), y los
// services la usan cuando necesitan preguntar "¿este rol puede hacer
// tal cosa?".
export const PERMISSIONS = Object.freeze({
  VIEW_PUBLISHED_EVENTS: Object.freeze([ROLES.USER, ROLES.ORGANIZER, ROLES.ADMIN]),
  CREATE_EVENT: Object.freeze([ROLES.ORGANIZER, ROLES.ADMIN]),
  MANAGE_OWN_EVENT: Object.freeze([ROLES.ORGANIZER, ROLES.ADMIN]),
  MANAGE_ANY_EVENT: Object.freeze([ROLES.ADMIN]),
  VIEW_ALL_USERS: Object.freeze([ROLES.ADMIN]),
  // Tickets (Pre-entrega 7). Inscribirse y ver los propios tickets lo puede
  // hacer cualquier persona con sesión, así que no necesitan permiso por rol.
  VIEW_EVENT_TICKETS: Object.freeze([ROLES.ORGANIZER, ROLES.ADMIN]),
  MANAGE_ANY_TICKET: Object.freeze([ROLES.ADMIN]),
});
