# Aura Events

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)
![ESM](https://img.shields.io/badge/Módulos-ESM-F7DF1E?style=flat-square&logo=javascript&logoColor=black)

---

## Temática elegida

**Aura Events** es una plataforma para la gestión de eventos e inscripciones. Permite crear y administrar eventos, y más adelante — a medida que el proyecto avance — gestionar sesiones, cupos y tickets de inscripción.

La Pre-entrega 1 estableció la base arquitectónica del backend: un servidor Express organizado por capas, listo para crecer sin necesidad de reordenar nada más adelante.

La Pre-entrega 2 suma el primer flujo real de usuarios: el registro seguro, con validaciones, contraseñas protegidas con bcrypt y persistencia en MongoDB.

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
JWT_SECRET=una_clave_secreta_cualquiera
```

| Variable | Descripción |
|---|---|
| `PORT` | Puerto en el que corre el servidor |
| `NODE_ENV` | Entorno de ejecución (`development` / `production`) |
| `MONGO_URL` | Cadena de conexión a MongoDB Atlas |
| `JWT_SECRET` | Clave que se usará para firmar sesiones más adelante |

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
│   │   └── errorHandler.middleware.js
│   ├── utils/
│   │   ├── asyncHandler.js
│   │   ├── appError.js              # errores con status code (400, 409, etc.)
│   │   └── hash.js                  # hashPassword / comparePassword (bcrypt)
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
| `GET` | `/api/sessions` | Confirma que la ruta está preparada | Mensaje indicando que el login llega en una próxima entrega |
| `POST` | `/api/sessions/register` | Registra un usuario nuevo | Ver detalle abajo |

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

## Notas adicionales

El objetivo de este proyecto es ir creciendo entrega a entrega sobre la misma base, sin reordenar nada de lo ya construido. Lo que falta para las próximas entregas:

- Login, JWT, cookies y Passport
- Ruta `current` para saber quién es el usuario logueado
- Roles y autorización sobre las rutas
- CRUD completo de eventos
- Inscripciones, control de cupos y tickets

---

Desarrollado por Vanesa como parte del curso de Backend II.


