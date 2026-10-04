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

La Pre-entrega 3 suma la autenticación completa: login, generación de JWT, una cookie de sesión `httpOnly`, una ruta protegida para saber quién es el usuario autenticado, y logout.

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

El servidor queda disponible en `http://localhost:8080` (o el puerto que hayas configurado).

---

## Estructura de carpetas

```
aura-events/
├── src/
│   ├── config/
│   │   ├── env.config.js      # valida que estén todas las variables necesarias
│   │   └── db.js              # conexión a MongoDB
│   ├── routes/
│   │   ├── health.router.js
│   │   ├── events.router.js
│   │   └── sessions.router.js
│   ├── controllers/
│   │   ├── health.controller.js
│   │   ├── events.controller.js
│   │   └── sessions.controller.js
│   ├── services/
│   │   ├── events.service.js
│   │   └── sessions.service.js      # lógica del registro de usuarios
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
│   │   ├── notFound.middleware.js
│   │   ├── errorHandler.middleware.js
│   │   └── auth.middleware.js        # protege rutas leyendo y verificando el JWT de la cookie
│   ├── utils/
│   │   ├── asyncHandler.js
│   │   ├── appError.js              # errores con status code (400, 409, etc.)
│   │   ├── hash.js                  # hashPassword / comparePassword (bcrypt)
│   │   └── jwt.js                   # signToken / verifyToken (JWT)
│   ├── app.js                 # arma la aplicación de Express (sin levantarla)
│   └── server.js              # valida el entorno, conecta la base y levanta el servidor
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
| `GET` | `/api/events` | Lista los eventos existentes (vacía por ahora) | `{ "status": "success", "payload": [] }` |
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

Ruta protegida: antes de llegar al controlador, pasa por el middleware `auth`, que lee la cookie `currentUser`, verifica que el JWT adentro sea válido y no haya vencido, y recién ahí deja pasar la petición.

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

## Notas adicionales

El objetivo de este proyecto es ir creciendo entrega a entrega sobre la misma base, sin reordenar nada de lo ya construido. Lo que falta para las próximas entregas:

- Roles y autorización sobre las rutas (por ejemplo, que solo un `organizer` pueda crear eventos)
- CRUD completo de eventos
- Inscripciones, control de cupos y tickets

---

Desarrollado por Vanesa como parte del curso de Backend II.
