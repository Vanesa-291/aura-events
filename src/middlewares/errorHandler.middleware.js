// Middleware de errores: Express lo reconoce por tener estos cuatro
// parámetros (err, req, res, next), aunque acá no usemos "next".
//
// Cualquier error que ocurra en un controlador (por ejemplo, un problema
// al consultar la base de datos, o un error que un service haya lanzado
// a propósito) termina llegando acá gracias a asyncHandler, y este es el
// ÚNICO lugar de todo el proyecto que decide qué status code y qué
// mensaje se le devuelven a quien hizo la petición.
//
// Desde la Pre-entrega 2 distinguimos tres casos:
//
// 1) Body mal formado (JSON inválido): esto no lo detecta nuestro
//    código, sino un middleware interno de Express (express.json())
//    ANTES de que la petición llegue a cualquier controlador. Pasa,
//    por ejemplo, si a alguien se le queda una comilla de más al
//    escribir el body a mano. No es un error del servidor — es un
//    error de quien mandó la petición — así que le corresponde un 400,
//    no un 500. Reconocemos este caso porque Express marca estos
//    errores con err.type === 'entity.parse.failed'.
//
// 2) Errores "esperados" (AppError, ver utils/appError.js): son
//    situaciones que nosotros mismos previmos, como "falta un campo" o
//    "el email ya existe". Vienen con su propio statusCode (400, 409,
//    etc.) y su propio mensaje pensado para mostrarse tal cual.
//
// 3) Errores "inesperados": cualquier otra cosa que se rompa (por
//    ejemplo, que la base de datos no responda). A estos, por
//    seguridad, NUNCA les mostramos el mensaje real a quien usa la API
//    — podría revelar detalles internos del servidor — así que
//    siempre responden 500 con un mensaje genérico. El detalle real
//    solo queda anotado en la consola, para que quien programa lo vea.

export function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    console.error('Error controlado (400): el cuerpo de la petición no es JSON válido');

    return res.status(400).json({
      status: 'error',
      message: 'El cuerpo de la petición no es un JSON válido',
    });
  }

  if (err.isOperational) {
    console.error(`Error controlado (${err.statusCode}):`, err.message);

    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  console.error('Error no controlado:', err.message);

  res.status(500).json({
    status: 'error',
    message: 'Ocurrió un error inesperado en el servidor.',
  });
}
