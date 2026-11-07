// Busca links http/https en un texto (por ejemplo, lo que se copió al portapapeles).
// Se ejecuta en la PC: del texto copiado solo se usan los links, el resto se descarta.

import { limpiarUrl } from './limpiarUrl.js'

const LARGO_MAXIMO_TEXTO = 100000 // textos más largos se ignoran (no es un link copiado)
const MAXIMO_URLS = 5
const PATRON_URL = /https?:\/\/[^\s<>"'`]+/gi

// Devuelve una lista (sin repetidos) de URLs válidas encontradas en el texto.
// shortcut: no detecta links sin http(s):// (como "www.algo.com"); sumar si hace falta.
export function extraerUrls(texto) {
  if (typeof texto !== 'string' || texto.length > LARGO_MAXIMO_TEXTO) return []
  const encontradas = (texto.match(PATRON_URL) ?? [])
    // Signos pegados al final de un link en una oración: "mirá https://a.test/x."
    .map((url) => url.replace(/[.,;:!?)\]}]+$/, ''))
    .filter((url) => limpiarUrl(url) !== null)
  return [...new Set(encontradas)].slice(0, MAXIMO_URLS)
}
