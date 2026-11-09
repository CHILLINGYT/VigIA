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

// Abre el diálogo nativo de Windows. Devuelve la ruta elegida o null si canceló.
// La ruta la elige el usuario: la interfaz nunca manda una ruta.
export async function elegirArchivo(ventana) {
  const eleccion = await dialog.showOpenDialog(ventana, {
    title: 'Elegí el archivo que querés analizar',
    properties: ['openFile']
  })
  return eleccion.canceled || eleccion.filePaths.length === 0 ? null : eleccion.filePaths[0]
}

// Lo que respondió cada fuente, en un orden fijo (son los anillos del sello en la interfaz).
// Una fuente que no aparece (por ejemplo, el proxy no respondió) cuenta como 'error'.
export const resumirFuentes = (fuentes, esperadas) =>
  esperadas.map((nombre) => ({
    fuente: nombre,
    resultado: fuentes?.find((f) => f?.fuente === nombre)?.resultado ?? 'error'
  }))

// ruta: un archivo elegido por el usuario en el diálogo.
export async function analizarRuta(ruta) {
  // Mostramos solo el nombre, no la ruta completa (que puede incluir tu nombre de usuario).
  const nombre = basename(ruta)
  let sha256
  try {
    if (!(await stat(ruta)).isFile())
      return { tipo: 'archivo', objetivo: nombre, error: 'Eso no es un archivo.' }
    sha256 = await calcularSha256(ruta)
  } catch {
    // Por ejemplo: el antivirus lo bloqueó o no tenemos permiso para leerlo.
    return { tipo: 'archivo', objetivo: nombre, error: 'No pudimos leer el archivo.' }
  }

  const proxy = await consultarProxy('/check-hash', { sha256 })
  const { veredicto, motivos } = calcularVeredicto(proxy.fuentes, [], FUENTES_ARCHIVO)

  return {
    tipo: 'archivo',
    objetivo: nombre,
    huella: sha256,
    veredicto,
    motivos: proxy.problema ? [...motivos, proxy.problema] : motivos,
    fuentes: resumirFuentes(proxy.fuentes, FUENTES_ARCHIVO),
    desdeCache: proxy.desde_cache === true
  }
}
