// Tarjeta con el historial de amenazas de Microsoft Defender.
// No decide nada: muestra la conclusión que ya calculó core/historialDefender.js.
import marca from './assets/marca.svg'

const ESTADOS = {
  resuelta: 'Resuelta',
  permitida: 'Permitida',
  sin_resolver: 'Sin resolver',
  desconocido: 'Estado desconocido'
}

const fechaLegible = (iso) =>
  iso
    ? new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
    : 'fecha desconocida'

// Mostramos el nombre del archivo grande y la carpeta chica: es más fácil de reconocer.
function Ubicacion({ ruta }) {
  const partes = ruta.split('\\')
  const nombre = partes.pop()
  return (
    <span className="historial-ubicacion">
      <b>{nombre}</b>
      {partes.length > 0 && <small>{partes.join('\\')}</small>}
    </span>
  )
}

export function HistorialDefender({ item }) {
  return (
    <div className="vigia entra">
      <img className="vigia-avatar" src={marca} alt="" />
      <div className="vigia-cuerpo">
        {item.estado === 'cargando' ? (
          <p className="pensando" role="status">
            {item.tipo !== 'escaneo'
              ? 'Leyendo el historial de Microsoft Defender…'
              : item.modo === 'completo'
                ? 'Defender está revisando todos los archivos de tu PC. Puede tardar horas: podés seguir usando VigIA, pero no la cierres.'
                : 'Defender está revisando tu PC. Tarda unos 5 minutos: podés seguir usando VigIA mientras tanto.'}
          </p>
        ) : (
          <Tarjeta datos={item.datos} hora={item.hora} tipo={item.tipo} modo={item.modo} />
        )}
      </div>
    </div>
  )
}

function Tarjeta({ datos, hora, tipo, modo }) {
  const { conclusion, amenazas = [] } = datos ?? {}
  const nivel = conclusion?.nivel ?? 'desconocido'
  return (
    <section className={`sello historial ${nivel}`} aria-label="Historial de Microsoft Defender">
      <div className="sello-cuerpo">
        <div className="sello-encabezado">
          <span className="sello-veredicto">
            {conclusion?.titulo ?? 'No pudimos leer el historial'}
          </span>
          <span className="sello-folio">Defender {hora}</span>
        </div>
        {conclusion?.consejo && <p className="sello-consejo">{conclusion.consejo}</p>}

        {amenazas.length > 0 && (
          <ul className="historial-lista">
            {amenazas.map((a, i) => (
              <li key={i} className={a.estado}>
                <div className="historial-fila">
                  <span className="historial-nombre">{a.nombre}</span>
                  <span className="historial-estado">{ESTADOS[a.estado]}</span>
                </div>
                <small>
                  Detectada el {fechaLegible(a.fecha)}
                  {a.gravedad && ` · gravedad ${a.gravedad}`}
                </small>
                {a.ubicaciones.map((u) => (
                  <Ubicacion key={u} ruta={u} />
                ))}
              </li>
            ))}
          </ul>
        )}

        <p className="sello-nota">
          {tipo !== 'escaneo'
            ? 'Esto es lo que Microsoft Defender tiene registrado en esta PC. No es un escaneo nuevo.'
            : modo === 'completo'
              ? 'Escaneo completo de Microsoft Defender: revisó todos los archivos. Puede no conocer amenazas muy nuevas.'
              : 'Escaneo rápido de Microsoft Defender: revisa los lugares donde suele esconderse el malware, no todos los archivos. Puede no conocer amenazas muy nuevas.'}
        </p>
      </div>
    </section>
  )
}
