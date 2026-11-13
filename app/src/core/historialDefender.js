// Interpreta el historial de amenazas de Microsoft Defender (Get-MpThreatDetection + Get-MpThreat).
// Lógica pura: recibe los datos ya leídos, así se puede testear sin Windows.
//
// Documentación (Microsoft, clases MSFT_MpThreatDetection y MSFT_MpThreat):
//   ThreatStatusID: 0 Unknown, 1 Detected, 2 Cleaned, 3 Quarantined, 4 Removed, 5 Allowed,
//                   6 Blocked, 102 QuarantineFailed, 103 RemoveFailed, 104 AllowFailed,
//                   105 Abandoned, 107 BlockedFailed.
//   SeverityID: 0 Unknown, 1 Low, 2 Moderate, 3 High, 4 Severe.
// Probado en la PC de Gian (2026-11-12): el archivo de prueba EICAR vino con SeverityID 5,
// que no está documentado. Por eso cualquier valor que no conocemos se muestra como "sin dato".
// El campo CleaningActionID no tiene valores documentados: no lo usamos.

const RESUELTA = [2, 3, 4, 6] // limpiada, en cuarentena, eliminada o bloqueada
const PERMITIDA = [5] // alguien le dijo a Defender que la deje pasar
const SIN_RESOLVER = [1, 102, 103, 104, 105, 107] // detectada, o Defender intentó y falló

const GRAVEDADES = { 1: 'baja', 2: 'moderada', 3: 'alta', 4: 'grave' }

// PowerShell 5 manda las fechas como "/Date(1794529193171)/" (milisegundos desde 1970).
function leerFecha(valor) {
  const ms = /^\/Date\((\d+)\)\/$/.exec(String(valor ?? ''))?.[1]
  return ms ? new Date(Number(ms)).toISOString() : null
}

// Defender anota dónde estaba la amenaza como "file:_C:\carpeta\archivo.exe".
// También puede ser otra cosa (por ejemplo, una clave del registro): la mostramos tal cual.
function leerUbicacion(recurso) {
  const texto = String(recurso)
  return texto.startsWith('file:_') ? texto.slice('file:_'.length) : texto
}

function estadoDe(id) {
  if (RESUELTA.includes(id)) return 'resuelta'
  if (PERMITIDA.includes(id)) return 'permitida'
  if (SIN_RESOLVER.includes(id)) return 'sin_resolver'
  return 'desconocido'
}

// Cuando hay un solo elemento, PowerShell a veces devuelve un objeto en vez de una lista.
const comoLista = (x) => (Array.isArray(x) ? x : x && typeof x === 'object' ? [x] : [])

// datos: { detecciones: [...], amenazas: [...] } tal como sale de PowerShell, o null si falló.
// Devuelve { ok, amenazas: [{ nombre, gravedad, estado, fecha, ubicaciones }], resumen, conclusion }.
export function interpretarHistorial(datos) {
  if (!datos || typeof datos !== 'object')
    return { ok: false, amenazas: [], resumen: null, conclusion: concluir(null) }

  // Get-MpThreat tiene el nombre y la gravedad; Get-MpThreatDetection, el estado y la fecha.
  // Se unen por ThreatID.
  const porId = new Map(comoLista(datos.amenazas).map((a) => [a?.ThreatID, a]))

  const amenazas = comoLista(datos.detecciones)
    .map((d) => {
      const info = porId.get(d?.ThreatID) ?? {}
      return {
        nombre: typeof info.ThreatName === 'string' ? info.ThreatName : 'Amenaza sin nombre',
        gravedad: GRAVEDADES[info.SeverityID] ?? null,
        estado: estadoDe(d?.ThreatStatusID),
        fecha: leerFecha(d?.InitialDetectionTime),
        // Una sola ubicación puede llegar como texto suelto en vez de lista.
        ubicaciones: (typeof d?.Resources === 'string' ? [d.Resources] : comoLista(d?.Resources))
          .filter((r) => typeof r === 'string')
          .map(leerUbicacion)
      }
    })
    // Primero las más recientes.
    .sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''))

  const contar = (estado) => amenazas.filter((a) => a.estado === estado).length
  const resumen = {
    total: amenazas.length,
    resueltas: contar('resuelta'),
    permitidas: contar('permitida'),
    // "desconocido" cuenta como pendiente: si no sabemos si se resolvió, no decimos que sí.
    pendientes: contar('sin_resolver') + contar('desconocido')
  }
  return { ok: true, amenazas, resumen, conclusion: concluir(resumen) }
}

// Qué le decimos a la persona, con reglas fijas (igual que el scoring de links y archivos).
// nivel usa los mismos nombres que los veredictos, para reutilizar los colores de la interfaz.
const TEXTO_SEGURIDAD =
  'Abrí Seguridad de Windows → Protección contra virus y amenazas → Historial de protección'

export function concluir(resumen) {
  if (!resumen) {
    return {
      nivel: 'desconocido',
      titulo: 'No pudimos leer el historial',
      consejo: 'No pudimos consultar a Microsoft Defender. Probá de nuevo en un rato.'
    }
  }
  if (resumen.pendientes > 0) {
    return {
      nivel: 'peligroso',
      titulo: 'Hay amenazas sin resolver',
      consejo: `${TEXTO_SEGURIDAD} y seguí lo que te indique.`
    }
  }
  if (resumen.permitidas > 0) {
    return {
      nivel: 'sospechoso',
      titulo: 'Revisá lo que se dejó pasar',
      consejo: `Alguien le dijo a Defender que permita algo que detectó. Si no fuiste vos: ${TEXTO_SEGURIDAD}.`
    }
  }
  if (resumen.total > 0) {
    return {
      nivel: 'sin_detecciones',
      titulo: 'Todo resuelto',
      consejo:
        'Defender encontró amenazas y ya las resolvió (las limpió, las bloqueó o las puso en cuarentena).'
    }
  }
  // Nunca "tu PC está limpia": solo que Defender no tiene nada registrado.
  return {
    nivel: 'sin_detecciones',
    titulo: 'Sin amenazas registradas',
    consejo: 'Defender no tiene amenazas guardadas en su historial.'
  }
}
