// Análisis de un link.
// Flujo: validar → limpiar → señales locales → proxy (3 fuentes) → scoring (veredicto).

import { limpiarUrl } from '../core/limpiarUrl.js'
import { analizarDominio } from '../core/dominiosParecidos.js'
import { calcularVeredicto, FUENTES_LINK } from '../core/scoring.js'
import { consultarProxy } from './proxy.js'
import { resumirFuentes } from './analizarArchivo.js'

// texto: el link (sale del mensaje de la persona: NO es confiable).
export async function analizarUrl(texto) {
  const url = limpiarUrl(texto) // valida tipo, largo y que sea http/https
  if (!url)
    return {
      tipo: 'link',
      objetivo: String(texto).slice(0, 200),
      error: 'Eso no parece un link válido (tiene que empezar con http:// o https://).'
    }

  // Las señales locales usan el texto original: limpiarUrl borra el "usuario@", que es justo un truco.
  const senales = analizarDominio(texto.trim())
  const proxy = await consultarProxy('/check-url', { url })
  const { veredicto, motivos } = calcularVeredicto(proxy.fuentes, senales, FUENTES_LINK)

  return {
    tipo: 'link',
    objetivo: url,
    veredicto,
    motivos: proxy.problema ? [...motivos, proxy.problema] : motivos,
    // El último anillo son las reglas propias de VigIA (dominios parecidos, truco del @, etc.).
    fuentes: [
      ...resumirFuentes(proxy.fuentes, FUENTES_LINK),
      { fuente: 'reglas_vigia', resultado: senales.length > 0 ? 'detectado' : 'no_detectado' }
    ],
    desdeCache: proxy.desde_cache === true
  }
}
