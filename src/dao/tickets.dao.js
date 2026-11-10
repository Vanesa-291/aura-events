// El DAO de tickets es, igual que los de eventos y usuarios, la única capa
// que conversa directamente con MongoDB, y el único archivo que importa el
// modelo Ticket. Acá no hay reglas de negocio: solo operaciones genéricas.
// Qué se considera "cupo ocupado" o "ticket activo" lo decide el repository
// (con nombres del dominio) y las reglas que se hacen con eso, el service.

import Ticket from '../models/Ticket.js';
// Se importan los modelos que se usan en populate() para asegurarnos de que
// estén registrados en Mongoose antes de la primera consulta.
import '../models/Event.js';
import '../models/User.js';

// Los estados de un ticket viven junto al modelo. Se vuelven a exportar
// desde acá para que las capas de arriba los puedan usar sin importar el
// modelo directamente.
export { TICKET_STATUSES, ACTIVE_TICKET_STATUSES } from '../models/Ticket.js';

class TicketsDAO {
  async create(ticketData) {
    return await Ticket.create(ticketData);
  }

  async findById(id) {
    return await Ticket.findById(id);
  }

  // Trae los tickets que cumplan el filtro. Opciones:
  //
  //   sort     → orden, por ejemplo { createdAt: -1 } (más nuevos primero)
  //   populate → qué datos completar de los documentos relacionados, por
  //              ejemplo { path: 'event', select: 'title date location' }:
  //              reemplaza el id del evento por esos tres campos (así no se
  //              trae de más).
  async find(filter = {}, { sort, populate } = {}) {
    let query = Ticket.find(filter);

    if (sort) query = query.sort(sort);
    if (populate) query = query.populate(populate);

    return await query;
  }

  async count(filter = {}) {
    return await Ticket.countDocuments(filter);
  }

  // Suma el valor de un campo numérico (por ejemplo "quantity") de todos los
  // tickets que cumplan el filtro. Devuelve 0 si no hay ninguno.
  // aggregate() no convierte los ids de texto a ObjectId por su cuenta
  // (find() sí), así que primero se le pide a Mongoose que castee el filtro.
  async sum(field, filter = {}) {
    const castFilter = Ticket.find(filter).cast(Ticket);

    const result = await Ticket.aggregate([
      { $match: castFilter },
      { $group: { _id: null, total: { $sum: `$${field}` } } },
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  // Actualiza UN ticket que cumpla el filtro y devuelve el ya actualizado (o
  // null si ninguno lo cumplía). Que el filtro pueda incluir una condición
  // sobre el estado hace que dos pedidos simultáneos no se pisen: solo uno
  // logra el cambio y el otro recibe null.
  async updateOne(filter, changes) {
    return await Ticket.findOneAndUpdate(filter, changes, {
      new: true,
      runValidators: true,
    });
  }
}

export default TicketsDAO;
