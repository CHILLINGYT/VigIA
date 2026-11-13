// Decide qué significa un escaneo de Microsoft Defender (MpCmdRun.exe).
// Lógica pura: recibe el código de salida y las amenazas que aparecieron en el historial
// durante el escaneo (ya interpretadas por historialDefender.js).
//
// Probado en la PC de Gian (2026-11-13):
//   - Escaneo rápido sin amenazas: código 0, unos 4,5 minutos, sin administrador.
//   - Carpeta con el archivo de prueba EICAR: código 2.
//   - Archivo que no existe: código 2 también (error 0x80070002).
// O sea: el 2 NO alcanza para saber si hubo amenaza. Lo que manda es el historial.

const TEXTO_SEGURIDAD =
  'Abrí Seguridad de Windows → Protección contra virus y amenazas → Historial de protección'

// codigo: número de salida de MpCmdRun, o null si no llegó a terminar (no arrancó o se cortó).
// nuevas: amenazas del historial detectadas desde que empezó el escaneo.
// tipo: 'rapido' o 'completo' (solo cambia cómo contamos qué se revisó).
export function concluirEscaneo(codigo, nuevas, tipo = 'rapido') {
  const amenazas = Array.isArray(nuevas) ? nuevas : []

  if (amenazas.length > 0) {
    const pendientes = amenazas.filter(
      (a) => a.estado === 'sin_resolver' || a.estado === 'desconocido'
    ).length
    if (pendientes > 0) {
      return {
        nivel: 'peligroso',
        titulo: 'Defender encontró amenazas',
        consejo: `${TEXTO_SEGURIDAD} y seguí lo que te indique.`
      }
    }
    if (amenazas.some((a) => a.estado === 'permitida')) {
      return {
        nivel: 'sospechoso',
        titulo: 'Defender encontró algo permitido',
        consejo: `Alguien le dijo a Defender que lo deje pasar. Si no fuiste vos: ${TEXTO_SEGURIDAD}.`
      }
    }
    return {
      nivel: 'sin_detecciones',
      titulo: 'Encontró amenazas y las resolvió',
      consejo: 'Defender ya las limpió, las bloqueó o las puso en cuarentena.'
    }
  }

  if (codigo === 0) {
    // Nunca "tu PC está limpia" (CLAUDE.md).
    return {
      nivel: 'sin_detecciones',
      titulo: 'No encontramos amenazas conocidas',
      consejo:
        tipo === 'completo'
          ? 'El escaneo completo de Defender revisó todos los archivos de tu PC y no encontró nada conocido.'
          : 'El escaneo rápido de Defender revisó los lugares donde suele esconderse el malware y no encontró nada conocido.'
    }
  }

  // Código distinto de 0 sin amenazas nuevas: fue un error, no una detección.
  return {
    nivel: 'desconocido',
    titulo: 'No pudimos completar el escaneo',
    consejo: 'Defender no terminó de revisar tu PC. Probá de nuevo en un rato.'
  }
}

// Escaneo de UN archivo (MpCmdRun -Scan -ScanType 3 -File <ruta> -DisableRemediation).
// Con -DisableRemediation la detección NO queda en el historial (lo dice la ayuda de MpCmdRun),
// así que leemos lo que MpCmdRun escribe. Salidas reales en la PC de Gian (2026-11-13):
//   EICAR:            código 2, "found 1 threats" y "Threat : Virus:DOS/EICAR_Test_File"
//   archivo inexistente: código 2, "CmdTool: Failed with hr = 0x80070002"
// Devuelve una fuente con la misma forma que las del proxy: { fuente, resultado, detalle? }.
export function interpretarEscaneoArchivo(codigo, salida) {
  const texto = typeof salida === 'string' ? salida : ''
  const cantidad = Number(/found (\d+) threats/i.exec(texto)?.[1] ?? 0)
  if (cantidad > 0) {
    const nombres = [...texto.matchAll(/^\s*Threat\s*:\s*(.+?)\s*$/gim)].map((m) => m[1])
    return { fuente: 'defender', resultado: 'detectado', detalle: nombres }
  }
  // Solo "limpio" si terminó bien. Un 2 sin amenazas listadas es un error, no una detección.
  if (codigo === 0) return { fuente: 'defender', resultado: 'no_detectado' }
  return { fuente: 'defender', resultado: 'error' }
}

// Se queda con las amenazas detectadas desde "inicio" (milisegundos).
// Margen de 5 segundos por si el reloj de Defender y el de la app no coinciden exacto.
export function amenazasDesde(amenazas, inicio) {
  return (Array.isArray(amenazas) ? amenazas : []).filter(
    (a) => a.fecha && Date.parse(a.fecha) >= inicio - 5000
  )
}
