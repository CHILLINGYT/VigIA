// ¿La persona está pidiendo revisar su PC? Regla fija (no la IA): si coincide, el chat
// arranca el escaneo rápido de Defender en vez de mandarle el mensaje al modelo,
// que no puede escanear nada.
//
// Es a propósito simple: puede no reconocer alguna forma rara de pedirlo
// (para eso están los botones del costado), pero nunca escanea por algo que no lo pidió.

const sinTildes = (texto) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

const VERBO = /\b(escane\w*|analiz\w*|revis\w*|cheque\w*|controla\w*|limpia\w*|fijate)\b/
const PC = /\b(pc|compu|computadora|notebook|laptop|maquina)\b|\btodos (mis|los) archivos\b/
const INFECCION = /\btengo (un |algun |algo de )?(virus|malware|troyano)/

export function esPedidoDeEscaneo(texto) {
  if (typeof texto !== 'string') return false
  // Si hay un link, lo que quiere es revisar el link (eso ya lo hace el chat).
  if (/https?:\/\//i.test(texto)) return false
  const t = sinTildes(texto)
  return (VERBO.test(t) && PC.test(t)) || INFECCION.test(t)
}
