# Aura Events

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)
![ESM](https://img.shields.io/badge/Módulos-ESM-F7DF1E?style=flat-square&logo=javascript&logoColor=black)

---

## Temática elegida

**Aura Events** es una plataforma para la gestión de eventos e inscripciones. Permite crear y administrar eventos, y más adelante — a medida que el proyecto avance — gestionar usuarios, sesiones, cupos y tickets de inscripción.

Esta primera entrega establece la base arquitectónica del backend: un servidor Express organizado por capas, listo para crecer sin necesidad de reordenar nada más adelante.

---

## Tecnologías utilizadas

| Tecnología | Uso |
|---|---|
| Node.js (ESM) | Entorno de ejecución |
| Express | Servidor HTTP y enrutamiento |
| MongoDB Atlas | Base de datos |
| Mongoose | Modelado de datos sobre MongoDB |
| dotenv | Variables de entorno |

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
│   │   └── events.service.js
│   ├── repositories/
│   │   └── events.repository.js
│   ├── dao/
│   │   └── events.dao.js
│   ├── models/
│   │   ├── User.js
│   │   └── Event.js
│   ├── middlewares/
│   │   ├── notFound.middleware.js
│   │   └── errorHandler.middleware.js
│   ├── utils/
│   │   └── asyncHandler.js
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
| `GET` | `/api/sessions` | Confirma que la ruta está preparada | Mensaje indicando que la autenticación llega en una próxima entrega |

---

## Notas adicionales

Esta entrega es intencionalmente mínima: el objetivo es dejar la arquitectura lista, no adelantar funcionalidad. En las próximas entregas se van a sumar, sobre esta misma base:

- Registro, login y manejo de sesión (JWT, cookies, Passport)
- Roles y autorización
- CRUD completo de eventos
- Inscripciones, control de cupos y tickets
- Validaciones de datos de entrada

---

Desarrollado por Vanesa como parte del curso de Backend II.
