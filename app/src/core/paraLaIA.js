// Qué parte de cada análisis le mandamos a la IA: tipo, qué se analizó, veredicto y motivos.
// Nunca rutas, nunca el contenido de un archivo o de un mail (CLAUDE.md: al LLM van las
// señales y el veredicto). De un archivo, solo su tipo; de un mail, solo "un mail"
// (el asunto o el nombre pueden tener datos personales).
import { archivoParaIA } from './archivoParaIA.js'

export function paraLaIA(resultados) {
  return (Array.isArray(resultados) ? resultados : [])
    .filter((r) => r && !r.error)
    .map(({ tipo, objetivo, veredicto, motivos }) => ({
      tipo,
      objetivo:
        tipo === 'archivo' ? archivoParaIA(objetivo) : tipo === 'mail' ? 'un mail' : objetivo,
      veredicto,
      motivos
    }))
}
