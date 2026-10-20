// El controlador solo se ocupa de traducir entre HTTP y el resto del
// proyecto: lee lo que llega en la petición, le pide al service lo que
// necesita, y arma la respuesta. No toma decisiones de negocio acá.

import EventsService from '../services/events.service.js';

const service = new EventsService();

export const getEvents = async (req, res) => {
  const events = await service.getEvents();

  res.status(200).json({
    status: 'success',
    payload: events,
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

export const cancelEvent = async (req, res) => {
  const event = await service.cancelEvent(req.params.id, req.user);

  res.status(200).json({
    status: 'success',
    payload: event,
  });
};
