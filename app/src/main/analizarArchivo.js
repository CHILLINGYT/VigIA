// Análisis de un archivo por su "huella digital" (SHA-256).
// Flujo: el usuario elige el archivo en el diálogo de Windows → SHA-256 → proxy → scoring.
// Seguridad (CLAUDE.md): el archivo SOLO se lee para calcular el hash. Nunca se abre,
// nunca se ejecuta y nunca se sube: de la PC sale únicamente el hash.

import { dialog } from 'electron'
import { stat } from 'fs/promises'
import { basename } from 'path'
import { calcularVeredicto, FUENTES_ARCHIVO } from '../core/scoring.js'
import { consultarProxy } from './proxy.js'
import { calcularSha256 } from './hash.js'

// ventana: la ventana de VigIA (el diálogo se abre encima de ella).
// La ruta la elige el usuario en el diálogo nativo de Windows: la interfaz nunca manda una ruta.
export async function analizarArchivo(ventana) {
  const eleccion = await dialog.showOpenDialog(ventana, {
    title: 'Elegí el archivo que querés analizar',
    properties: ['openFile']
  })
  if (eleccion.canceled || eleccion.filePaths.length === 0) return { cancelado: true }
  const ruta = eleccion.filePaths[0]

  let sha256
  try {
    if (!(await stat(ruta)).isFile()) return { error: 'Eso no es un archivo.' }
    sha256 = await calcularSha256(ruta)
  } catch {
    // Por ejemplo: el antivirus lo bloqueó o no tenemos permiso para leerlo.
    return { error: 'No pudimos leer el archivo.' }
  }

  const proxy = await consultarProxy('/check-hash', { sha256 })
  const { veredicto, motivos } = calcularVeredicto(proxy.fuentes, [], FUENTES_ARCHIVO)

  return {
    // Mostramos solo el nombre, no la ruta completa (que puede incluir tu nombre de usuario).
    nombre: basename(ruta),
    sha256,
    veredicto,
    motivos: proxy.problema ? [...motivos, proxy.problema] : motivos,
    desdeCache: proxy.desde_cache === true
  }
}
