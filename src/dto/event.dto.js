// DTO de evento: define los campos de un evento que viajan en las
// respuestas. "organizer" es normalmente solo el id de quien lo creó; si
// alguna vez llegara completado con populate, solo saldrían su id y nombre
// (nunca su email, rol ni password).

import { toPlain, pick, filterRelation } from './dto.helpers.js';

const EVENT_FIELDS = [
  '_id',
  'title',
  'description',
  'category',
  'date',
  'location',
  'capacity',
  'price',
  'status',
  'organizer',
  'createdAt',
  'updatedAt',
];

const ORGANIZER_FIELDS = ['_id', 'first_name', 'last_name'];

export class EventDTO {
  constructor(event) {
    const plain = toPlain(event);

    Object.assign(this, pick(plain, EVENT_FIELDS));

    if (plain.organizer !== undefined) {
      this.organizer = filterRelation(plain.organizer, ORGANIZER_FIELDS);
    }
  }

  static fromList(events) {
    return events.map((event) => new EventDTO(event));
  }
}
