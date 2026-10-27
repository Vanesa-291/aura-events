// El controlador solo se ocupa de traducir entre HTTP y el resto del
// proyecto: lee lo que llega en la petición, le pide al service lo que
// necesita, y arma la respuesta. No toma decisiones de negocio acá.

import EventsService from '../services/events.service.js';

const service = new EventsService();

// Listado con filtros, paginación y orden. Los parámetros llegan en la
// URL (req.query), por ejemplo ?status=published&page=2&limit=5. A
// diferencia del resto de las respuestas, esta lleva los datos en "data" y
// al lado la información de paginación (page, limit, total, totalPages).
//
// req.user existe solo si quien consulta tiene sesión (ver
// authenticateOptional en el router): sirve para que el service decida si
// puede ver borradores.
export const getEvents = async (req, res) => {
  const result = await service.getEvents(req.query, req.user);

  res.status(200).json({
    status: 'success',
    ...result,
  });
};

export const getEventById = async (req, res) => {
  const event = await service.getEventById(req.params.id, req.user);

  res.status(200).json({
    status: 'success',
    payload: event,
  });
};

// req.user lo dejó el middleware authenticate (datos del JWT). Se le
// pasa al service para que sepa QUIÉN está haciendo la acción.
export const createEvent = async (req, res) => {
  const event = await service.createEvent(req.body, req.user);

  res.status(201).json({
    status: 'success',
    payload: event,
  });
};

export const updateEvent = async (req, res) => {
  const event = await service.updateEvent(req.params.id, req.body, req.user);

  res.status(200).json({
    status: 'success',
    payload: event,
  });
};

export const updateEventStatus = async (req, res) => {
  const event = await service.updateEventStatus(req.params.id, req.body, req.user);

  res.status(200).json({
    status: 'success',
    payload: event,
  });
};
