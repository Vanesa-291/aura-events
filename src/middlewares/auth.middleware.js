// Este middleware es el "guardia de seguridad" de las rutas protegidas.
// Se coloca ANTES del controller de la ruta que queremos proteger (por
// ejemplo, GET /api/sessions/current), y hace tres cosas, en orden:
//
//   1) Busca la cookie "currentUser" en la petición.
//   2) Si está, intenta verificar que el token adentro sea válido.
//   3) Si todo salió bien, deja los datos del usuario en req.user y
//      llama a next() para que la petición siga su curso normal hacia
//      el controller. Si algo falló en cualquiera de los dos pasos
//      anteriores, corta acá mismo con un 401 — el controller de la
//      ruta protegida ni se llega a ejecutar.
//
// Fíjate que NO usamos asyncHandler acá, a pesar de que jwt.verify()
// podría "fallar": es una decisión a propósito. asyncHandler existe
// para mandar los errores al errorHandler con next(err), pero acá no
// queremos tratar "token inválido" como un error inesperado del
// servidor (eso daría 500) — es una situación esperada y normal
// ("no estás autenticado"), así que la atajamos nosotros mismos con un
// try/catch y respondemos 401 directamente, sin pasar por el
// errorHandler.

import { verifyToken } from '../utils/jwt.js';

export function auth(req, res, next) {
  const token = req.cookies?.currentUser;

  // Caso 1: no hay cookie en absoluto (nunca inició sesión, o la cookie
  // venció y el navegador ya la descartó, o hizo logout).
  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'No autenticado',
    });
  }

  try {
    // verifyToken comprueba, en un solo paso, que la firma sea válida
    // (que el token realmente lo hayamos emitido nosotros, con nuestra
    // JWT_SECRET, y que nadie le haya cambiado ni un carácter) y que no
    // esté vencido. Si cualquiera de las dos cosas falla, lanza una
    // excepción — por eso está dentro de este try.
    const payload = verifyToken(token);

    // A partir de acá, cualquier controller que venga después de este
    // middleware en la misma ruta (como "current") puede leer
    // req.user y confiar en que esos datos son genuinos: ya pasaron
    // por la verificación de la firma.
    req.user = payload;

    next();
  } catch (err) {
    // Acá caen dos situaciones distintas: un token manipulado (la firma
    // no coincide) y un token vencido (expiró el tiempo de
    // JWT_EXPIRES_IN). En ambos casos respondemos exactamente lo mismo
    // — por la misma razón de seguridad que ya vimos en el login: no
    // conviene darle a quien hace la petición información de más sobre
    // por qué, específicamente, falló.
    return res.status(401).json({
      status: 'error',
      message: 'No autenticado',
    });
  }
}
