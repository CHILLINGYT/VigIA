// Análisis de un link: lo único que la interfaz puede pedirle al proceso principal por ahora.
// Flujo: validar → limpiar → señales locales → proxy (3 fuentes) → scoring (veredicto).

import { app } from 'electron'
import { join } from 'path'
import { readFile, writeFile } from 'fs/promises'
import { limpiarUrl } from '../core/limpiarUrl.js'
import { analizarDominio } from '../core/dominiosParecidos.js'
import { calcularVeredicto } from '../core/scoring.js'

const PROXY = 'https://vigia-proxy.vigia-proxy.workers.dev/check-url'
// El token viaja dentro de la app: es una barrera contra abusos, no seguridad fuerte (CLAUDE.md).
const TOKEN = import.meta.env.MAIN_VITE_APP_TOKEN

// ID de instalación: un UUID al azar que se crea la primera vez y se guarda en la carpeta de la app.
// No identifica a la persona: solo sirve para el límite diario del proxy.
let idInstalacion = null
async function obtenerIdInstalacion() {
  if (idInstalacion) return idInstalacion
  const archivo = join(app.getPath('userData'), 'instalacion.json')
  try {
    idInstalacion = JSON.parse(await readFile(archivo, 'utf8')).id
  } catch {
    idInstalacion = crypto.randomUUID()
    await writeFile(archivo, JSON.stringify({ id: idInstalacion }))
  }
  return idInstalacion
}

// Le pregunta al proxy. Devuelve { fuentes, desde_cache } o { problema: texto } si falló.
async function consultarProxy(url) {
  try {
    const respuesta = await fetch(PROXY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
        'X-Instalacion-Id': await obtenerIdInstalacion()
      },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(15000)
    })
    if (respuesta.status === 429) return { problema: 'Llegaste al límite de consultas de hoy.' }
    if (!respuesta.ok) return { problema: 'El servicio de VigIA no respondió bien.' }
    return await respuesta.json()
  } catch {
    return { problema: 'No pudimos conectarnos al servicio de VigIA. ¿Tenés internet?' }
  }
}

// texto: lo que pegó el usuario (llega por IPC desde la interfaz: NO es confiable).
export async function analizarUrl(texto) {
  const url = limpiarUrl(texto) // valida tipo, largo y que sea http/https
  if (!url)
    return { error: 'Eso no parece un link válido (tiene que empezar con http:// o https://).' }

  // Las señales locales usan el texto original: limpiarUrl borra el "usuario@", que es justo un truco.
  const senales = analizarDominio(texto.trim())
  const proxy = await consultarProxy(url)
  const { veredicto, motivos } = calcularVeredicto(proxy.fuentes, senales)

  return {
    url,
    veredicto,
    motivos: proxy.problema ? [...motivos, proxy.problema] : motivos,
    desdeCache: proxy.desde_cache === true
  }
}
