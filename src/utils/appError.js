// Hasta la Pre-entrega 1, el único tipo de error que existía era "algo
// salió mal en el servidor" (500). Pero un registro puede fallar por
// motivos que NO son un error del servidor: faltan campos, el email
// tiene un formato inválido, o el email ya está registrado. Esos son
// errores esperables, previsibles, y cada uno necesita su propio código
// de estado HTTP (400, 409) y su propio mensaje claro para quien use
// la API.
//
// AppError es una manera prolija de "viajar" esa información desde el
// service (que es donde se detecta el problema) hasta el errorHandler
// (que es el único lugar de todo el proyecto que arma la respuesta de
// error), sin que el service tenga que conocer nada de Express — el
// service solo hace "throw new AppError('mensaje', codigo)" y se
// desentiende del resto.

export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;

    // Esta marca nos permite, en el errorHandler, distinguir entre "un
    // error que nosotros mismos previmos y etiquetamos con cuidado"
    // (isOperational = true) y "un error inesperado que no supimos
    // anticipar" (por ejemplo, que se caiga la conexión a MongoDB). A
    // los primeros los mostramos tal cual, con su mensaje real; a los
    // segundos, por seguridad, los mostramos con un mensaje genérico y
    // el detalle real solo queda en la consola del servidor.
    this.isOperational = true;
  }
}
