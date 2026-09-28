// Forma de un usuario dentro de Aura Events. Desde esta entrega, este
// modelo ya se usa de verdad: cada vez que alguien se registra con
// POST /api/sessions/register, termina creándose un documento con esta
// forma en la base de datos.
//
// Separamos first_name y last_name en vez de un único "name" porque así
// lo pide la consigna de esta entrega, y además es más flexible a futuro
// (por ejemplo, para saludar a alguien por su nombre de pila nada más).

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    first_name: {
      type: String,
      required: true,
    },
    last_name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      // unique:true crea un índice en MongoDB que impide guardar dos
      // documentos con el mismo valor de email. Pero esto solo actúa
      // en el momento de guardar en la base — por las dudas, en el
      // service vamos a chequear el duplicado ANTES de intentar
      // guardar, para poder responder con un mensaje claro (409) en
      // vez de dejar que sea Mongo quien tire un error críptico.
    },
    password: {
      type: String,
      required: true,
      // Importante: acá nunca se guarda la contraseña que escribe la
      // persona. Antes de llegar a este modelo, el service ya la
      // transformó con bcrypt en un "hash" — un texto irreversible que
      // permite comprobar la contraseña más adelante, pero no permite
      // recuperar cuál era la original.
    },
    role: {
      type: String,
      enum: ['user', 'organizer', 'admin'],
      default: 'user',
      // Un usuario común ('user') se anota a eventos. Un 'organizer' va
      // a poder crear y administrar eventos. Un 'admin' va a tener
      // control total de la plataforma. Todo esto es para entregas
      // futuras — por ahora, todo el que se registra entra como 'user',
      // y eso no es negociable desde el registro público: el valor que
      // venga en el body de la petición para "role" se ignora siempre,
      // así nadie puede auto-asignarse el rol de admin mandando
      // { "role": "admin" } en el JSON.
    },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

export default User;
