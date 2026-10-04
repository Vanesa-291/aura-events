// Igual que utils/hash.js concentra todo lo relacionado a bcrypt, este
// archivo concentra todo lo relacionado a JWT (JSON Web Token): firmar
// uno nuevo (signToken) y comprobar que uno recibido sea válido
// (verifyToken). La consigna pide explícitamente que esta lógica viva
// en utils/ y no en la ruta ni en el controller — así, el día de mañana
// que haya que cambiar, por ejemplo, el algoritmo de firma, es un
// cambio en un solo lugar.
//
// ¿Qué es un JWT, en criollo? Es un "carnet" firmado digitalmente. El
// servidor lo firma con una clave secreta (JWT_SECRET) que solo él
// conoce, y se lo entrega a quien inició sesión. Ese carnet lleva
// adentro algunos datos (en este proyecto: id, email y role) y una
// fecha de vencimiento. Cualquiera puede LEER lo que dice el carnet
// (no está encriptado, solo codificado), pero nadie puede FALSIFICARLO
// sin conocer la clave secreta — si alguien le cambia una letra al
// carnet, la firma deja de coincidir y verifyToken lo va a rechazar.
// Por eso nunca metemos la contraseña (ni su hash) adentro del token:
// no hace falta ocultar el contenido, pero tampoco hay que exponer de
// más.

import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/env.config.js';

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// jwt.verify() hace dos cosas a la vez: comprueba que la firma sea
// válida (que nadie lo haya alterado) Y que no esté vencido. Si
// cualquiera de las dos cosas falla, lanza un error — no devuelve
// null ni false, lanza una excepción — así que quien use esta función
// tiene que estar preparado para un try/catch (eso lo hace el
// middleware de autenticación, no esta función).
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
