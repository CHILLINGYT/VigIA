import { contextBridge, ipcRenderer } from 'electron'

// Puente mínimo entre la interfaz y el proceso principal.
// Solo exponemos funciones específicas, NUNCA ipcRenderer completo.
const api = {
  analizarUrl: (texto) => ipcRenderer.invoke('analizar-url', texto),

  // Abre el diálogo de Windows para elegir un archivo y lo analiza por su hash.
  // No recibe ninguna ruta: la elige el usuario en el diálogo.
  analizarArchivo: () => ipcRenderer.invoke('analizar-archivo'),

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
