// El chat de VigIA, en dos pasos:
//   1. analizarMensaje: busca links en el mensaje y analiza esos links y los archivos adjuntos.
//      Solo código y reglas: acá NO interviene la IA. Los veredictos salen del scoring.
//   2. responder: le pide a la IA que EXPLIQUE esos veredictos ya decididos.
// Si la IA falla o es manipulada, los veredictos que muestra la pantalla no cambian:
// vienen del paso 1, no de la respuesta de la IA.

import { extraerUrls } from '../core/extraerUrls.js'
import { analizarUrl } from './analizarUrl.js'
import { analizarRuta, elegirArchivo } from './analizarArchivo.js'
import { consultarProxy } from './proxy.js'

const MAXIMO_LINKS = 3 // cada link gasta consultas de VirusTotal (4 por minuto en la cuenta gratis)
const MAXIMO_ADJUNTOS = 3
const MAXIMO_MENSAJES = 20
const LARGO_MAXIMO_MENSAJE = 4000

// Archivos elegidos en el diálogo y todavía no enviados. La interfaz solo conoce un id al azar
// y el nombre: la ruta completa nunca sale del proceso principal.
const adjuntos = new Map()
// Resultados del paso 1, esperando el paso 2.
const analisisPendientes = new Map()

export async function adjuntarArchivo(ventana) {
  const ruta = await elegirArchivo(ventana)
  if (!ruta) return { cancelado: true }
  const id = crypto.randomUUID()
  const nombre = ruta.split(/[\\/]/).pop()
  adjuntos.set(id, { ruta, nombre })
  return { id, nombre }
}

export const quitarAdjunto = (id) => adjuntos.delete(id)

// Paso 1. texto: lo que escribió la persona. ids: adjuntos elegidos antes con adjuntarArchivo.
export async function analizarMensaje(texto, ids) {
  if (typeof texto !== 'string' || texto.length > LARGO_MAXIMO_MENSAJE)
    return { error: 'Mensaje inválido.' }
  if (!Array.isArray(ids) || ids.length > MAXIMO_ADJUNTOS) return { error: 'Adjuntos inválidos.' }
  // Solo aceptamos ids que este proceso entregó: la interfaz no puede inventar archivos.
  const elegidos = ids.map((id) => adjuntos.get(id)).filter(Boolean)
  ids.forEach((id) => adjuntos.delete(id))

  const links = extraerUrls(texto).slice(0, MAXIMO_LINKS)
  const resultados = await Promise.all([
    ...links.map((link) => analizarUrl(link)),
    ...elegidos.map(({ ruta }) => analizarRuta(ruta))
  ])
  const id = crypto.randomUUID()
  analisisPendientes.set(id, resultados)
  return { id, analisis: resultados }
}

// Paso 2. historial: [{ rol: 'usuario' | 'asistente', texto }], el último es el mensaje nuevo.
// idAnalisis: el id que devolvió analizarMensaje para ese mensaje.
export async function responder(historial, idAnalisis) {
  const valido =
    Array.isArray(historial) &&
    historial.length > 0 &&
    historial.length <= MAXIMO_MENSAJES &&
    historial.every(
      (m) =>
        (m?.rol === 'usuario' || m?.rol === 'asistente') &&
        typeof m.texto === 'string' &&
        m.texto.length > 0 &&
        m.texto.length <= LARGO_MAXIMO_MENSAJE
    ) &&
    historial.at(-1).rol === 'usuario'
  if (!valido) return { error: 'Conversación inválida.' }

  const resultados = analisisPendientes.get(idAnalisis) ?? []
  analisisPendientes.delete(idAnalisis)
  // A la IA le mandamos solo lo necesario: tipo, link o nombre, veredicto y motivos. Nunca la ruta.
  const analisis = resultados
    .filter((r) => !r.error)
    .map(({ tipo, objetivo, veredicto, motivos }) => ({ tipo, objetivo, veredicto, motivos }))

  const proxy = await consultarProxy('/chat', { historial, analisis })
  if (proxy.problema || typeof proxy.respuesta !== 'string') {
    return {
      error:
        resultados.length > 0
          ? 'No pude escribir la explicación ahora, pero el veredicto de arriba es el que calcularon los motores de análisis.'
          : 'No pude responder ahora. Probá de nuevo en un rato.'
    }
  }
  return { respuesta: proxy.respuesta }
}
