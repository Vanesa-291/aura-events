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
