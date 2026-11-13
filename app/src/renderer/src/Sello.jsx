// El sello de veredicto: la única superficie elevada de la pantalla.
// Muestra el veredicto que calcularon las reglas (scoring), aparte del texto de la IA:
// si la IA se equivoca o es manipulada, este sello no cambia.

import { Fragment } from 'react'
import { FUENTES } from './fuentes.js'

// Marca dónde se puede cortar un texto largo (después de / . ? & =) para que un link
// se parta entre sus partes y nunca deje una letra sola en un renglón.
export function Cortable({ texto }) {
  const partes = String(texto).split(/(?<=[/.?&=])/)
  return partes.map((parte, i) => (
    <Fragment key={i}>
      {parte}
      {i < partes.length - 1 && <wbr />}
    </Fragment>
  ))
}

const ESTADOS = {
  detectado: 'lo marcó como peligroso',
  no_detectado: 'no lo tiene en su lista',
  sin_datos: 'no tiene datos',
  error: 'no pudo responder'
}

const VEREDICTOS = {
  peligroso: { palabra: 'Peligroso', consejo: 'No lo abras ni ingreses datos.', tamano: 112 },
  sospechoso: { palabra: 'Sospechoso', consejo: 'Tené cuidado: hay señales raras.', tamano: 100 },
  desconocido: {
    palabra: 'Sin información suficiente',
    consejo: 'Nadie tiene datos de esto todavía. Si no lo esperabas, no lo abras.',
    consejoArchivo:
      'Nadie analizó este archivo antes (es normal en tus documentos personales). Si te lo mandaron y no lo esperabas, no lo abras.',
    tamano: 92
  },
  sin_detecciones: {
    palabra: 'No encontramos amenazas conocidas',
    consejo: 'Eso no garantiza que sea seguro: si algo te parece raro, desconfiá.',
    tamano: 92
  }
}

// Curva de guilloché: un círculo cuyo radio oscila k veces por vuelta.
function curva(r, amplitud, k, fase, puntos = 160) {
  let d = ''
  for (let i = 0; i <= puntos; i++) {
    const t = (i / puntos) * Math.PI * 2
    const rr = r + amplitud * Math.sin(k * t + fase)
    d += `${i === 0 ? 'M' : 'L'}${(60 + rr * Math.cos(t)).toFixed(1)} ${(60 + rr * Math.sin(t)).toFixed(1)}`
  }
  return d + 'Z'
}
// Un anillo = tres hilos finos desfasados un tercio de vuelta: el trenzado del grabado de los billetes.
const anillo = (r, k) => [0, 1, 2].map((n) => curva(r, 2.4, k, (n * 2 * Math.PI) / 3)).join('')

// Microtexto: la línea de letras diminutas de los billetes y el DNI, hecha con los nombres de las fuentes.
const MICROTEXTO =
  'VIGIA · GOOGLE SAFE BROWSING · URLHAUS · MALWAREBAZAAR · VIRUSTOTAL · REGLAS DE VIGIA · '.repeat(
    6
  )

// Símbolo del centro: el veredicto también se entiende sin color.
const SIMBOLOS = {
  peligroso: 'M53 53l14 14M67 53 53 67',
  sospechoso: 'M60 51v10M60 68v.2',
  desconocido: 'M55 55.5a5 5 0 1 1 7 4.6c-1.3.6-2 1.6-2 3v.9M60 68v.2',
  sin_detecciones: 'm53.5 60.5 4.5 4.5 8.5-9'
}

// fuentes: [{ fuente, resultado }] en orden fijo (de afuera hacia adentro).
// esperando: true mientras las fuentes todavía no respondieron (anillos punteados girando).
export function Roseta({ fuentes, veredicto = 'desconocido', tamano = 92, esperando = false }) {
  const anillos = esperando
    ? [0, 1, 2, 3].map((i) => ({ fuente: null, resultado: 'esperando', i }))
    : fuentes.map((f, i) => ({ ...f, i }))
  const descripcion = esperando
    ? 'Consultando las fuentes'
    : fuentes
        .map(
          (f) => `${FUENTES[f.fuente]?.nombre ?? f.fuente}: ${ESTADOS[f.resultado] ?? f.resultado}`
        )
        .join('. ')

  return (
    <svg
      className={`roseta${esperando ? ' esperando' : ''}`}
      width={tamano}
      height={tamano}
      viewBox="0 0 120 120"
      role="img"
      aria-label={descripcion}
    >
      <g className="roseta-giro">
        {anillos.map(({ fuente, resultado, i }) => (
          <path
            key={i}
            className={`roseta-anillo ${resultado}`}
            d={anillo(54 - i * 8.5, 22 - i * 3)}
            pathLength="1"
            stroke={FUENTES[fuente]?.tinta ?? 'var(--celeste)'}
            style={{ animationDelay: `${i * 140}ms` }}
          />
        ))}
      </g>
      {!esperando && (
        <>
          <circle className="roseta-centro" cx="60" cy="60" r="15" />
          <path
            d={SIMBOLOS[veredicto]}
            stroke="#fff"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </>
      )}
    </svg>
  )
}

// resultado: lo que devolvió el análisis (link o archivo) en el proceso principal.
// emitido: hora del análisis, como el número de emisión de un documento.
export function Sello({ resultado, emitido }) {
  if (resultado.error) {
    return (
      <div className="sello-error" role="status">
        <strong>{resultado.objetivo}</strong>: {resultado.error}
      </div>
    )
  }
  const info = VEREDICTOS[resultado.veredicto] ?? VEREDICTOS.desconocido
  const esArchivo = resultado.tipo === 'archivo'
  const etiqueta = { archivo: 'ARCHIVO', mail: 'MAIL' }[resultado.tipo] ?? 'LINK'

  return (
    <article className={`sello ${resultado.veredicto} entra`}>
      <Roseta fuentes={resultado.fuentes} veredicto={resultado.veredicto} tamano={info.tamano} />
      <div className="sello-cuerpo">
        <div className="sello-encabezado">
          <h3 className="sello-veredicto">{info.palabra}</h3>
          {emitido && <span className="sello-folio">Emitido {emitido}</span>}
        </div>
        <p className="sello-consejo">{(esArchivo && info.consejoArchivo) || info.consejo}</p>
        <ul className="sello-motivos">
          {resultado.motivos.map((motivo) => (
            <li key={motivo}>{motivo}</li>
          ))}
        </ul>
        <p className="microtexto" aria-hidden="true">
          {MICROTEXTO}
        </p>
        {/* El dato analizado como texto, nunca como link que se pueda abrir. */}
        <p className="sello-maquina">
          <b>{etiqueta}</b>
          <span>
            <Cortable texto={resultado.objetivo} />
          </span>
        </p>
        {resultado.tipo === 'mail' && resultado.remitente && (
          <p className="sello-maquina">
            <b>DE</b>
            <span>
              <Cortable texto={resultado.remitente} />
            </span>
          </p>
        )}
        {esArchivo && resultado.huella && (
          <p className="sello-maquina">
            <b>SHA-256</b>
            <span>{resultado.huella}</span>
          </p>
        )}
        {resultado.desdeCache && (
          <p className="sello-nota">Resultado consultado hace unos minutos.</p>
        )}
      </div>
    </article>
  )
}
