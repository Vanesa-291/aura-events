// Este middleware se ejecuta cuando ninguna ruta del proyecto pudo
// responder a la petición. En vez de dejar que Express devuelva un error
// genérico en HTML, respondemos con un mensaje claro en JSON.

export function notFound(req, res) {
  res.status(404).json({
    status: 'error',
    message: `No existe la ruta ${req.method} ${req.originalUrl}`,
  });
}
