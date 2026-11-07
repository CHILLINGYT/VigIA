// Análisis de un link.
// Flujo: validar → limpiar → señales locales → proxy (3 fuentes) → scoring (veredicto).

import { limpiarUrl } from '../core/limpiarUrl.js'
import { analizarDominio } from '../core/dominiosParecidos.js'
import { calcularVeredicto, FUENTES_LINK } from '../core/scoring.js'
import { consultarProxy } from './proxy.js'

// texto: lo que pegó el usuario (llega por IPC desde la interfaz: NO es confiable).
export async function analizarUrl(texto) {
  const url = limpiarUrl(texto) // valida tipo, largo y que sea http/https
  if (!url)
    return { error: 'Eso no parece un link válido (tiene que empezar con http:// o https://).' }

  // Las señales locales usan el texto original: limpiarUrl borra el "usuario@", que es justo un truco.
  const senales = analizarDominio(texto.trim())
  const proxy = await consultarProxy('/check-url', { url })
  const { veredicto, motivos } = calcularVeredicto(proxy.fuentes, senales, FUENTES_LINK)

  return {
    url,
    veredicto,
    motivos: proxy.problema ? [...motivos, proxy.problema] : motivos,
    desdeCache: proxy.desde_cache === true
  }
}
