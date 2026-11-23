// Bloques LZ4 de texto ASCII. La longitud permite reservar la memoria una sola vez.
function bloqueNCG(base64, length) {
  const input = atob(base64);
  const output = new Uint8Array(length);
  let src = 0, dst = 0;
  function readLength(value) {
    if (value < 15) return value;
    let extra;
    do {
      if (src >= input.length) throw Error('Trazo incompleto');
      extra = input.charCodeAt(src++);
      value += extra;
    } while (extra === 255);
    return value;
  }
  while (src < input.length) {
    const token = input.charCodeAt(src++);
    let literals = readLength(token >> 4);
    if (src + literals > input.length || dst + literals > length) throw Error('Trazo inválido');
    while (literals--) output[dst++] = input.charCodeAt(src++);
    if (src === input.length) break;
    if (src + 2 > input.length) throw Error('Trazo incompleto: desplazamiento LZ4 truncado');
    const offset = input.charCodeAt(src++) | (input.charCodeAt(src++) << 8);
    let same = readLength(token & 15) + 4;
    if (!offset || offset > dst || dst + same > length) throw Error('Referencia de trazo inválida');
    while (same--) { output[dst] = output[dst - offset]; dst++; }
  }
  if (dst !== length) throw Error('Longitud de trazo incorrecta');
  return output;
}

// Cada contorno contiene un número de puntos, seguido de pares de diferencias
// en décimas de unidad. Las diferencias con signo se guardan como varints.
function contornoNCG(base64) {
  const bytes = Uint8Array.from(atob(base64), ch => ch.charCodeAt(0));
  let cursor = 0;
  function integer() {
    let value = 0, shift = 0, byte;
    do {
      if (cursor >= bytes.length || shift > 28) throw Error('Coordenada inválida');
      byte = bytes[cursor++];
      value += (byte & 127) * 2 ** shift;
      shift += 7;
    } while (byte & 128);
    return value;
  }
  function delta() {
    const v = integer();
    return (v & 1) ? -(v + 1) / 2 : v / 2;
  }
  const contours = [];
  while (cursor < bytes.length) {
    const count = integer(), points = [];
    let x = 0, y = 0;
    for (let n = 0; n < count; n++) {
      x += delta(); y += delta();
      points.push(x / 10 + ',' + y / 10);
    }
    contours.push('M' + points.join(' ') + 'Z');
  }
  return contours.join('');
}
function trazoNCG(base64, length) {
  return new TextDecoder().decode(bloqueNCG(base64, length));
}
