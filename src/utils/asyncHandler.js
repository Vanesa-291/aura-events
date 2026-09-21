// Ayudante chiquito pero muy usado en proyectos con Express: envuelve una
// función de controlador que usa async/await, y si algo falla adentro,
// automáticamente se lo pasa al middleware de errores en vez de que el
// servidor se quede colgado sin responder.
//
// Uso: router.get('/', asyncHandler(miControlador))

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
