// Limpia una URL antes de mandarla afuera de la PC (CLAUDE.md: "URLs sin parámetros de tracking").
// Lógica pura: no usa Node ni Electron, así se puede testear sola.

// Parámetros que solo sirven para rastrear de dónde vino el clic.
const PARAMETROS_DE_RASTREO = [
  /^utm_/i, // Google Analytics: utm_source, utm_medium, utm_campaign...
  /^(fbclid|gclid|dclid|gbraid|wbraid|msclkid|yclid|ttclid|twclid|igshid|mc_cid|mc_eid|_ga|_gl)$/i
]

const LARGO_MAXIMO = 2048 // el mismo límite que acepta el proxy

// Devuelve la URL limpia como texto, o null si no es una URL http/https válida.
// Saca: parámetros de rastreo, el #fragmento (nunca llega al servidor) y usuario:contraseña.
export function limpiarUrl(texto) {
  if (typeof texto !== 'string' || texto.length > LARGO_MAXIMO) return null
  let url
  try {
    url = new URL(texto.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

  for (const nombre of [...url.searchParams.keys()]) {
    if (PARAMETROS_DE_RASTREO.some((patron) => patron.test(nombre))) url.searchParams.delete(nombre)
  }
  url.hash = ''
  url.username = ''
  url.password = ''
  return url.href
}
