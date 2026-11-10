// DTO de ticket (inscripción). "user" y "event" son normalmente solo ids. Con
// populate llegan completados, y en ese caso el DTO también filtra esos
// documentos relacionados:
//
//   • event → solo id, título, fecha y lugar
//   • user  → solo id, nombre, apellido y email (jamás password ni rol)

import { toPlain, pick, filterRelation } from './dto.helpers.js';

const TICKET_FIELDS = [
  '_id',
  'user',
  'event',
  'status',
  'quantity',
  'reservationCode',
  'cancelledAt',
  'createdAt',
  'updatedAt',
];

const TICKET_USER_FIELDS = ['_id', 'first_name', 'last_name', 'email'];
const TICKET_EVENT_FIELDS = ['_id', 'title', 'date', 'location'];

export class TicketDTO {
  constructor(ticket) {
    const plain = toPlain(ticket);

    Object.assign(this, pick(plain, TICKET_FIELDS));

    if (plain.user !== undefined) {
      this.user = filterRelation(plain.user, TICKET_USER_FIELDS);
    }

    if (plain.event !== undefined) {
      this.event = filterRelation(plain.event, TICKET_EVENT_FIELDS);
    }
  }

  static fromList(tickets) {
    return tickets.map((ticket) => new TicketDTO(ticket));
  }
}
