// Las transacciones de MongoDB también son "hablar con la base", así que
// viven en la capa de DAO (la única que conoce Mongoose). Una transacción
// agrupa varias operaciones para que se comporten como UNA sola: o se
// aplican todas juntas o no se aplica ninguna, y mientras dura, nadie más
// ve a medias lo que se está haciendo.
//
// runInTransaction(trabajo) ejecuta la función "trabajo" dentro de una
// transacción y devuelve lo que esa función devuelva:
//
//   • A "trabajo" se le pasa un objeto opaco ("tx"). Las capas de arriba no
//     saben qué es: solo se lo van pasando a cada operación que tiene que
//     formar parte de la transacción (en los DAOs se usa como la "session"
//     de Mongo).
//   • Si "trabajo" termina bien, se confirma (commit). Si lanza un error,
//     se deshace todo (rollback) y el error se propaga tal cual.
//   • Si Mongo avisa que la transacción chocó con otra que tocaba el mismo
//     documento (un error transitorio), se descarta y "trabajo" se ejecuta
//     de nuevo desde cero. Por eso "trabajo" no debe tener efectos fuera de
//     la base (como mandar un mail): puede correr más de una vez.
//
// Requiere una base con réplicas (un "replica set"), como MongoDB Atlas,
// incluido el cluster gratuito M0.

import mongoose from 'mongoose';

export async function runInTransaction(work) {
  return await mongoose.connection.transaction(async (session) => work(session));
}
