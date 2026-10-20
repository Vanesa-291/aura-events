# Aura Events

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)
![ESM](https://img.shields.io/badge/Módulos-ESM-F7DF1E?style=flat-square&logo=javascript&logoColor=black)

---

## Temática elegida

**Aura Events** es una plataforma para la gestión de eventos e inscripciones. Permite crear y administrar eventos, y más adelante — a medida que el proyecto avance — gestionar sesiones, cupos y tickets de inscripción.

La Pre-entrega 1 estableció la base arquitectónica del backend: un servidor Express organizado por capas, listo para crecer sin necesidad de reordenar nada más adelante.

La Pre-entrega 2 sumó el primer flujo real de usuarios: el registro seguro, con validaciones, contraseñas protegidas con bcrypt y persistencia en MongoDB. Tras la corrección se afinaron dos detalles: ahora se rechaza un nombre compuesto solo por espacios en blanco, y un posible choque de emails duplicados ocurridos casi al mismo instante (registros simultáneos) también se maneja de forma prolija (409), en vez de terminar en un error de servidor (500).

La Pre-entrega 3 sumó la autenticación completa: login, generación de JWT, una cookie de sesión `httpOnly`, una ruta protegida para saber quién es el usuario autenticado, y logout. Tras la corrección se ajustó un detalle: la duración de la cookie de sesión ahora se calcula automáticamente a partir de `JWT_EXPIRES_IN`, en vez de estar escrita a mano por separado — así token y cookie quedan siempre sincronizados.

La Pre-entrega 4 no agrega funcionalidad nueva de cara afuera (las rutas y las respuestas son exactamente las mismas): refactoriza la organización interna de la autenticación para que pase por **Passport.js**, centralizando en un único archivo (`src/config/passport.config.js`) la lógica de registro, login y verificación de la sesión actual. Esto deja el proyecto preparado para, en una entrega futura, sumar proveedores externos de login (Google, GitHub, etc.) sin tener que tocar `app.js` ni las rutas existentes.

La Pre-entrega 5 suma **roles y autorización**: ya no alcanza con iniciar sesión, cada acción se valida según el rol del usuario (`user`, `organizer` o `admin`). Hay una matriz de permisos definida en un solo lugar, dos middlewares reutilizables (uno que responde **401** si no hay sesión y otro que responde **403** si el rol no alcanza), rutas protegidas para crear y gestionar eventos, una ruta administrativa, y una regla de propiedad: un organizer solo puede modificar o cancelar sus propios eventos.

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
```

| Variable | Descripción |
|---|---|
| `PORT` | Puerto en el que corre el servidor |
| `NODE_ENV` | Entorno de ejecución (`development` / `production`). En `production`, la cookie de sesión exige HTTPS |
| `MONGO_URL` | Cadena de conexión a MongoDB Atlas |
| `JWT_SECRET` | Clave secreta con la que se firman los JWT. Nunca se escribe en el código, solo acá |
| `JWT_EXPIRES_IN` | Cuánto dura un token antes de vencer (formato tipo `1h`, `15m`, `7d`) |

El archivo `.env` nunca se sube al repositorio — está excluido en `.gitignore`. `.env.example` queda como guía de qué configurar.

---

## Cómo ejecutar

```bash
npm start       # modo normal
npm run dev     # se reinicia solo al guardar cambios
```

Y una herramienta de administración para asignar roles (ver la sección [Roles y autorización](#roles-y-autorización)):

```bash
npm run set-role -- ana@mail.com organizer
```

El servidor queda disponible en `http://localhost:8080` (o el puerto que hayas configurado).

---

## Estructura de carpetas

```
aura-events/
├── src/
│   ├── config/
│   │   ├── env.config.js      # valida que estén todas las variables necesarias
│   │   ├── db.js              # conexión a MongoDB
│   │   ├── passport.config.js # estrategias 'register', 'login' y 'current', centralizadas
│   │   └── roles.config.js    # ROLES y PERMISSIONS: la matriz de permisos en código
│   ├── routes/
│   │   ├── health.router.js
│   │   ├── events.router.js         # rutas de eventos, con authenticate + authorize
│   │   ├── users.router.js          # ruta administrativa (solo admin)
│   │   └── sessions.router.js       # las rutas de auth delegan en passport.authenticate(...)
│   ├── controllers/
│   │   ├── health.controller.js
│   │   ├── events.controller.js
│   │   ├── users.controller.js
│   │   └── sessions.controller.js   # genera el JWT y setea la cookie tras el login
│   ├── services/
│   │   ├── events.service.js        # validaciones de eventos y regla de propiedad
│   │   ├── users.service.js
│   │   └── sessions.service.js      # registerUser y validateCredentials (sin saber nada de JWT)
│   ├── repositories/
│   │   ├── events.repository.js
│   │   └── users.repository.js
│   ├── dao/
│   │   ├── events.dao.js
│   │   └── users.dao.js
│   ├── models/
│   │   ├── User.js                  # first_name, last_name, email, password, role
│   │   └── Event.js
│   ├── middlewares/
│   │   ├── auth.middleware.js       # authenticate: valida el JWT de la cookie → 401
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
├── scripts/
│   └── set-role.js            # herramienta de línea de comandos para asignar roles
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

**Cómo fluye una petición:**

```
Router → Controller → Service → Repository → DAO → Model (Mongoose) → MongoDB
```

Cada capa hace una sola cosa: el router solo conecta una URL con su controlador, el controlador traduce entre HTTP y el resto del sistema, el service es donde van a vivir las reglas del negocio, el repository es un intermediario, y el DAO es el único lugar que conversa directamente con la base de datos.

---

## Rutas disponibles

| Método | Ruta | Descripción | Respuesta |
|---|---|---|---|
| `GET` | `/api/health` | Confirma que el servidor está activo | `{ "status": "ok", "message": "Servidor activo" }` |
| `GET` | `/api/events` | Lista los eventos publicados (los cancelados no aparecen). Pública | `{ "status": "success", "payload": [...] }` |
| `POST` | `/api/events` | Crea un evento. Solo `organizer` o `admin` | Ver [Roles y autorización](#roles-y-autorización) |
| `PATCH` | `/api/events/:id` | Modifica un evento. `organizer` (solo los suyos) o `admin` (cualquiera) | Ver [Roles y autorización](#roles-y-autorización) |
| `PATCH` | `/api/events/:id/cancel` | Cancela un evento. `organizer` (solo los suyos) o `admin` (cualquiera) | Ver [Roles y autorización](#roles-y-autorización) |
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
| `PATCH /api/events/:id` | `organizer` (solo sus eventos), `admin` | 401 | 403 (si es `user`, o si el evento es de otro organizer) |
| `PATCH /api/events/:id/cancel` | `organizer` (solo sus eventos), `admin` | 401 | 403 (si es `user`, o si el evento es de otro organizer) |
| `GET /api/users` *(ruta administrativa)* | `admin` | 401 | 403 (si es `user` u `organizer`) |

`GET /api/events` sigue siendo pública: cualquiera puede consultar los eventos publicados.

### Propiedad de los eventos

Hay dos niveles de control y conviene no confundirlos:

1. **Por rol**, en el middleware `authorize`: ¿un `user` puede modificar eventos? No → 403, y el controlador ni se ejecuta.
2. **Por propiedad**, en el service de eventos: ¿este organizer es el dueño de **este** evento? Eso no se puede decidir en un middleware genérico porque hace falta consultar el evento en la base de datos para saber de quién es. Un `organizer` solo puede modificar o cancelar los eventos cuyo `createdBy` es su propio id; un `admin` puede con cualquiera. Si no corresponde → 403 `No tenés permisos sobre este evento`.

El campo `createdBy` siempre lo completa el servidor con el id que sale del JWT. Nunca se acepta desde el body, igual que `status`: si llegan en la petición, se ignoran. Un evento cancelado queda guardado con `status: "cancelled"` (no se borra), deja de aparecer en el listado público y ya no se puede modificar.

### Ejemplos de respuestas

**`POST /api/events` con rol `user` → 403:**

```json
{ "status": "error", "message": "No tenés permisos para realizar esta acción" }
```

**`POST /api/events` con rol `organizer` o `admin` → 201** (body de la petición: `title`, `description`, `date`, `location`, `capacity`):

```json
{
  "status": "success",
  "payload": {
    "_id": "6690...",
    "title": "Congreso Tech 2026",
    "description": "Charlas y talleres",
    "date": "2026-12-01T10:00:00.000Z",
    "location": "Mendoza",
    "capacity": 100,
    "createdBy": "665f2a...",
    "status": "published"
  }
}
```

**Cualquier ruta privada sin cookie → 401:**

```json
{ "status": "error", "message": "No autenticado" }
```

**`PATCH /api/events/:id` de un organizer sobre un evento ajeno → 403:**

```json
{ "status": "error", "message": "No tenés permisos sobre este evento" }
```

Otros errores de los endpoints de eventos: `400` (faltan campos, fecha inválida, capacidad que no sea un entero mayor a 0, id con formato inválido), `404` (el evento no existe) y `409` (cancelar un evento que ya está cancelado, o modificar uno cancelado).

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
   - Con un segundo organizer, intentar `PATCH /api/events/:id` sobre el evento del primero → `403`. Con el admin, el mismo `PATCH` → `200`.

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
- CRUD completo de eventos (hoy se pueden listar, crear, modificar y cancelar)
- Inscripciones, control de cupos y tickets

En cada endpoint nuevo que se agregue de acá en adelante se mantiene el mismo patrón ya establecido: nunca se expone `password` en ninguna respuesta, y nunca se acepta `role` (ni ningún otro campo sensible) directamente desde el body de la petición.

---

Desarrollado por Vanesa como parte del curso de Backend II.
