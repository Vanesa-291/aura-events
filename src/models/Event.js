// Forma mínima de un evento dentro de Aura Events. Los campos alcanzan
// para listar y mostrar un evento; la lógica de inscripciones, cupos y
// tickets se va a sumar en próximas entregas.

import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
    },
    // Referencia al usuario que organiza el evento. Desde la Pre-entrega 5
    // se usa de verdad: es el dato que permite saber de quién es cada
    // evento, y por lo tanto decidir si un organizer puede modificarlo
    // (solo los suyos) o no. Siempre lo completa el servidor con el id
    // del usuario autenticado; nunca viene del body.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Estado del evento. 'published' es un evento visible para todos;
    // 'cancelled' es un evento que su organizador (o un admin) dio de
    // baja y que deja de aparecer en el listado público. En vez de
    // borrarlo de la base, lo marcamos como cancelado, así queda el
    // registro de que existió.
    status: {
      type: String,
      enum: ['published', 'cancelled'],
      default: 'published',
    },
  },
  { timestamps: true }
);

const Event = mongoose.model('Event', eventSchema);

export default Event;
