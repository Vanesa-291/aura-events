# Aura Events

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)
![ESM](https://img.shields.io/badge/Módulos-ESM-F7DF1E?style=flat-square&logo=javascript&logoColor=black)

---

## Entrega final

Esta es la **versión final e integrada** de la API: reúne todo lo construido en las pre-entregas anteriores (más las mejoras posteriores a sus correcciones) en una arquitectura por capas. Permite:

- **Registrar usuarios, iniciar sesión, consultar el usuario actual y cerrar sesión**, con Passport (estrategias `register`, `login` y `current`) y un JWT guardado en una cookie `httpOnly`. Ninguna respuesta expone la contraseña.
- **Proteger rutas y usar roles** (`user`, `organizer`, `admin`): `401` sin sesión y `403` sin el permiso necesario.
- **Gestionar eventos**: crear, listar, ver, modificar y cambiar de estado, con validaciones y **filtros, paginación y orden** en el listado.
- **Inscribirse a eventos con control de cupos** (el cupo se controla con una transacción de MongoDB, así que pedidos simultáneos nunca venden de más) y **cancelar inscripciones** sin borrarlas.
- **Enviar un email de confirmación** con Nodemailer; las credenciales viven solo en variables de entorno.
- Código organizado en **capas**: `routes`, `controllers`, `services`, `repositories`, `dao`, `dto`, `models`, `middlewares`, `utils` y `config`. Los modelos de Mongoose solo se importan en los DAOs.
- **Tests automáticos** con `npm test`, sin base de datos.

**Para probarla rápido**

1. `npm install` (ver [Instalación](#instalación)).
2. Copiar `.env.example` a `.env` y completarlo (ver [Configuración de variables de entorno](#configuración-de-variables-de-entorno)).
3. `npm run dev` para levantar el servidor en `http://localhost:8080` (ver [Cómo ejecutar](#cómo-ejecutar)).
4. Registrar usuarios por la API y asignarles rol con `npm run set-role` (ver [Roles y autorización](#roles-y-autorización)).
5. Probar el recorrido completo con las rutas de [Rutas disponibles](#rutas-disponibles) y los casos de las secciones *Casos a probar*, o correr `npm test` (ver [Tests automáticos](#tests-automáticos)).

---

## Temática elegida

**Aura Events** es una plataforma para la gestión de eventos e inscripciones. Permite crear y administrar eventos, inscribirse a ellos con control de cupos y recibir un email de confirmación.

La Pre-entrega 1 estableció la base arquitectónica del backend: un servidor Express organizado por capas, listo para crecer sin necesidad de reordenar nada más adelante.

La Pre-entrega 2 sumó el primer flujo real de usuarios: el registro seguro, con validaciones, contraseñas protegidas con bcrypt y persistencia en MongoDB. Tras la corrección se afinaron dos detalles: ahora se rechaza un nombre compuesto solo por espacios en blanco, y un posible choque de emails duplicados ocurridos casi al mismo instante (registros simultáneos) también se maneja de forma prolija (409), en vez de terminar en un error de servidor (500).

La Pre-entrega 3 sumó la autenticación completa: login, generación de JWT, una cookie de sesión `httpOnly`, una ruta protegida para saber quién es el usuario autenticado, y logout. Tras la corrección se ajustó un detalle: la duración de la cookie de sesión ahora se calcula automáticamente a partir de `JWT_EXPIRES_IN`, en vez de estar escrita a mano por separado — así token y cookie quedan siempre sincronizados.

La Pre-entrega 4 no agrega funcionalidad nueva de cara afuera (las rutas y las respuestas son exactamente las mismas): refactoriza la organización interna de la autenticación para que pase por **Passport.js**, centralizando en un único archivo (`src/config/passport.config.js`) la lógica de registro, login y verificación de la sesión actual. Esto deja el proyecto preparado para, en una entrega futura, sumar proveedores externos de login (Google, GitHub, etc.) sin tener que tocar `app.js` ni las rutas existentes.

La Pre-entrega 5 suma **roles y autorización**: ya no alcanza con iniciar sesión, cada acción se valida según el rol del usuario (`user`, `organizer` o `admin`). Hay una matriz de permisos definida en un solo lugar, dos middlewares reutilizables (uno que responde **401** si no hay sesión y otro que responde **403** si el rol no alcanza), rutas protegidas para crear y gestionar eventos, una ruta administrativa, y una regla de propiedad: un organizer solo puede modificar o cancelar sus propios eventos.

La Pre-entrega 6 construye la **entidad central del proyecto: los eventos**. El modelo `Event` se completa (categoría, precio, estado y organizador como referencia a un usuario) y se arma el CRUD con reglas de negocio en la capa de services: no se crean eventos con fecha pasada, los estados solo cambian por caminos permitidos (un evento cancelado o finalizado no vuelve atrás), y cancelar nunca borra nada de la base de datos. El listado público ahora admite filtros (estado, categoría, lugar, rango de fechas), paginación y ordenamiento. Los eventos que antes se modificaban con `PATCH /api/events/:id` y `PATCH /api/events/:id/cancel` ahora se manejan con `PUT /api/events/:id` y `PATCH /api/events/:id/status`, como pide el contrato de esta entrega; el campo `createdBy` pasó a llamarse `organizer`.

La Pre-entrega 7 suma el **flujo de inscripciones**: una nueva entidad `Ticket` relaciona a cada usuario con un evento (solo con referencias, sin objetos embebidos). Quien tiene sesión iniciada puede inscribirse a un evento publicado, y el service controla que el evento exista y esté publicado, que la cantidad sea válida, que haya cupo suficiente (solo cuentan los tickets activos: los cancelados liberan su lugar) y que no haya inscripciones duplicadas. Cada ticket se puede cancelar sin borrarlo, hay un listado de "mis tickets" para cada persona y otro de los tickets de cada evento para su organizer o un admin, y al confirmarse una inscripción se envía un email con **Nodemailer**, con las credenciales en variables de entorno.

La Pre-entrega 8 no agrega endpoints ni cambia cómo se consume la API: **refactoriza la arquitectura** en capas formales. El acceso a datos queda separado en **DAOs** (los únicos que importan los modelos de Mongoose) y **repositories** (que hablan en el lenguaje del dominio), los services concentran toda la lógica de negocio sin tocar modelos ni DAOs, los controllers solo coordinan request y response, y los **DTO** controlan exactamente qué datos de usuarios, eventos y tickets viajan en cada respuesta, sin exponer nunca el `password`, ni siquiera hasheado. Se explica en detalle en la sección [Arquitectura en capas](#arquitectura-en-capas).

**Ajustes tras la corrección de la Pre-entrega 7.** El profesor señaló dos mejoras sobre las inscripciones y se resolvieron sin cambiar endpoints ni respuestas (salvo el nuevo `409` por fecha): (1) ahora el service también valida la **fecha real del evento** —un evento que sigue en estado `published` pero cuya fecha ya pasó rechaza inscripciones—, y (2) el control de cupos pasó a una **transacción de MongoDB** que bloquea el evento mientras se cuenta el cupo y se guarda el ticket, de modo que dos pedidos simultáneos por el último lugar ya no terminan los dos cancelados: siempre queda exactamente una reserva (ver [Regla de cupos](#regla-de-cupos)).

---

## Tecnologías utilizadas

| Tecnología | Uso |
|---|---|
| Node.js (ESM) | Entorno de ejecución |
| Express | Servidor HTTP y enrutamiento |
| MongoDB Atlas | Base de datos |
| Mongoose | Modelado de datos sobre MongoDB |
| dotenv | Variables de entorno |
| bcryptjs | Hasheo seguro de contraseñas |
| jsonwebtoken | Generación y verificación de JWT |
| cookie-parser | Lectura de cookies en las peticiones |
| passport | Organización de la autenticación en estrategias reutilizables |
| passport-custom | Estrategia de Passport con control total sobre la validación (en vez de depender del formato fijo de usuario/contraseña de `passport-local`) |
| ms | Convierte strings tipo `"1h"` o `"15m"` a milisegundos, para que la cookie de sesión dure lo mismo que el JWT |
| nodemailer | Envío del email de confirmación de inscripción |

---

## Instalación

```bash
git clone https://github.com/Vanesa-291/aura-events.git
cd aura-events
npm install
```

---

## Configuración de variables de entorno

Copiá el archivo de ejemplo:

```bash
copy .env.example .env
```

Y completá `.env` con tus propios valores:

```env
PORT=8080
NODE_ENV=development
MONGO_URL=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/<basededatos>
JWT_SECRET=una_clave_secreta_larga_y_dificil_de_adivinar
JWT_EXPIRES_IN=1h
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=tu_usuario_smtp
MAIL_PASS=tu_contraseña_smtp
MAIL_FROM="Aura Events" <no-reply@auraevents.com>
```

| Variable | Descripción |
|---|---|
| `PORT` | Puerto en el que corre el servidor |
| `NODE_ENV` | Entorno de ejecución (`development` / `production`). En `production`, la cookie de sesión exige HTTPS |
| `MONGO_URL` | Cadena de conexión a MongoDB Atlas |
| `JWT_SECRET` | Clave secreta con la que se firman los JWT. Nunca se escribe en el código, solo acá |
| `JWT_EXPIRES_IN` | Cuánto dura un token antes de vencer (formato tipo `1h`, `15m`, `7d`) |
| `MAIL_HOST` | Servidor SMTP con el que se envían los emails de confirmación |
| `MAIL_PORT` | Puerto del servidor SMTP (un número, por ejemplo `2525`, `587` o `465`) |
| `MAIL_USER` | Usuario del servidor SMTP |
| `MAIL_PASS` | Contraseña del servidor SMTP. Nunca se escribe en el código, solo acá |
| `MAIL_FROM` | Remitente que aparece en los emails (por ejemplo `"Aura Events" <no-reply@auraevents.com>`) |

Las cinco variables `MAIL_*` no son obligatorias para arrancar: si faltan, el servidor levanta igual, avisa en la consola y las inscripciones funcionan, pero no se envía el email de confirmación. Cómo conseguirlas (por ejemplo con Mailtrap) está explicado en [Emails con Nodemailer](#emails-con-nodemailer).

El archivo `.env` nunca se sube al repositorio — está excluido en `.gitignore`. `.env.example` queda como guía de qué configurar.

---

## Cómo ejecutar

```bash
npm start       # modo normal
npm run dev     # se reinicia solo al guardar cambios
npm test        # corre los tests automáticos (no necesita base de datos)
```

Y una herramienta de administración para asignar roles (ver la sección [Roles y autorización](#roles-y-autorización)):

```bash
npm run set-role -- ana@mail.com organizer
```

Y, opcionalmente, una para cargar eventos de ejemplo y poder probar el listado con filtros y paginación (ver la sección [Eventos](#eventos--entidad-central-y-lógica-de-negocio)):

```bash
npm run seed-events -- ana@mail.com
```

El servidor queda disponible en `http://localhost:8080` (o el puerto que hayas configurado).

---

## Estructura de carpetas

```
aura-events/
├── src/
│   ├── config/
│   │   ├── env.config.js      # valida las variables necesarias (y lee las de correo, que son opcionales)
│   │   ├── db.js              # conexión a MongoDB
│   │   ├── passport.config.js # estrategias 'register', 'login' y 'current', centralizadas
│   │   └── roles.config.js    # ROLES y PERMISSIONS: la matriz de permisos en código
│   ├── routes/
│   │   ├── health.router.js
│   │   ├── events.router.js         # rutas de eventos, con authenticate + authorize
│   │   ├── tickets.router.js        # rutas de inscripciones (se monta en /api)
│   │   ├── users.router.js          # ruta administrativa (solo admin)
│   │   └── sessions.router.js       # las rutas de auth delegan en passport.authenticate(...)
│   ├── controllers/
│   │   ├── health.controller.js
│   │   ├── events.controller.js
│   │   ├── tickets.controller.js
│   │   ├── users.controller.js
│   │   └── sessions.controller.js   # genera el JWT y setea la cookie tras el login
│   ├── services/
│   │   ├── events.service.js        # reglas de negocio de eventos: validaciones, estados, propiedad, filtros y paginación
│   │   ├── tickets.service.js       # reglas de inscripciones: estado del evento, cupos, duplicados, cancelación
│   │   ├── mail.service.js          # envío de emails con Nodemailer
│   │   ├── users.service.js
│   │   └── sessions.service.js      # registerUser y validateCredentials (sin saber nada de JWT)
│   ├── repositories/
│   │   ├── events.repository.js     # operaciones del dominio de eventos (findPaginated, updateStatus...)
│   │   ├── tickets.repository.js    # countActiveTickets, countOccupiedSeats, cancelTicket...
│   │   └── users.repository.js      # findByEmail, findAll...
│   ├── dao/
│   │   ├── events.dao.js            # única capa que importa el modelo Event
│   │   ├── tickets.dao.js           # única capa que importa el modelo Ticket
│   │   ├── transaction.dao.js       # ejecuta un trabajo dentro de una transacción de Mongo
│   │   └── users.dao.js             # única capa que importa el modelo User
│   ├── dto/
│   │   ├── dto.helpers.js           # herramientas compartidas (lista blanca de campos, populate)
│   │   ├── user.dto.js              # UserDTO y CurrentUserDTO (nunca exponen password)
│   │   ├── event.dto.js             # EventDTO
│   │   └── ticket.dto.js            # TicketDTO (filtra también el user y el event de un populate)
│   ├── models/
│   │   ├── User.js                  # first_name, last_name, email, password, role
│   │   ├── Event.js                 # title, description, category, date, location, capacity, price, status, organizer
│   │   └── Ticket.js                # user, event, status, quantity, reservationCode, cancelledAt (solo referencias)
│   ├── middlewares/
│   │   ├── auth.middleware.js       # authenticate (→ 401) y authenticateOptional (para rutas públicas)
│   │   ├── authorize.middleware.js  # authorize(...roles): compara el rol → 403
│   │   ├── notFound.middleware.js
│   │   └── errorHandler.middleware.js
│   ├── utils/
│   │   ├── asyncHandler.js
│   │   ├── appError.js              # errores con status code (400, 409, etc.)
│   │   ├── hash.js                  # hashPassword / comparePassword (bcrypt)
│   │   └── jwt.js                   # signToken / verifyToken (JWT)
│   ├── app.js                 # arma la aplicación de Express e inicializa Passport (sin levantarla)
│   └── server.js              # valida el entorno, conecta la base y levanta el servidor
├── tests/
│   ├── helpers/               # datos de mentira y variables de entorno de prueba
│   ├── tickets.service.test.js  # inscripciones, cupos, carrera, email y cancelación
│   ├── events.service.test.js   # reglas de eventos, permisos y listado con filtros
│   └── dto.test.js              # lo que se muestra (y lo que nunca se muestra) en las respuestas
├── scripts/
│   ├── set-role.js            # herramienta de línea de comandos para asignar roles
│   └── seed-events.js         # carga eventos de ejemplo (opcional, para probar el listado)
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

**Cómo fluye una petición:**

```
Router → Controller → Service → Repository → DAO → Model (Mongoose) → MongoDB
```

Cada capa hace una sola cosa: el router solo conecta una URL con su controlador, el controlador traduce entre HTTP y el resto del sistema, el service concentra las reglas del negocio, el repository habla en el lenguaje del dominio, y el DAO es el único lugar que conversa directamente con la base de datos. La explicación completa está en la sección siguiente.

---

## Arquitectura en capas

La Pre-entrega 8 no agrega endpoints ni cambia ninguna respuesta de la API: ordena el código en **capas formales**, cada una con una sola responsabilidad. Así, un cambio en una capa (por ejemplo, cambiar de base de datos o agregar un campo a una respuesta) no obliga a tocar las demás.

```
Router → Controller → Service → Repository → DAO → Model (Mongoose) → MongoDB
                │
                └── DTO (da forma a la respuesta antes de enviarla)
```

### Responsabilidad de cada capa

| Capa | Carpeta | Qué hace | Qué NO hace |
|---|---|---|---|
| **Router** | `src/routes/` | Conecta cada URL con su controller y le pone los middlewares (`authenticate`, `authorize`) | No tiene lógica |
| **Controller** | `src/controllers/` | Coordina request/response: lee `body`, `params` y `query`, llama al service y devuelve la respuesta pasando el resultado por el DTO | No calcula cupos, no valida estados, no resuelve reglas de negocio, no importa modelos |
| **Service** | `src/services/` | Concentra **toda la lógica de negocio**: validación de cupos, estados, duplicados, permisos sobre recursos propios y envío de email | No importa modelos ni DAOs: siempre trabaja a través de repositories |
| **Repository** | `src/repositories/` | Traduce las preguntas del dominio a operaciones de datos (`findByEmail`, `countActiveTickets`, `countOccupiedSeats`, `cancelTicket`...) usando el DAO | No importa modelos |
| **DAO** | `src/dao/` | Es la **única capa que importa los modelos de Mongoose** y habla con la base. Solo tiene operaciones genéricas de acceso a datos | No tiene reglas de negocio ni nombres del dominio |
| **DTO** | `src/dto/` | Define qué campos de usuario, evento y ticket viajan en cada respuesta | No consulta la base ni toma decisiones |

### DAO y Repository de cada entidad

| Entidad | DAO (acceso genérico a datos) | Repository (lenguaje del dominio) |
|---|---|---|
| Usuario | `UsersDAO`: `create`, `findById`, `findOne`, `findAll` | `UsersRepository`: `create`, `findById`, `findByEmail`, `findAll` |
| Evento | `EventsDAO`: `create`, `findById`, `find`, `count`, `update`, `lock` | `EventsRepository`: `create`, `findById`, `findPaginated`, `update`, `updateStatus`, `lock` |
| Ticket | `TicketsDAO`: `create`, `findById`, `find`, `count`, `sum`, `updateOne` | `TicketsRepository`: `transaction`, `create`, `findById`, `findByUser`, `findByEvent`, `countActiveTickets`, `countOccupiedSeats`, `cancelTicket` |

Un ejemplo de cómo se reparten el trabajo: el DAO solo sabe **contar** tickets que cumplan un filtro y **sumar** un campo; el repository sabe que "ticket activo" quiere decir `confirmed` o `pending` y arma con eso `countActiveTickets` y `countOccupiedSeats`; y el service decide qué hacer con el número (rechazar con `409` si no hay cupo).

Las **transacciones** también son acceso a la base, así que las maneja el DAO: `transaction.dao.js` ofrece `runInTransaction(trabajo)`, que ejecuta una función como una sola unidad (todo o nada) y le entrega un objeto opaco `tx`. Las capas de arriba no saben qué es: solo se lo pasan a las operaciones que deben formar parte de la transacción (`create`, `count` y `sum` de tickets, y `lock` de eventos aceptan un `tx` opcional; sin él funcionan como siempre). El service accede a esto a través de `TicketsRepository.transaction`, sin importar Mongoose.

Los estados válidos (`EVENT_STATUSES`, `TICKET_STATUSES`) viven junto a cada modelo, y llegan al service pasando por el DAO y el repository, para que el service no tenga que importar modelos.

Los scripts de `scripts/` (`set-role.js` y `seed-events.js`) son herramientas de línea de comandos que se ejecutan a mano, fuera de la API, y por eso no forman parte de estas capas.

### DTO: qué se muestra en cada respuesta

Cada DTO funciona como una **lista blanca**: solo salen los campos que se nombran, y todo lo demás (por ejemplo `password`) se queda adentro, aunque el documento de la base lo tenga. El campo interno `__v` de Mongoose tampoco se expone.

| DTO | Se usa en | Campos |
|---|---|---|
| `UserDTO` | `POST /api/sessions/register`, `GET /api/users` | `_id`, `first_name`, `last_name`, `email`, `role`, `createdAt`, `updatedAt` |
| `CurrentUserDTO` | `GET /api/sessions/current` | `id`, `email`, `role`, `iat`, `exp` (los datos del token) |
| `EventDTO` | todos los endpoints de eventos | `_id`, `title`, `description`, `category`, `date`, `location`, `capacity`, `price`, `status`, `organizer`, `createdAt`, `updatedAt` |
| `TicketDTO` | todos los endpoints de tickets | `_id`, `user`, `event`, `status`, `quantity`, `reservationCode`, `cancelledAt`, `createdAt`, `updatedAt` |

**Con `populate`, el DTO también filtra el documento relacionado.** En `GET /api/tickets/my-tickets` el `event` llega con solo `_id`, `title`, `date` y `location`; en `GET /api/events/:eid/tickets` el `user` llega con solo `_id`, `first_name`, `last_name` y `email`. Nunca viajan el `password` ni el `role` de otra persona. Si un campo no viene completado (sin `populate`), sigue siendo solo el id.

### Manejo de errores

Hay un único middleware centralizado (`src/middlewares/errorHandler.middleware.js`). Los services y los middlewares lanzan un `AppError` con su código y el handler arma siempre el mismo formato de respuesta, en toda la API:

```json
{
  "status": "error",
  "message": "Descripción del problema"
}
```

| Código | Significa | Ejemplo |
|---|---|---|
| `400` | Datos inválidos | `quantity` en `0`, id con formato inválido, JSON mal formado |
| `401` | No autenticado | Pedir `GET /api/tickets/my-tickets` sin sesión |
| `403` | Sin permisos | Un `user` pidiendo los tickets de un evento, o cancelando el ticket de otra persona |
| `404` | No encontrado | Evento o ticket inexistente, o una ruta que no existe |
| `409` | Conflicto con el estado actual | Inscripción duplicada, cupo agotado, evento cancelado |
| `500` | Error interno | Algo que no se previó: se responde con un mensaje genérico y el detalle real queda solo en la consola del servidor |

### El recorrido de una inscripción por todas las capas

`POST /api/events/:eid/tickets`, paso a paso:

1. **Router** (`tickets.router.js`): pasa por `authenticate` (sin sesión, responde `401`) y llama al controller.
2. **Controller** (`createTicket`): toma `eid` de la URL, `quantity` del body y el usuario de la sesión, y llama al service. No decide nada.
3. **Service** (`TicketsService.createTicket`): verifica que el evento exista, esté publicado y no haya pasado de fecha, y que la cantidad sea válida; después abre una transacción que bloquea el evento y, ya dentro, comprueba que no haya un ticket activo duplicado y que haya cupo. Para cada consulta le habla al repository.
4. **Repository** (`EventsRepository.findById` y `lock`, `TicketsRepository.transaction`, `countActiveTickets`, `countOccupiedSeats` y `create`): convierte cada pregunta en operaciones de datos.
5. **DAO** (`findById`, `lock`, `runInTransaction`, `count`, `sum` y `create`): ejecuta las consultas contra Mongoose.
6. **De vuelta en el service**: la transacción ya guardó el ticket (sin comprobaciones posteriores, porque nadie pudo colarse en el medio) y recién entonces se envía el email de confirmación.
7. **Controller**: arma la respuesta `201` pasando el ticket por `TicketDTO`.

### Comportamiento de la API

Todas las rutas existentes (sesiones, usuarios, eventos y tickets) responden exactamente igual que antes: mismos métodos, mismas URLs, mismos códigos HTTP y mismos mensajes. Lo único que cambió en las respuestas es que ya no incluyen `__v`, el contador interno de versiones de Mongoose. No hace falta cambiar nada en cómo se consume la API.

### Casos a probar (con Thunder Client)

| # | Caso | Resultado esperado |
|---|---|---|
| 1 | Flujo completo: registro → login → crear evento → inscribirse → consultar mis tickets → cancelar | Todo responde bien, con los códigos de siempre (`201`, `200`, `201`, `201`, `200`, `200`) |
| 2 | `GET /api/sessions/current` con sesión | `200` con `id`, `email`, `role`, `iat` y `exp`, sin `password` |
| 3 | `GET /api/events/:eid/tickets` como organizer dueño, y `GET /api/tickets/my-tickets` | Cada persona o evento relacionado llega solo con los campos permitidos, sin `password` |
| 4 | Inscribirse a un evento cancelado | `409` con un mensaje claro, nunca `500` |
| 5 | Pedir un endpoint protegido sin sesión; y con sesión pero sin el rol necesario | `401` sin sesión; `403` con sesión sin permisos |
| 6 | Inscribirse a un evento `published` cuya fecha ya pasó | `409` `No se puede inscribir a un evento cuya fecha ya pasó` |
| 7 | Evento con 1 solo lugar y varios pedidos simultáneos de personas distintas | Exactamente un `201`; el resto responde `409` (cupo agotado) |

---

## Rutas disponibles

| Método | Ruta | Descripción | Respuesta |
|---|---|---|---|
| `GET` | `/api/health` | Confirma que el servidor está activo | `{ "status": "ok", "message": "Servidor activo" }` |
| `GET` | `/api/events` | Lista eventos con filtros, paginación y orden. Pública | `{ "status": "success", "data": [...], "page", "limit", "total", "totalPages" }` |
| `GET` | `/api/events/:id` | Devuelve un evento. Pública (los borradores solo los ve su organizer o un admin) | `{ "status": "success", "payload": {...} }` |
| `POST` | `/api/events` | Crea un evento. Solo `organizer` o `admin` | Ver [Eventos](#eventos--entidad-central-y-lógica-de-negocio) |
| `PUT` | `/api/events/:id` | Modifica los datos de un evento. Dueño del evento o `admin` | Ver [Eventos](#eventos--entidad-central-y-lógica-de-negocio) |
| `PATCH` | `/api/events/:id/status` | Cambia el estado de un evento (publicar, cancelar, finalizar). Dueño del evento o `admin` | Ver [Eventos](#eventos--entidad-central-y-lógica-de-negocio) |
| `POST` | `/api/events/:eid/tickets` | Inscribe a quien tiene la sesión iniciada a un evento publicado, con control de cupos. Envía email de confirmación | Ver [Tickets](#tickets-e-inscripciones--cupos-y-notificaciones-por-email) |
| `GET` | `/api/events/:eid/tickets` | Tickets de un evento y resumen del cupo. `organizer` del evento o `admin` | Ver [Tickets](#tickets-e-inscripciones--cupos-y-notificaciones-por-email) |
| `GET` | `/api/tickets/my-tickets` | Tickets de quien tiene la sesión iniciada, con título, fecha y lugar del evento | Ver [Tickets](#tickets-e-inscripciones--cupos-y-notificaciones-por-email) |
| `PATCH` | `/api/tickets/:tid/cancel` | Cancela un ticket (no lo borra). Dueño del ticket o `admin` | Ver [Tickets](#tickets-e-inscripciones--cupos-y-notificaciones-por-email) |
| `GET` | `/api/users` | Lista todos los usuarios, sin contraseñas. Solo `admin` | Ver [Roles y autorización](#roles-y-autorización) |
| `GET` | `/api/sessions` | Confirma que el módulo de sesiones está activo | `{ "status": "success", "message": "..." }` |
| `POST` | `/api/sessions/register` | Registra un usuario nuevo | Ver detalle abajo |
| `POST` | `/api/sessions/login` | Inicia sesión y setea la cookie de autenticación | Ver detalle abajo |
| `GET` | `/api/sessions/current` | Devuelve los datos del usuario autenticado (ruta protegida) | Ver detalle abajo |
| `POST` | `/api/sessions/logout` | Cierra la sesión (borra la cookie) | Ver detalle abajo |

---

## Registro de usuarios — `POST /api/sessions/register`

### Campos que espera (todos obligatorios)

| Campo | Tipo | Reglas |
|---|---|---|
| `first_name` | string | No puede estar vacío |
| `last_name` | string | No puede estar vacío |
| `email` | string | Formato de email válido; se normaliza (espacios afuera y minúsculas) antes de guardar; no puede repetirse |
| `password` | string | Mínimo 6 caracteres |

No hay que enviar `role`: todo usuario que se registra por esta vía entra siempre como `user`. Aunque se mande `role` en el body, el servidor lo ignora — no es un campo que se pueda manipular desde el registro público.

### Ejemplo de petición

```json
POST /api/sessions/register
Content-Type: application/json

{
  "first_name": "Ana",
  "last_name": "Pérez",
  "email": "Ana@Mail.com ",
  "password": "Secreta123"
}
```

### Respuesta 201 — registro exitoso

Notá que el email quedó normalizado (minúsculas, sin espacios) y que **no aparece la contraseña en ningún lado de la respuesta**, ni en texto plano ni hasheada:

```json
{
  "status": "success",
  "payload": {
    "_id": "665f2a...",
    "first_name": "Ana",
    "last_name": "Pérez",
    "email": "ana@mail.com",
    "role": "user",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### Respuestas de error

| Situación | Status | Respuesta |
|---|---|---|
| Falta algún campo obligatorio | `400` | `{ "status": "error", "message": "Faltan campos obligatorios" }` |
| El email no tiene formato válido | `400` | `{ "status": "error", "message": "El formato del email no es válido" }` |
| La contraseña tiene menos de 6 caracteres | `400` | `{ "status": "error", "message": "La contraseña debe tener al menos 6 caracteres" }` |
| El email ya está registrado | `409` | `{ "status": "error", "message": "El email ya está registrado" }` |

### Cómo probarlo (con Thunder Client, o cualquier cliente HTTP similar)

1. Levantá el servidor con `npm run dev` (o `npm start`).
2. Creá una petición `POST` a `http://localhost:8080/api/sessions/register` (cambiá el puerto si usás otro).
3. En el body, elegí `JSON` y escribí a mano (no pegues, para evitar comillas raras) algo como el ejemplo de arriba.
4. Casos que conviene probar, en este orden:
   - **Registro exitoso**: con datos válidos → esperás un `201`.
   - **Campos faltantes**: sacá algún campo (por ejemplo `last_name`) → esperás un `400`.
   - **Email inválido**: probá con algo como `"anamail.com"` (sin arroba) → esperás un `400`.
   - **Email duplicado**: repetí la misma petición del registro exitoso una segunda vez → esperás un `409`.
5. Para confirmar que la contraseña está bien protegida: entrá a MongoDB Atlas → tu cluster → "Browse Collections" → colección `users`, y mirá el documento creado. El campo `password` tiene que verse como un texto largo y sin sentido (el hash), nunca la contraseña que escribiste.

---

## Autenticación — login, current y logout

### Organización interna con Passport.js

Desde la Pre-entrega 4, toda la autenticación pasa por **tres estrategias de Passport**, centralizadas en `src/config/passport.config.js`. El contrato externo (rutas, status codes, forma de las respuestas) es idéntico al de la Pre-entrega 3 — lo que cambió es cómo está organizado el código por dentro:

| Estrategia | Se usa en | Qué hace |
|---|---|---|
| `register` | `POST /api/sessions/register` | Llama a `sessionsService.registerUser()`: valida los campos, normaliza el email, hashea la contraseña y rechaza duplicados. Si todo sale bien, deja el usuario recién creado en `req.user` |
| `login` | `POST /api/sessions/login` | Llama a `sessionsService.validateCredentials()`: valida que el email y la contraseña correspondan a un usuario real, con el mismo mensaje genérico (`"Credenciales inválidas"`) tanto si el email no existe como si la contraseña está mal. Deja el usuario autenticado en `req.user` — **no genera ningún token acá** |
| `current` | `GET /api/sessions/current` | Lee la cookie `currentUser`, verifica que el JWT sea válido y no haya vencido, y deja el payload decodificado en `req.user`. Reemplaza al middleware manual `auth.middleware.js` que existía en la Pre-entrega 3 |

El `POST /api/sessions/logout` es la única ruta de sesiones que **no** pasa por Passport: cerrar sesión es simplemente borrar una cookie, no hay ninguna identidad que verificar.

Un detalle de diseño importante, pedido explícitamente por la consigna: **el JWT se genera en el controller (`sessions.controller.js`), nunca dentro de una estrategia**. Las estrategias solo responden "¿quién sos / sos quién decís ser?"; qué hacer con esa identidad ya confirmada (firmar un token, guardarlo en una cookie) es una decisión de la capa HTTP, no de la autenticación en sí.

`app.js` solo inicializa Passport (`passport.initialize()`) — no define ninguna estrategia. Eso significa que, para sumar un login con Google o GitHub en una entrega futura, alcanza con agregar una nueva estrategia en `passport.config.js`; no hace falta tocar `app.js` ni ninguna ruta existente.

### `POST /api/sessions/login`

**Campos que espera:**

| Campo | Tipo | Reglas |
|---|---|---|
| `email` | string | Obligatorio |
| `password` | string | Obligatorio |

**Ejemplo de petición:**

```json
POST /api/sessions/login
Content-Type: application/json

{
  "email": "ana@mail.com",
  "password": "Secreta123"
}
```

**Respuesta 200 — login correcto** (además, la respuesta trae en sus headers un `Set-Cookie` con el JWT, `httpOnly`, que el navegador va a reenviar automáticamente en cada petición siguiente):

```json
{
  "status": "success",
  "message": "Login correcto"
}
```

**Respuesta 401 — credenciales inválidas** (se usa el mismo mensaje tanto si el email no existe como si la contraseña está mal, a propósito — ver el comentario en `sessions.service.js` para la explicación completa de por qué):

```json
{
  "status": "error",
  "message": "Credenciales inválidas"
}
```

---

### `GET /api/sessions/current`

Ruta protegida: antes de llegar al controlador, pasa por la estrategia `current` de Passport (ver tabla arriba), que lee la cookie `currentUser`, verifica que el JWT adentro sea válido y no haya vencido, y recién ahí deja pasar la petición.

**Respuesta 200 — con una cookie de sesión válida:**

```json
{
  "status": "success",
  "payload": {
    "id": "665f2a...",
    "email": "ana@mail.com",
    "role": "user"
  }
}
```

**Respuesta 401 — sin cookie, o con un token inválido/vencido:**

```json
{
  "status": "error",
  "message": "No autenticado"
}
```

---

### `POST /api/sessions/logout`

No espera ningún campo en el body. Borra la cookie `currentUser` del navegador.

**Respuesta 200:**

```json
{
  "status": "success",
  "message": "Sesión cerrada"
}
```

---

### Cómo probar el flujo completo (con Thunder Client)

Un detalle importante: Thunder Client (como cualquier cliente HTTP normal) guarda las cookies automáticamente entre peticiones dentro de la misma "Collection", igual que haría un navegador — así que no hace falta copiar el token a mano de un lado a otro.

1. **Registrate** con `POST /api/sessions/register` (como en la sección anterior), si todavía no tenés un usuario de prueba.
2. **Login** con `POST /api/sessions/login`, usando ese mismo email y contraseña → esperás `200` y, en la pestaña "Cookies" de la respuesta en Thunder Client, deberías ver `currentUser` con un valor largo (el JWT).
3. **`GET /api/sessions/current`** → esperás `200` con tus datos (`id`, `email`, `role`), sin `password` en ningún lado.
4. **`POST /api/sessions/logout`** → esperás `200`.
5. **`GET /api/sessions/current`** otra vez → ahora esperás `401`, porque la cookie ya se borró.

Otros casos para probar:
- **Login con un email que no existe** → `401`, mensaje genérico `"Credenciales inválidas"`.
- **Login con la contraseña incorrecta** (de un usuario que sí existe) → `401`, el mismo mensaje genérico.
- **`/current` sin haber hecho login nunca** (o en una request nueva, sin cookies guardadas) → `401`.
- **`/current` con un token manipulado**: si querés probar esto a mano, copiá el valor de la cookie después de un login y cambiale un carácter cualquiera antes de mandarlo — la firma deja de coincidir y debería dar `401` igual.

---

## Roles y autorización

Hasta la Pre-entrega 4 la API sabía **quién** era cada usuario (autenticación). Desde la Pre-entrega 5 también decide **qué puede hacer** (autorización), según su rol.

### Roles

| Rol | Para qué sirve |
|---|---|
| `user` | Usuario común. Es el rol por defecto de todo el que se registra. Puede consultar los eventos publicados |
| `organizer` | Organiza eventos: puede crear eventos y modificar o cancelar **los suyos** |
| `admin` | Control total: puede modificar o cancelar **cualquier** evento y ver todos los usuarios |

El campo `role` del modelo `User` acepta únicamente estos tres valores (`enum`) y por defecto vale `user`.

### Matriz de permisos

| Acción | user | organizer | admin |
|---|:---:|:---:|:---:|
| Consultar eventos publicados | ✅ | ✅ | ✅ |
| Crear eventos | ❌ | ✅ | ✅ |
| Modificar/cancelar eventos propios | ❌ | ✅ | ✅ |
| Modificar cualquier evento | ❌ | ❌ | ✅ |
| Ver todos los usuarios | ❌ | ❌ | ✅ |
| Inscribirse a un evento y cancelar los tickets propios | ✅ | ✅ | ✅ |
| Ver los tickets de un evento | ❌ | ✅ (solo de sus eventos) | ✅ |
| Cancelar el ticket de otra persona | ❌ | ❌ | ✅ |

Esta tabla también existe **en código**, en `src/config/roles.config.js` (`ROLES` y `PERMISSIONS`). Las rutas no tienen los roles escritos a mano: usan `authorize(...PERMISSIONS.CREATE_EVENT)`, por lo que si una regla cambia, se cambia en un solo lugar.

### Cómo se asignan los roles

- **El registro público nunca permite elegir el rol.** `POST /api/sessions/register` ignora cualquier `role` que venga en el body: todos entran como `user`. Así nadie puede auto-asignarse `admin` u `organizer`.
- Los roles `organizer` y `admin` los asigna quien administra el servidor con una herramienta de línea de comandos, **no con un endpoint de la API**:

  ```bash
  npm run set-role -- ana@mail.com organizer
  npm run set-role -- ana@mail.com admin
  ```

  La persona tiene que estar registrada antes. Después del cambio tiene que **volver a hacer login**: el rol viaja dentro del JWT, y el token anterior conserva el rol viejo hasta que vence (`JWT_EXPIRES_IN`).

### Los dos middlewares

Están separados del código de las rutas y se usan siempre en este orden:

```js
router.post('/', authenticate, authorize(...PERMISSIONS.CREATE_EVENT), asyncHandler(createEvent));
```

| Middleware | Archivo | Qué hace | Si falla |
|---|---|---|---|
| `authenticate` | `src/middlewares/auth.middleware.js` | Lee el JWT de la cookie `currentUser` (con la estrategia `current` de Passport), lo valida y deja `{ id, email, role }` en `req.user` | **401** `No autenticado` |
| `authorize(...roles)` | `src/middlewares/authorize.middleware.js` | Recibe los roles permitidos y los compara contra `req.user.role` | **403** `No tenés permisos para realizar esta acción` |

### Diferencia entre 401 y 403

| Código | Significa | Cuándo pasa | Mensaje |
|---|---|---|---|
| **401** Unauthorized | **No sabemos quién sos** | No hay cookie, el token es inválido, fue manipulado o venció | `No autenticado` |
| **403** Forbidden | **Sabemos quién sos, pero no tenés permiso** | Hay sesión válida, pero tu rol no alcanza (o el evento no es tuyo) | `No tenés permisos para realizar esta acción` / `No tenés permisos sobre este evento` |

La idea para recordarlo: el **401** se arregla iniciando sesión; el **403** no se arregla iniciando sesión, porque ya estás adentro y simplemente esa acción no te corresponde. Ninguno de los dos casos responde 500: el 500 queda reservado para errores reales e inesperados del servidor.

### Rutas protegidas

| Ruta | Quién puede | Sin sesión | Con sesión pero sin permiso |
|---|---|---|---|
| `GET /api/sessions/current` | Cualquier usuario autenticado | 401 | — |
| `POST /api/events` | `organizer`, `admin` | 401 | 403 (si es `user`) |
| `PUT /api/events/:id` | `organizer` (solo sus eventos), `admin` | 401 | 403 (si es `user`, o si el evento es de otro organizer) |
| `PATCH /api/events/:id/status` | `organizer` (solo sus eventos), `admin` | 401 | 403 (si es `user`, o si el evento es de otro organizer) |
| `POST /api/events/:eid/tickets` | Cualquier usuario autenticado | 401 | — |
| `GET /api/tickets/my-tickets` | Cualquier usuario autenticado | 401 | — |
| `GET /api/events/:eid/tickets` | `organizer` (solo de sus eventos), `admin` | 401 | 403 (si es `user`, o si el evento es de otro organizer) |
| `PATCH /api/tickets/:tid/cancel` | Dueño del ticket, `admin` | 401 | 403 (si el ticket es de otra persona y no es `admin`) |
| `GET /api/users` *(ruta administrativa)* | `admin` | 401 | 403 (si es `user` u `organizer`) |

`GET /api/events` y `GET /api/events/:id` son públicas: cualquiera puede consultar los eventos publicados, tenga o no sesión. La única excepción son los borradores (ver [Eventos](#eventos--entidad-central-y-lógica-de-negocio)).

### Propiedad de los eventos

Hay dos niveles de control y conviene no confundirlos:

1. **Por rol**, en el middleware `authorize`: ¿un `user` puede modificar eventos? No → 403, y el controlador ni se ejecuta.
2. **Por propiedad**, en el service de eventos: ¿este organizer es el dueño de **este** evento? Eso no se puede decidir en un middleware genérico porque hace falta consultar el evento en la base de datos para saber de quién es. Un `organizer` solo puede modificar o cambiar de estado los eventos cuyo `organizer` es su propio id; un `admin` puede con cualquiera. Si no corresponde → 403 `No tenés permisos sobre este evento`.

El campo `organizer` siempre lo completa el servidor con el id que sale del JWT. Nunca se acepta desde el body: si llega en la petición, se ignora. Un evento cancelado queda guardado con `status: "cancelled"` (no se borra) y ya no se puede modificar.

### Ejemplos de respuestas

**`POST /api/events` con rol `user` → 403:**

```json
{ "status": "error", "message": "No tenés permisos para realizar esta acción" }
```

**`POST /api/events` con rol `organizer` o `admin` → 201** (el body completo y el detalle de cada campo están en la sección [Eventos](#eventos--entidad-central-y-lógica-de-negocio)):

```json
{
  "status": "success",
  "payload": {
    "_id": "6690...",
    "title": "Congreso Tech 2026",
    "description": "Charlas y talleres",
    "category": "workshop",
    "date": "2026-12-01T10:00:00.000Z",
    "location": "Mendoza",
    "capacity": 100,
    "price": 500,
    "status": "draft",
    "organizer": "665f2a..."
  }
}
```

**Cualquier ruta privada sin cookie → 401:**

```json
{ "status": "error", "message": "No autenticado" }
```

**`PUT /api/events/:id` de un organizer sobre un evento ajeno → 403:**

```json
{ "status": "error", "message": "No tenés permisos sobre este evento" }
```

Los demás errores de los endpoints de eventos (`400`, `404`, `409`) están detallados en la sección [Eventos](#eventos--entidad-central-y-lógica-de-negocio).

### Cómo probar los casos (con Thunder Client)

Thunder Client guarda una sola cookie `currentUser` por vez: para cambiar de usuario basta con hacer login con el otro, que reemplaza la cookie anterior.

1. Registrá tres usuarios con `POST /api/sessions/register` (por ejemplo `user@mail.com`, `organizer@mail.com` y `admin@mail.com`).
2. Asignales el rol desde la terminal del proyecto:
   ```bash
   npm run set-role -- organizer@mail.com organizer
   npm run set-role -- admin@mail.com admin
   ```
3. Casos a verificar:
   - **Sin cookie** (sin haber hecho login, o después de `logout`): `POST /api/events` → `401`.
   - Login como `user` → `POST /api/events` → `403`.
   - Login como `organizer` → `POST /api/events` → `201` (guardá el `_id` que devuelve).
   - Como `organizer`: `GET /api/users` → `403`.
   - Login como `admin` → `GET /api/users` → `200`, sin ninguna contraseña en la lista.
   - Con un segundo organizer, intentar `PUT /api/events/:id` sobre el evento del primero → `403`. Con el admin, el mismo `PUT` → `200`.

---

## Eventos — entidad central y lógica de negocio

### Modelo `Event`

| Campo | Tipo | Reglas |
|---|---|---|
| `title` | String | Obligatorio |
| `description` | String | Obligatorio |
| `category` | String | Obligatorio (texto libre, por ejemplo `workshop`, `conference`, `meetup`) |
| `date` | Date | Obligatoria. No puede ser pasada al crear |
| `location` | String | Obligatorio |
| `capacity` | Number | Obligatoria, entero mayor a 0 |
| `price` | Number | Mayor o igual a 0. Si no se envía, vale `0` (evento gratuito) |
| `status` | String | Solo `draft`, `published`, `cancelled` o `finished`. Por defecto `draft` |
| `organizer` | ObjectId → `User` | **Referencia** (solo el id) al usuario que creó el evento, no un objeto embebido. Siempre lo asigna el servidor desde `req.user`; no puede venir del body |

### Endpoints

| Método | Ruta | Acceso | Qué hace |
|---|---|---|---|
| `POST` | `/api/events` | `organizer`, `admin` | Crea un evento. El `organizer` se toma del token |
| `GET` | `/api/events` | Público | Lista con filtros, paginación y orden |
| `GET` | `/api/events/:id` | Público | Devuelve un evento (404 si no existe) |
| `PUT` | `/api/events/:id` | Dueño del evento o `admin` | Modifica los datos. Actualiza los campos que se envíen; `organizer` y `status` del body se ignoran |
| `PATCH` | `/api/events/:id/status` | Dueño del evento o `admin` | Cambia el estado (publicar, cancelar, finalizar) |

Los eventos **nunca se eliminan físicamente**: cancelar es cambiar el estado a `cancelled`.

### Crear un evento — `POST /api/events`

```json
{
  "title": "Congreso Tech 2026",
  "description": "Charlas y talleres",
  "category": "workshop",
  "date": "2026-12-01T10:00:00.000Z",
  "location": "Mendoza",
  "capacity": 100,
  "price": 500
}
```

`price` es opcional. También se puede enviar `"status": "published"` para crear el evento ya publicado (por defecto nace como `draft`); no se puede crear como `cancelled` ni `finished`. Respuesta `201` con el evento creado en `payload`.

### Estados y cambios permitidos

```
draft ──► published ──► finished
  │           │
  └───────────┴──► cancelled
```

| Estado actual | Puede pasar a |
|---|---|
| `draft` | `published`, `cancelled` |
| `published` | `cancelled`, `finished` |
| `cancelled` | *(ninguno: estado final)* |
| `finished` | *(ninguno: estado final)* |

Para cambiar el estado: `PATCH /api/events/:id/status` con `{ "status": "published" }`.

### Reglas de negocio principales

Todas viven en `src/services/events.service.js` (no en las rutas ni en los controllers):

- **No se crean eventos con fecha pasada** (400).
- **`capacity` debe ser un entero mayor a 0 y `price` mayor o igual a 0** (400), tanto al crear como al modificar.
- **No se publican eventos cancelados ni finalizados** (409). En general, un evento `cancelled` o `finished` no cambia de estado.
- **Los eventos cancelados no se modifican** (409). La consigna lo pide así; por coherencia, tampoco se modifican los finalizados.
- **Un organizer solo gestiona sus propios eventos**; un admin gestiona cualquiera (403 si no corresponde).
- **`organizer` se asigna desde el token**, nunca desde el body.
- **Borradores**: no son públicos. En el listado no aparecen salvo que se pida `?status=draft`, y eso exige sesión: sin sesión → 401; con rol `user` → 403; un organizer ve solo sus borradores y un admin ve todos. `GET /api/events/:id` de un borrador responde 404 para cualquiera que no sea su organizer o un admin.

### Listado con filtros — `GET /api/events`

| Parámetro | Qué hace | Por defecto |
|---|---|---|
| `status` | `published`, `draft`, `cancelled` o `finished` | `published` |
| `category` | Coincidencia exacta, sin distinguir mayúsculas | — |
| `location` | Contiene el texto, sin distinguir mayúsculas | — |
| `dateFrom` | Eventos desde esta fecha (inclusive). Formato `AAAA-MM-DD` o ISO | — |
| `dateTo` | Eventos hasta esta fecha (inclusive). Con `AAAA-MM-DD` incluye todo ese día | — |
| `page` | Número de página (entero ≥ 1) | `1` |
| `limit` | Eventos por página (entero entre 1 y 50) | `10` |
| `sort` | `date`, `price`, `title`, `capacity` o `createdAt`. Con `-` adelante es descendente (`-price`). Se pueden combinar con coma (`-price,date`) | `date` (los más próximos primero) |

Ejemplo: `GET /api/events?status=published&category=workshop&page=2&limit=5`

```json
{
  "status": "success",
  "data": [
    {
      "_id": "6690...",
      "title": "[Demo] Taller de Git y GitHub",
      "category": "workshop",
      "date": "2026-11-20T15:00:00.000Z",
      "location": "Córdoba",
      "capacity": 50,
      "price": 0,
      "status": "published",
      "organizer": "665f2a..."
    }
  ],
  "page": 2,
  "limit": 5,
  "total": 8,
  "totalPages": 2
}
```

Este es el único endpoint que devuelve los datos en `data` (y no en `payload`), porque lleva al lado la información de paginación. Un parámetro inválido (`page=0`, `limit=100`, `sort=password`, una fecha imposible, etc.) responde `400` con un mensaje claro. Para que las páginas no repitan ni salteen eventos cuando hay empates, el orden siempre se desempata por `_id`.

### Errores de los endpoints de eventos

| Código | Cuándo |
|---|---|
| `400` | Faltan campos obligatorios, un campo vacío, fecha inválida o pasada (al crear), `capacity` o `price` inválidos, estado inexistente, id con formato inválido, parámetros del listado inválidos, o un `PUT` sin ningún campo para actualizar |
| `401` | No hay sesión válida (`No autenticado`) |
| `403` | El rol no alcanza, o el evento es de otro organizer |
| `404` | El evento no existe (`Evento no encontrado`) |
| `409` | Cambio de estado no permitido, o modificar un evento cancelado o finalizado |

Un id con formato inválido (por ejemplo `/api/events/abc`) responde `400`; un id con formato válido que no corresponde a ningún evento responde `404`.

### Datos de ejemplo (opcional)

Para probar el listado sin crear eventos uno por uno hay un script que carga 14 eventos de ejemplo (todos con el prefijo `[Demo]`, de distintas categorías, lugares, fechas y estados). El email tiene que ser el de un usuario ya registrado con rol `organizer` o `admin`:

```bash
npm run seed-events -- organizer@mail.com
```

Si se vuelve a ejecutar, no duplica los eventos que ya existen.

### Casos a probar (con Thunder Client)

| # | Caso | Resultado esperado |
|---|---|---|
| 1 | `POST /api/events` con rol `user` | `403` |
| 2 | `POST /api/events` con fecha pasada | `400` |
| 3 | `POST /api/events` con `capacity: 0` | `400` |
| 4 | `PUT /api/events/:id` de un organizer sobre un evento propio | `200` |
| 5 | `PUT /api/events/:id` de un organizer sobre un evento ajeno | `403` |
| 6 | `PUT /api/events/:id` de un admin sobre un evento de otro organizer | `200` |
| 7 | `PATCH /api/events/:id/status` sobre un evento cancelado | `409` |
| 8 | `GET /api/events?status=published&category=workshop&page=2&limit=5` | `200` con `data`, `page`, `limit`, `total` y `totalPages` |
| 9 | `GET /api/events/:id` con un id que no existe (por ejemplo `000000000000000000000000`) | `404` |

---

## Tickets e inscripciones — cupos y notificaciones por email

Desde la Pre-entrega 7, cualquier persona con sesión iniciada puede inscribirse a un evento publicado. Cada inscripción es un **ticket**: un documento propio que relaciona a una persona con un evento y dice cuántos lugares reservó y en qué estado está esa reserva.

### Modelo `Ticket`

| Campo | Tipo | Descripción |
|---|---|---|
| `user` | ObjectId (ref `User`) | Quién se inscribió. Sale siempre del JWT, nunca del body |
| `event` | ObjectId (ref `Event`) | A qué evento. Sale de la URL (`:eid`) |
| `status` | string | `confirmed`, `pending` o `cancelled` (por defecto `confirmed`) |
| `quantity` | number | Cuántos lugares reserva. Entero mayor a 0 (por defecto `1`) |
| `reservationCode` | string | Código único legible, por ejemplo `AURA-K7M2QX9P`. Lo genera el servidor |
| `cancelledAt` | date | `null` mientras el ticket está activo; al cancelarlo guarda la fecha y hora |
| `createdAt` / `updatedAt` | date | Los agrega Mongoose automáticamente |

**No hay objetos embebidos:** el ticket guarda solo los ids de la persona y del evento (referencias). Cuando hace falta mostrar datos del evento o de la persona se piden con `populate`, y solo los campos necesarios.

### Estados de un ticket

| Estado | Significado | ¿Ocupa cupo? |
|---|---|---|
| `confirmed` | Inscripción confirmada. Es el estado con el que nace toda inscripción | ✅ Sí |
| `pending` | Reserva pendiente (queda previsto para un futuro paso de pago) | ✅ Sí |
| `cancelled` | Inscripción cancelada. El documento **no se borra**: queda con `cancelledAt` | ❌ No |

### Endpoints

| Método | Ruta | Quién puede |
|---|---|---|
| `POST` | `/api/events/:eid/tickets` | Cualquier usuario autenticado |
| `GET` | `/api/tickets/my-tickets` | Cualquier usuario autenticado (solo ve los suyos) |
| `GET` | `/api/events/:eid/tickets` | `organizer` del evento, o `admin` |
| `PATCH` | `/api/tickets/:tid/cancel` | Dueño del ticket, o `admin` |

Las rutas viven en `src/routes/tickets.router.js` (montado en `/api`) y, como siempre, no tienen lógica: usan `authenticate` y `authorize(...PERMISSIONS.VIEW_EVENT_TICKETS)`. Todas las reglas están en `src/services/tickets.service.js`.

### Flujo de inscripción — `POST /api/events/:eid/tickets`

Body (opcional): `{ "quantity": 2 }`. Si no se manda, se reserva 1 lugar. Cualquier otro campo del body (`user`, `status`, `reservationCode`, etc.) se ignora.

El service valida, en este orden:

1. **El evento existe** → si no, `404` `Evento no encontrado` (un id con formato inválido responde `400`).
2. **El evento está publicado y todavía no ocurrió** → un evento cancelado o finalizado responde `409` (`No se puede inscribir a un evento cancelado` / `finalizado`), y uno en borrador, `409` `El evento todavía no está publicado`. Además se compara la **fecha del evento con el momento del intento**: si ya pasó, aunque el estado siga siendo `published`, responde `409` `No se puede inscribir a un evento cuya fecha ya pasó`.
3. **`quantity` es válida** → entero mayor a 0; si no, `400`.
4. **No hay un ticket activo de esa persona para ese evento** → si lo hay, `409` `Ya tenés una inscripción activa para este evento`.
5. **Hay cupo suficiente** → si no, `409` con un mensaje claro: `No hay cupo suficiente: quedan 2 lugares y pediste 3` o `No quedan cupos disponibles para este evento`.
6. Se guarda el ticket como `confirmed`, con su `reservationCode`.
7. Se envía el **email de confirmación** (ver más abajo).

Los pasos 4, 5 y 6 se hacen juntos dentro de **una transacción que bloquea el evento** (ver [Regla de cupos](#regla-de-cupos)); los pasos 1 a 3 se comprueban antes, para responder rápido sin abrir la transacción, y el paso 2 se vuelve a comprobar ya con el evento bloqueado.

Respuesta `201`:

```json
{
  "status": "success",
  "payload": {
    "_id": "6ae0a1b2c3d4e5f607182930",
    "user": "6ad79f4412745f02a12ccb9d",
    "event": "6adfe37ca157828d3e9b3e97",
    "status": "confirmed",
    "quantity": 2,
    "reservationCode": "AURA-K7M2QX9P",
    "cancelledAt": null,
    "createdAt": "2026-11-02T22:10:00.000Z",
    "updatedAt": "2026-11-02T22:10:00.000Z"
  },
  "emailSent": true
}
```

`emailSent` indica si el email de confirmación salió. Si es `false`, la inscripción **igual quedó confirmada** (ver [Emails](#emails-con-nodemailer)).

### Regla de cupos

El cupo de un evento es su `capacity`. El cupo **ocupado** es la suma de `quantity` de los tickets **activos** (`confirmed` y `pending`); los `cancelled` no cuentan.

```
cupos disponibles = capacity − suma de quantity de los tickets activos
```

Ese número **no se guarda en ningún lado**: se calcula cada vez que hace falta. Por eso, al cancelar un ticket el lugar queda libre automáticamente, sin tener que "devolver" nada a un contador. Ejemplo con `capacity: 3`: Ana reserva 1 y Luis reserva 1 (ocupados 2, disponibles 1); si Ana cancela, quedan ocupados 1 y disponibles 2.

**Una inscripción activa por persona y por evento.** Una persona puede reservar varios lugares usando `quantity`, pero no tener dos tickets activos del mismo evento. Si cancela, puede volver a inscribirse.

**Qué pasa si dos pedidos llegan al mismo tiempo.** Contar el cupo y guardar el ticket son pasos separados, y con dos pedidos simultáneos por el último lugar los dos podrían ver "queda 1" y los dos guardar. La primera versión resolvía eso volviendo a contar después de guardar y cancelando el propio ticket si el cupo se había pasado; pero con un solo lugar libre los dos pedidos veían el cupo excedido y **los dos se cancelaban**: dos intentos y ninguna reserva.

Ahora el service hace todo dentro de **una transacción de MongoDB** (`reserveSeats` en `tickets.service.js`):

1. Lo primero que hace la transacción es **bloquear el evento** (`EventsRepository.lock`): una escritura mínima sobre ese documento que no cambia ningún dato del evento (solo suma 1 al contador interno `__v`, que además no se expone en las respuestas, y no toca `updatedAt`).
2. Mongo no permite que dos transacciones escriban el mismo documento a la vez: la segunda recibe un conflicto transitorio y se **reintenta sola** cuando la primera termina. Por eso las inscripciones al mismo evento se atienden **de a una**.
3. Ya con el evento bloqueado se comprueba el duplicado y el cupo, y se guarda el ticket. Cuando la transacción termina (commit), la siguiente arranca viendo el ticket ya guardado, así que el que llega segundo ve el cupo ocupado y recibe un `409` normal (`No quedan cupos disponibles para este evento`).

Resultado: con 1 lugar libre y 2 pedidos simultáneos, **siempre queda exactamente una reserva** (una respuesta `201` y una `409`), y nunca se vende más de `capacity`. Ya no hace falta volver a comprobar ni cancelar nada después de guardar.

Detalles a tener en cuenta:

- Las transacciones necesitan una base con réplicas, como **MongoDB Atlas** (incluido el cluster gratuito M0). Un MongoDB local suelto, sin réplicas, no las soporta.
- Dentro de la transacción solo se toca la base. El **email se envía después** de confirmarla, porque si Mongo reintenta la transacción no queremos mandar el mail dos veces.
- Si el código de reserva generado ya existiera (casi imposible), se repite la transacción con un código nuevo.
- Cancelar un ticket no necesita transacción: es una sola operación y solo libera lugar.

### Cancelación — `PATCH /api/tickets/:tid/cancel`

- Solo la puede hacer el dueño del ticket o un `admin`; el ticket de otra persona responde `403` `No tenés permisos sobre este ticket`.
- Cambia `status` a `cancelled` y registra `cancelledAt`. **No elimina el documento.**
- Si el ticket no existe → `404` `Ticket no encontrado`. Si ya estaba cancelado → `409` `El ticket ya está cancelado`.
- El cupo queda disponible automáticamente (los cancelados no se cuentan).

### Mis tickets — `GET /api/tickets/my-tickets`

Devuelve **solo** los tickets de quien tiene la sesión iniciada (se busca siempre por el id del JWT), del más nuevo al más viejo. Cada uno trae el evento con `populate`, limitado a `title`, `date` y `location`:

```json
{
  "status": "success",
  "payload": [
    {
      "_id": "6ae0a1b2c3d4e5f607182930",
      "user": "6ad79f4412745f02a12ccb9d",
      "event": {
        "_id": "6adfe37ca157828d3e9b3e97",
        "title": "[Demo] Taller de Node.js",
        "date": "2026-12-05T18:00:00.000Z",
        "location": "Mendoza"
      },
      "status": "confirmed",
      "quantity": 2,
      "reservationCode": "AURA-K7M2QX9P",
      "cancelledAt": null
    }
  ]
}
```

### Tickets de un evento — `GET /api/events/:eid/tickets`

Para ver quién se inscribió. Hay dos niveles de control, igual que en eventos:

1. **Por rol**, en `authorize`: un `user` común recibe `403` `No tenés permisos para realizar esta acción`.
2. **Por propiedad**, en el service: un `organizer` solo puede ver los tickets de **sus** eventos; si el evento es de otro organizer, `403` `No tenés permisos sobre este evento`. Un `admin` puede ver los de cualquiera.

Devuelve los tickets con los datos mínimos de cada persona (`first_name`, `last_name` y `email`: **nunca** la contraseña ni el rol) y un resumen del cupo. Acepta el filtro opcional `?status=confirmed` (o `pending` / `cancelled`):

```json
{
  "status": "success",
  "payload": [ { "status": "confirmed", "quantity": 1, "user": { "first_name": "Ana", "last_name": "Pérez", "email": "ana@mail.com" }, "...": "..." } ],
  "summary": { "capacity": 3, "occupied": 2, "available": 1 }
}
```

### Errores de los endpoints de tickets

| Código | Cuándo |
|---|---|
| `400` | Id de evento o de ticket con formato inválido, `quantity` inválida, o `?status` inválido |
| `401` | No hay sesión válida (`No autenticado`) |
| `403` | El rol no alcanza, el evento no es del organizer, o el ticket no es de quien intenta cancelarlo |
| `404` | El evento o el ticket no existen |
| `409` | Evento no publicado (cancelado, finalizado o en borrador), inscripción duplicada, sin cupo suficiente, o ticket ya cancelado |

### Emails con Nodemailer

Al confirmarse una inscripción se envía un email a la dirección de quien se inscribió, con el evento, la fecha, el lugar, los lugares reservados, el total y el **código de reserva**. El envío está en `src/services/mail.service.js`.

Las credenciales **nunca están escritas en el código**: salen de estas variables de entorno (están en `.env.example`):

| Variable | Descripción | Ejemplo |
|---|---|---|
| `MAIL_HOST` | Servidor SMTP | `sandbox.smtp.mailtrap.io` |
| `MAIL_PORT` | Puerto del servidor SMTP (número) | `2525` |
| `MAIL_USER` | Usuario del servidor SMTP | *(lo da el proveedor)* |
| `MAIL_PASS` | Contraseña del servidor SMTP | *(lo da el proveedor)* |
| `MAIL_FROM` | Remitente que aparece en el email | `"Aura Events" <no-reply@auraevents.com>` |

Para **probarlo sin mandar mails reales** se puede usar [Mailtrap](https://mailtrap.io) (gratis): en su sección *Email Testing* se crea una casilla ("inbox"), y en *SMTP Settings* aparecen el host, el puerto, el usuario y la contraseña para completar `.env`. Todos los emails que envíe la API quedan en esa casilla, sin llegar a ninguna persona real. También sirve cualquier cuenta SMTP propia (por ejemplo Gmail con una contraseña de aplicación).

Qué pasa en cada situación:

- **Variables completas:** se envía el email y la respuesta lleva `"emailSent": true`.
- **Faltan variables (o `MAIL_PORT` no es un número):** el servidor igual arranca y avisa en la consola qué falta. Las inscripciones funcionan, pero no se manda el email (`"emailSent": false`).
- **El servidor de correo falla o no responde:** la inscripción ya quedó guardada y confirmada, así que no se convierte en error; se anota el motivo en la consola y la respuesta lleva `"emailSent": false`.

El contenido del evento (por ejemplo el título) se escapa antes de ponerlo en el HTML del email, para que no se pueda colar código.

### Casos a probar (con Thunder Client)

| # | Caso | Resultado esperado |
|---|---|---|
| 1 | `POST /api/events/:eid/tickets` con sesión, a un evento publicado con cupo | `201` y email recibido |
| 2 | La misma petición sin sesión | `401` |
| 3 | A un evento que no existe (`000000000000000000000000`) | `404` |
| 4 | A un evento cancelado o finalizado | `409` |
| 5 | Pidiendo más lugares de los que quedan | `409` con mensaje claro |
| 6 | Inscribirse dos veces al mismo evento sin cancelar | `409` |
| 7 | `PATCH /api/tickets/:tid/cancel` sobre un ticket propio, y después una nueva inscripción ocupando ese cupo | `200` y la nueva inscripción da `201` |
| 8 | Cancelar el ticket de otra persona siendo `user` | `403` |
| 9 | `GET /api/events/:eid/tickets` como `user` común | `403` |
| 10 | `GET /api/events/:eid/tickets` como `organizer` de otro evento | `403` |

---

## Tests automáticos

```bash
npm test
```

Usan el **test runner que ya trae Node.js** (`node:test`), así que no hay que instalar nada. Corren en un par de segundos y **no necesitan base de datos ni conexión a internet**: los repositories y el envío de email se reemplazan por versiones de mentira (*mocks*), de modo que se prueba solo la lógica de la capa de services. Los tests definen sus propias variables de entorno de prueba (con una base inexistente), así que no usan los datos de tu `.env` ni pueden tocar tu base real.

| Archivo | Qué cubre |
|---|---|
| `tests/tickets.service.test.js` | Inscripción: evento inexistente, no publicado o con fecha vencida, `quantity` inválida, duplicados, cupo agotado y mensajes claros, orden de la transacción (bloqueo → conteos → guardado → email), código de reserva repetido, email que falla sin romper la inscripción; cancelación y permisos; "mis tickets" y tickets de un evento |
| `tests/tickets.service.test.js` (carrera) | Pedidos simultáneos por el mismo cupo: con 1 lugar y 2 pedidos a la vez queda **exactamente 1** reserva (repetido 50 veces); 10 pedidos por 3 lugares dejan 3; la misma persona 3 veces a la vez queda con 1 ticket; y una **contraprueba** que muestra que sin el bloqueo del evento se venderían lugares de más |
| `tests/events.service.test.js` | Crear eventos (fecha pasada, `capacity`, `price`, textos vacíos, estado inicial, el organizer sale de la sesión), modificar (dueño, otro organizer, admin, eventos cancelados o finalizados), cambios de estado permitidos y prohibidos, borradores, y el listado con filtros, orden, paginación (`data`, `page`, `limit`, `total`, `totalPages`) y rechazo de operadores de MongoDB en la URL |
| `tests/dto.test.js` | Que `password` y `__v` nunca salgan en las respuestas, y que `populate` solo muestre los campos permitidos |

**Qué se prueba con mocks y qué no.** La carrera de los tests usa una "base" en memoria cuya transacción atiende de a una a las que tocan el mismo evento, igual que el bloqueo real de MongoDB; eso verifica la **lógica del service**. El comportamiento real de la transacción contra Atlas se comprobó a mano con 5 inscripciones simultáneas a un evento de 1 solo lugar (resultado: 1 reserva y 4 respuestas `409`).

Para el flujo completo de punta a punta (registro, login, evento, inscripción, cancelación) seguí los casos de las secciones *Casos a probar* con Thunder Client o Postman.

---

## Preparado para proveedores externos

El archivo `src/config/passport.config.js` está armado para poder sumar nuevas estrategias sin reorganizar nada de lo existente. Por ejemplo, un login con Google se agregaría así, en ese mismo archivo:

```js
passport.use('google', new GoogleStrategy({ /* credenciales de Google */ }, verifyCallback));
```

Y la ruta correspondiente se vería igual de simple que las actuales:

```js
router.get('/google', passport.authenticate('google', { session: false }));
```

No hace falta tocar `app.js` (ya tiene `passport.initialize()`) ni modificar ninguna de las rutas de sesiones que ya existen.

---

## Notas adicionales

El objetivo de este proyecto es ir creciendo entrega a entrega sobre la misma base, sin reordenar nada de lo ya construido. Lo que falta para las próximas entregas:

- Login con proveedores externos (Google, GitHub) usando la estructura que ya dejó preparada Passport
- Un paso de pago para las reservas (el estado `pending` del ticket ya queda previsto para eso)
- Más notificaciones por email (por ejemplo, un aviso al cancelar una inscripción)

En cada endpoint nuevo que se agregue de acá en adelante se mantiene el mismo patrón ya establecido: nunca se expone `password` en ninguna respuesta, y nunca se acepta `role` (ni ningún otro campo sensible) directamente desde el body de la petición.

---

Desarrollado por Vanesa como parte del curso de Backend II.
