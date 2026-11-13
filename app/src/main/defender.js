// Estado de Microsoft Defender en esta PC (Get-MpComputerStatus).
// Seguridad (CLAUDE.md): comandos de Windows con execFile y argumentos en una lista,
// nunca armando un texto para la consola. El comando es fijo: no lleva datos del usuario.

import { execFile } from 'child_process'
import { join } from 'path'
import { interpretarEstadoDefender } from '../core/estadoDefender.js'
import { interpretarHistorial } from '../core/historialDefender.js'
import { concluirEscaneo, amenazasDesde } from '../core/escaneoDefender.js'

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

// Escaneo rápido de Defender (MpCmdRun -Scan -ScanType 1). Funciona sin administrador.
// Ruta completa por el mismo motivo que PowerShell: que no lo reemplace otro programa del PATH.
const MPCMDRUN = join(
  process.env.ProgramFiles ?? 'C:\\Program Files',
  'Windows Defender',
  'MpCmdRun.exe'
)

function correrEscaneoRapido() {
  return new Promise((resolve) => {
    execFile(
      MPCMDRUN,
      ['-Scan', '-ScanType', '1'],
      // En la PC de Gian tardó 4,5 minutos; damos hasta 30 antes de cortarlo.
      { timeout: 30 * 60 * 1000, windowsHide: true },
      (error) => {
        if (!error) return resolve(0)
        // Terminó con otro código (por ejemplo 2) → lo devolvemos. Si se cortó o no arrancó → null.
        resolve(typeof error.code === 'number' && !error.killed ? error.code : null)
      }
    )
  })
}

// Un solo escaneo a la vez: si se pide otro mientras corre, se devuelve el mismo.
let escaneoEnCurso = null
export function escanearPc() {
  escaneoEnCurso ??= (async () => {
    const { puedeEscanear, aviso } = await estadoDefender()
    if (!puedeEscanear) {
      return {
        amenazas: [],
        conclusion: {
          nivel: 'desconocido',
          titulo: 'No podemos escanear con Defender',
          consejo: aviso
        }
      }
    }
    const inicio = Date.now()
    const codigo = await correrEscaneoRapido()
    // El código 2 puede ser amenaza o error: lo que decide es qué apareció en el historial.
    const { amenazas } = await historialDefender()
    const nuevas = amenazasDesde(amenazas, inicio)
    return { amenazas: nuevas, conclusion: concluirEscaneo(codigo, nuevas) }
  })().finally(() => {
    escaneoEnCurso = null
  })
  return escaneoEnCurso
}

// Se lee una vez al iniciar la app (CLAUDE.md) y se reutiliza.
let estado = null
export function estadoDefender() {
  estado ??= leerEstado().then(interpretarEstadoDefender)
  return estado
}
