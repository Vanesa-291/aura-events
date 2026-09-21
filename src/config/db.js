// Todo lo relacionado con conectarse a la base de datos vive acá. El resto
// del proyecto solo llama a connectDB() y no necesita saber los detalles
// de cómo se arma esa conexión.

import mongoose from 'mongoose';
import { MONGO_URL } from './env.config.js';

export async function connectDB() {
  await mongoose.connect(MONGO_URL);
  console.log('Conexión a MongoDB establecida correctamente.');
}
