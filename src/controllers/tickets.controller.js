// El controlador solo traduce entre HTTP y el resto del proyecto: lee lo que
// llega en la petición, le pide al service lo que necesita y arma la
// respuesta. Ninguna regla de negocio (cupos, duplicados, permisos) se
// decide acá: está todo en tickets.service.js.
//
// req.user lo dejó el middleware authenticate (datos del JWT). Se le pasa
// al service para que sepa QUIÉN está haciendo la acción.

import TicketsService from '../services/tickets.service.js';

const service = new TicketsService();

// Inscribirse a un evento. Responde 201 con el ticket y, aparte, si el email
// de confirmación se pudo enviar (emailSent).
export const createTicket = async (req, res) => {
  const { ticket, emailSent } = await service.createTicket(
    req.params.eid,
    req.body,
    req.user
  );

  res.status(201).json({
    status: 'success',
    payload: ticket,
    emailSent,
  });
};

export const getMyTickets = async (req, res) => {
  const tickets = await service.getMyTickets(req.user);

  res.status(200).json({
    status: 'success',
    payload: tickets,
  });
};

export const getEventTickets = async (req, res) => {
  const { tickets, summary } = await service.getEventTickets(
    req.params.eid,
    req.query,
    req.user
  );

  res.status(200).json({
    status: 'success',
    payload: tickets,
    summary,
  });
};

export const cancelTicket = async (req, res) => {
  const ticket = await service.cancelTicket(req.params.tid, req.user);

  res.status(200).json({
    status: 'success',
    payload: ticket,
  });
};
