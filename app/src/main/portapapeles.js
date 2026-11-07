// Vigilancia del portapapeles: APAGADA por defecto, la prende el usuario (opt-in).
// Electron no avisa cuando cambia el portapapeles, así que lo revisamos cada 1 segundo.
// Privacidad (CLAUDE.md): todo se procesa acá, en la PC. Solo se usan los links;
// el texto copiado nunca se guarda en disco, nunca se loguea y nunca sale de la PC.

import { clipboard } from 'electron'
import { extraerUrls } from '../core/extraerUrls.js'

const CADA_MS = 1000
let intervalo = null
let ultimoTexto = ''

// webContents: la ventana a la que avisamos. activo: true para prender, false para apagar.
export async function configurarPortapapeles(webContents, activo) {
  clearInterval(intervalo)
  intervalo = null
  if (!activo) return

  // Desde Electron 44, clipboard.readText() es asíncrona (devuelve una promesa): hay que usar await.
  // Lo que ya estaba copiado antes de activar no cuenta: solo lo que se copie de acá en adelante.
  ultimoTexto = await clipboard.readText()
  let leyendo = false
  intervalo = setInterval(async () => {
    if (webContents.isDestroyed()) return configurarPortapapeles(webContents, false)
    if (leyendo) return // si una lectura tarda más de 1 segundo, no las encimamos
    leyendo = true
    try {
      const texto = await clipboard.readText()
      if (texto === ultimoTexto) return
      ultimoTexto = texto

      const urls = extraerUrls(texto)
      // A la interfaz le mandamos SOLO los links, nunca el texto completo.
      if (urls.length > 0) webContents.send('url-copiada', urls)
    } catch {
      // Si no se pudo leer (por ejemplo, otro programa tiene el portapapeles tomado), probamos en 1 s.
    } finally {
      leyendo = false
    }
  }, CADA_MS)
}
