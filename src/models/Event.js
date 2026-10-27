// Forma de un evento dentro de Aura Events. Desde la Pre-entrega 6 este
// modelo representa la entidad central del dominio: tiene todos los datos
// necesarios para publicar, listar, filtrar y administrar eventos. La
// lógica de inscripciones, cupos y tickets se va a sumar en próximas
// entregas.
//
// Las reglas del modelo (por ejemplo, "capacity mayor a 0") son una
// última barrera de seguridad a nivel de base de datos. Las reglas de
// NEGOCIO (fecha pasada, cambios de estado permitidos, quién puede
// modificar qué) viven en events.service.js, que es donde la consigna
// pide que estén.

import mongoose from 'mongoose';

// Los estados posibles de un evento. Se exporta para que el service use
// exactamente la misma lista y no haya dos versiones que puedan
// desincronizarse.
//   draft     → borrador: lo ve solo su organizer (y los admin)
//   published → publicado: visible para todo el mundo
//   cancelled → cancelado (no se borra de la base, solo cambia de estado)
//   finished  → ya ocurrió
export const EVENT_STATUSES = ['draft', 'published', 'cancelled', 'finished'];

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    // Un evento sin precio explícito se considera gratuito (0). No puede
    // ser negativo.
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: EVENT_STATUSES,
      default: 'draft',
    },
    // Referencia (solo el id) al usuario que creó el evento. A propósito
    // NO se guarda el usuario completo adentro del evento: si el usuario
    // cambiara sus datos, el evento quedaría desactualizado, y además se
    // estaría duplicando información (incluida información sensible).
    // Siempre lo completa el servidor con el id que sale del JWT; nunca
    // viene del body de la petición.
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Índice para que el listado filtrado por estado y ordenado por fecha (la
// consulta más común) siga siendo rápido cuando haya muchos eventos.
eventSchema.index({ status: 1, date: 1 });

const Event = mongoose.model('Event', eventSchema);

export default Event;
