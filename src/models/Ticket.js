// Forma de un ticket (inscripción) dentro de Aura Events. Un ticket es la
// "puerta de unión" entre una persona y un evento: dice QUIÉN se anotó,
// A QUÉ evento, cuántos lugares reservó y en qué estado está esa reserva.
//
// Igual que en Event, a propósito NO se guarda el usuario ni el evento
// completos adentro del ticket: solo sus ids (referencias). Si la persona
// cambiara su nombre o el organizer editara el título del evento, el
// ticket no quedaría desactualizado, y no se duplicaría información
// (incluida la sensible). Cuando hace falta mostrar datos del evento o de
// la persona, se piden con populate() al consultar.
//
// Las reglas de NEGOCIO (que el evento esté publicado, que haya cupo, que
// no haya duplicados) viven en tickets.service.js. Las del modelo son una
// última barrera de seguridad a nivel de base de datos.

import mongoose from 'mongoose';

// Los estados posibles de un ticket. Se exportan para que el service use
// exactamente las mismas listas y no haya versiones que se desincronicen.
//   confirmed → inscripción confirmada (ocupa cupo)
//   pending   → reserva pendiente, por ejemplo a la espera de un pago
//               (ocupa cupo). Hoy toda inscripción nace "confirmed"; este
//               estado queda previsto para cuando se sume un paso de pago.
//   cancelled → inscripción cancelada (NO ocupa cupo). El ticket no se
//               borra de la base: solo cambia de estado y queda la fecha
//               de cancelación.
export const TICKET_STATUSES = ['confirmed', 'pending', 'cancelled'];

// Los estados "activos" son los que ocupan lugar en el evento. Los
// cancelados quedan afuera: por eso, al cancelar, el cupo se libera solo,
// sin tener que "devolver" nada a ningún contador.
export const ACTIVE_TICKET_STATUSES = ['confirmed', 'pending'];

const ticketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    status: {
      type: String,
      enum: TICKET_STATUSES,
      default: 'confirmed',
    },
    // Cuántos lugares reserva este ticket (por ejemplo, una persona que se
    // anota con un acompañante reserva 2). Entero, mínimo 1.
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'La cantidad debe ser un número entero',
      },
    },
    // Código legible para identificar la reserva (por ejemplo
    // AURA-K7M2QX9P). Lo genera el servidor; es único.
    reservationCode: {
      type: String,
      required: true,
      unique: true,
    },
    // Queda en null mientras el ticket esté activo. Al cancelarlo se
    // completa con la fecha y hora de la cancelación.
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  // timestamps agrega createdAt y updatedAt automáticamente.
  { timestamps: true }
);

// Índices para que las consultas más comunes sigan siendo rápidas cuando
// haya muchos tickets: contar los cupos ocupados de un evento y listar los
// tickets de una persona.
ticketSchema.index({ event: 1, status: 1 });
ticketSchema.index({ user: 1, createdAt: -1 });

const Ticket = mongoose.model('Ticket', ticketSchema);

export default Ticket;
