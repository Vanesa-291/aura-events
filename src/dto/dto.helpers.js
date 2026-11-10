// Herramientas chiquitas que comparten los DTO. Los DTO (Data Transfer
// Object) son los que deciden QUÉ datos de cada recurso viajan en una
// respuesta HTTP. Funcionan como una lista blanca: solo salen los campos que
// se nombran; todo lo demás (por ejemplo "password") se queda adentro, aunque
// el documento de la base lo tenga.

// Los documentos de Mongoose se convierten a objeto común; si ya es un objeto
// común (por ejemplo, lo que devuelve el JWT), se deja como está.
export function toPlain(doc) {
  return doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
}

// Copia solo los campos pedidos. Si un campo no existe en el origen, no se
// agrega (así la respuesta no se llena de "undefined").
export function pick(source, fields) {
  const result = {};

  for (const field of fields) {
    if (source[field] !== undefined) {
      result[field] = source[field];
    }
  }

  return result;
}

// Un campo que referencia a otro documento puede llegar de dos formas: solo
// el id (sin populate) o el documento ya completado (con populate). Esta
// función distingue los dos casos: un ObjectId NO cuenta como "completado".
export function isPopulated(value) {
  return value !== null && typeof value === 'object' && value._bsontype !== 'ObjectId';
}

// Si el campo viene completado con populate, se filtra con la lista blanca
// que le corresponde; si viene como id (o null), se deja tal cual.
export function filterRelation(value, fields) {
  return isPopulated(value) ? pick(toPlain(value), fields) : value;
}
