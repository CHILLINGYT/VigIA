import { contextBridge, ipcRenderer } from 'electron'

// Puente mínimo entre la interfaz y el proceso principal.
// Solo exponemos funciones específicas, NUNCA ipcRenderer completo:
// la interfaz puede pedir "analizá este link" y nada más.
const api = {
  analizarUrl: (texto) => ipcRenderer.invoke('analizar-url', texto)
}

contextBridge.exposeInMainWorld('vigia', api)
