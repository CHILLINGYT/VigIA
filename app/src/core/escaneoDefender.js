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
export function concluirEscaneo(codigo, nuevas) {
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
        'El escaneo rápido de Defender revisó los lugares donde suele esconderse el malware y no encontró nada conocido.'
    }
  }

  // Código distinto de 0 sin amenazas nuevas: fue un error, no una detección.
  return {
    nivel: 'desconocido',
    titulo: 'No pudimos completar el escaneo',
    consejo: 'Defender no terminó de revisar tu PC. Probá de nuevo en un rato.'
  }
}

// Se queda con las amenazas detectadas desde "inicio" (milisegundos).
// Margen de 5 segundos por si el reloj de Defender y el de la app no coinciden exacto.
export function amenazasDesde(amenazas, inicio) {
  return (Array.isArray(amenazas) ? amenazas : []).filter(
    (a) => a.fecha && Date.parse(a.fecha) >= inicio - 5000
  )
}
