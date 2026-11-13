// Estado de Microsoft Defender en esta PC (Get-MpComputerStatus).
// Seguridad (CLAUDE.md): comandos de Windows con execFile y argumentos en una lista,
// nunca armando un texto para la consola. El comando es fijo: no lleva datos del usuario.

import { execFile } from 'child_process'
import { join } from 'path'
import { interpretarEstadoDefender } from '../core/estadoDefender.js'
import { interpretarHistorial } from '../core/historialDefender.js'

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

// Historial de amenazas que Defender encontró en esta PC (Get-MpThreatDetection + Get-MpThreat).
// Probado sin permisos de administrador: funciona (2026-11-12, con el archivo de prueba EICAR).
// El comando es fijo. Pedimos solo los campos que usamos y salida en UTF-8,
// para que las rutas con tildes o ñ lleguen bien.
const COMANDO_HISTORIAL = [
  '[Console]::OutputEncoding = [Text.Encoding]::UTF8',
  '$d = @(Get-MpThreatDetection | Select-Object ThreatID, ThreatStatusID, InitialDetectionTime, Resources)',
  '$a = @(Get-MpThreat | Select-Object ThreatID, ThreatName, SeverityID)',
  '@{ detecciones = $d; amenazas = $a } | ConvertTo-Json -Depth 4 -Compress'
].join('; ')

export function historialDefender() {
  return new Promise((resolve) => {
    execFile(
      POWERSHELL,
      ['-NoProfile', '-NonInteractive', '-Command', COMANDO_HISTORIAL],
      { timeout: 30000, windowsHide: true, maxBuffer: 5 * 1024 * 1024 },
      (error, salida) => {
        if (error) return resolve(interpretarHistorial(null))
        try {
          resolve(interpretarHistorial(JSON.parse(salida)))
        } catch {
          resolve(interpretarHistorial(null))
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
