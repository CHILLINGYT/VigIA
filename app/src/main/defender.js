// Estado de Microsoft Defender en esta PC (Get-MpComputerStatus).
// Seguridad (CLAUDE.md): comandos de Windows con execFile y argumentos en una lista,
// nunca armando un texto para la consola. El comando es fijo: no lleva datos del usuario.

import { execFile } from 'child_process'
import { join } from 'path'
import { interpretarEstadoDefender } from '../core/estadoDefender.js'

// Ruta completa: si escribiéramos solo "powershell.exe", Windows lo buscaría en el PATH
// y otro programa podría hacerse pasar por PowerShell.
const POWERSHELL = join(
  process.env.SystemRoot ?? 'C:\\Windows',
  'System32',
  'WindowsPowerShell',
  'v1.0',
  'powershell.exe'
)

function leerEstado() {
  return new Promise((resolve) => {
    execFile(
      POWERSHELL,
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        'Get-MpComputerStatus | Select-Object AMRunningMode, AntivirusEnabled, RealTimeProtectionEnabled | ConvertTo-Json'
      ],
      { timeout: 20000, windowsHide: true },
      (error, salida) => {
        if (error) return resolve(null) // por ejemplo: Defender desinstalado o sin permisos
        try {
          resolve(JSON.parse(salida))
        } catch {
          resolve(null)
        }
      }
    )
  })
}

// Se lee una vez al iniciar la app (CLAUDE.md) y se reutiliza.
let estado = null
export function estadoDefender() {
  estado ??= leerEstado().then(interpretarEstadoDefender)
  return estado
}
