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
    // Referencia al usuario que organiza el evento. Todavía no se usa en
    // ningún lado, pero la dejamos preparada para cuando exista el login.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

const Event = mongoose.model('Event', eventSchema);

export default Event;
