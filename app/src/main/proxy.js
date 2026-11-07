// Conexión con el proxy de VigIA (Cloudflare Worker). Lo usan el análisis de links y el de archivos.

import { app } from 'electron'
import { join } from 'path'
import { readFile, writeFile } from 'fs/promises'

const PROXY = 'https://vigia-proxy.vigia-proxy.workers.dev'
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

// ruta: '/check-url' o '/check-hash'. cuerpo: { url } o { sha256 }.
// Devuelve { fuentes, desde_cache } o { problema: texto } si falló.
export async function consultarProxy(ruta, cuerpo) {
  try {
    const respuesta = await fetch(PROXY + ruta, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
        'X-Instalacion-Id': await obtenerIdInstalacion()
      },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(15000)
    })
    if (respuesta.status === 429) return { problema: 'Llegaste al límite de consultas de hoy.' }
    if (!respuesta.ok) return { problema: 'El servicio de VigIA no respondió bien.' }
    return await respuesta.json()
  } catch {
    return { problema: 'No pudimos conectarnos al servicio de VigIA. ¿Tenés internet?' }
  }
}
