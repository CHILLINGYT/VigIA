import { contextBridge, ipcRenderer } from 'electron'

// Puente mínimo entre la interfaz y el proceso principal.
// Solo exponemos funciones específicas, NUNCA ipcRenderer completo.
const api = {
  // Abre el diálogo de Windows para elegir un archivo. Devuelve { id, nombre } o { cancelado }.
  // No recibe ninguna ruta: la elige el usuario en el diálogo.
  adjuntarArchivo: () => ipcRenderer.invoke('adjuntar-archivo'),
  quitarAdjunto: (id) => ipcRenderer.invoke('quitar-adjunto', id),

  // Paso 1 del chat: analiza los links del mensaje y los adjuntos (sin IA). Devuelve { id, analisis }.
  analizarMensaje: (texto, idsAdjuntos) =>
    ipcRenderer.invoke('analizar-mensaje', texto, idsAdjuntos),
  // Paso 2 del chat: la IA explica los veredictos del paso 1. Devuelve { respuesta } o { error }.
  responder: (historial, idAnalisis) => ipcRenderer.invoke('responder', historial, idAnalisis),

  // Estado de Microsoft Defender: { estado, puedeEscanear, aviso }.
  estadoDefender: () => ipcRenderer.invoke('estado-defender'),
  // Amenazas que Defender ya registró: { ok, amenazas, resumen, conclusion }. No escanea nada nuevo.
  historialDefender: () => ipcRenderer.invoke('historial-defender'),

  // Prende o apaga la vigilancia del portapapeles (true / false).
  vigilarPortapapeles: (activo) => ipcRenderer.invoke('portapapeles', activo),

  // Avisa cuando se copia un link. Devuelve una función para dejar de escuchar.
  // Al callback le llega solo la lista de URLs, nunca el evento de Electron.
  alCopiarUrl: (callback) => {
    if (typeof callback !== 'function') return () => {}
    const escuchar = (_evento, urls) => callback(urls)
    ipcRenderer.on('url-copiada', escuchar)
    return () => ipcRenderer.removeListener('url-copiada', escuchar)
  }
}

contextBridge.exposeInMainWorld('vigia', api)
