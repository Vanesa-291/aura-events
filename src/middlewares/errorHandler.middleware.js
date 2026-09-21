// Middleware de errores: Express lo reconoce por tener estos cuatro
// parámetros (err, req, res, next), aunque acá no usemos "next".
//
// Cualquier error que ocurra en un controlador (por ejemplo, un problema
// al consultar la base de datos) termina llegando acá gracias a
// asyncHandler, y se responde siempre con el mismo formato prolijo.

export function errorHandler(err, req, res, next) {
  console.error('Error no controlado:', err.message);

  res.status(500).json({
    status: 'error',
    message: 'Ocurrió un error inesperado en el servidor.',
  });
}
