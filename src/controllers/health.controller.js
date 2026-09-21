// Este endpoint existe para que cualquiera (una herramienta de monitoreo,
// el propio profesor, o nosotras mismas) pueda comprobar rápido que el
// servidor está corriendo, sin tener que consultar nada más.

export const getHealth = (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Servidor activo',
  });
};
