import { contextBridge } from 'electron'

// Puente mínimo entre la interfaz y el proceso principal.
// Solo exponemos funciones específicas (analizarUrl, analizarArchivo, etc.),
// NUNCA ipcRenderer completo. Por ahora está vacío: se llena en la Fase 1.
const api = {}

contextBridge.exposeInMainWorld('vigia', api)
