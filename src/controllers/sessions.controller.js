// Todavía no hay lógica de autenticación: esto es solo un aviso honesto
// de que la ruta existe y está preparada, para que en la próxima entrega
// solo haya que completar el login, el registro y el manejo de sesión.

export const sessionsPlaceholder = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Módulo de sesiones preparado. La autenticación se implementa en una próxima entrega.',
  });
};
