// Interpreta lo que devuelve Get-MpComputerStatus (el estado de Microsoft Defender).
// Lógica pura: recibe los datos ya leídos, así se puede testear sin Windows.
//
// Campos que usamos:
//   AMRunningMode: "Normal" (Defender es el antivirus principal), "Passive Mode",
//                  "SxS Passive Mode" o "EDR Block Mode" (hay otro antivirus a cargo).
//   AntivirusEnabled: si el antivirus de Defender está prendido.
//   RealTimeProtectionEnabled: si vigila los archivos en tiempo real.

// Devuelve { estado: 'activo' | 'pasivo' | 'apagado' | 'desconocido', puedeEscanear, aviso }.
// aviso: texto para mostrarle al usuario, o null si no hace falta avisar nada.
export function interpretarEstadoDefender(datos) {
  if (!datos || typeof datos !== 'object' || typeof datos.AMRunningMode !== 'string') {
    return {
      estado: 'desconocido',
      puedeEscanear: false,
      aviso:
        'No pudimos saber si Microsoft Defender está funcionando. Vamos a analizar los archivos solo por su huella (reputación).'
    }
  }

  if (datos.AntivirusEnabled !== true || /not running/i.test(datos.AMRunningMode)) {
    return {
      estado: 'apagado',
      puedeEscanear: false,
      aviso:
        'Microsoft Defender está apagado. VigIA no reemplaza a un antivirus: te recomendamos tener uno activo. Vamos a analizar los archivos solo por su huella (reputación).'
    }
  }

  // Cualquier modo que no sea "Normal" significa que otro antivirus está a cargo.
  // CLAUDE.md: en ese caso no escaneamos con Defender, avisamos y seguimos con la reputación.
  if (datos.AMRunningMode !== 'Normal') {
    return {
      estado: 'pasivo',
      puedeEscanear: false,
      aviso:
        'Microsoft Defender está en modo pasivo (otro antivirus está a cargo). Vamos a analizar los archivos solo por su huella (reputación).'
    }
  }

  return {
    estado: 'activo',
    puedeEscanear: true,
    // Puede estar activo para escanear a pedido, pero sin vigilar en tiempo real.
    aviso:
      datos.RealTimeProtectionEnabled === true
        ? null
        : 'La protección en tiempo real de Defender está apagada. VigIA analiza después, pero no bloquea programas: te recomendamos prenderla.'
  }
}
