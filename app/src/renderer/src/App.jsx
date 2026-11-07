import { useEffect, useState } from 'react'

// Cómo se muestra cada veredicto. Nunca decimos "seguro".
const VEREDICTOS = {
  peligroso: { titulo: 'Peligroso', consejo: 'No abras este link ni ingreses datos.' },
  sospechoso: { titulo: 'Sospechoso', consejo: 'Tené cuidado: hay señales raras.' },
  desconocido: {
    titulo: 'Sin información suficiente',
    consejo: 'No sabemos nada de este link. Si no esperabas recibirlo, no lo abras.',
    // Los archivos propios (fotos, documentos) casi nunca están en las bases: es normal.
    consejoArchivo:
      'Nadie analizó este archivo antes (es normal en tus documentos personales). Si lo descargaste o te lo mandaron y no lo esperabas, no lo abras.'
  },
  sin_detecciones: {
    titulo: 'No encontramos amenazas conocidas',
    consejo: 'Eso no garantiza que sea seguro: si algo te parece raro, desconfiá.'
  }
}

function App() {
  const [texto, setTexto] = useState('')
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [vigilando, setVigilando] = useState(false)
  const [copiadas, setCopiadas] = useState([])

  // Escuchamos los links copiados. Solo llegan si la vigilancia está activada.
  useEffect(() => window.vigia.alCopiarUrl(setCopiadas), [])

  // Al abrir la app: ¿Defender está funcionando? Si no, mostramos el aviso.
  const [defender, setDefender] = useState(null)
  useEffect(() => {
    window.vigia.estadoDefender().then(setDefender)
  }, [])

  async function cambiarVigilancia(evento) {
    setVigilando(await window.vigia.vigilarPortapapeles(evento.target.checked))
    setCopiadas([])
  }

  async function analizar(link) {
    setTexto(link)
    setCopiadas([])
    setCargando(true)
    setResultado(null)
    try {
      setResultado(await window.vigia.analizarUrl(link))
    } catch {
      setResultado({ error: 'Algo falló al analizar el link. Probá de nuevo.' })
    } finally {
      setCargando(false)
    }
  }

  async function analizarArchivo() {
    setCargando(true)
    try {
      const respuesta = await window.vigia.analizarArchivo()
      if (!respuesta.cancelado) setResultado(respuesta) // si cancela, dejamos lo que había
    } catch {
      setResultado({ error: 'Algo falló al analizar el archivo. Probá de nuevo.' })
    } finally {
      setCargando(false)
    }
  }

  const info = resultado && VEREDICTOS[resultado.veredicto]

  return (
    <main className="contenedor">
      <h1>VigIA</h1>
      {defender?.aviso && (
        <p className="aviso-defender" role="alert">
          {defender.aviso}
        </p>
      )}
      <p className="subtitulo">
        Pegá un link o elegí un archivo y te decimos si encontramos algo peligroso.
      </p>

      <label className="interruptor">
        <input type="checkbox" checked={vigilando} onChange={cambiarVigilancia} />
        Revisar los links que copio (portapapeles)
      </label>
      {vigilando && (
        <p className="indicador" role="status">
          ● VigIA está mirando tu portapapeles. Solo usa los links; el resto del texto no se guarda
          ni sale de tu PC.
        </p>
      )}
      {copiadas.length > 0 && (
        <div className="copiadas" aria-live="polite">
          <p>Copiaste {copiadas.length === 1 ? 'un link' : 'estos links'}. ¿Lo analizamos?</p>
          {copiadas.map((link) => (
            <button key={link} type="button" className="secundario" onClick={() => analizar(link)}>
              Analizar {link}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          analizar(texto)
        }}
        className="formulario"
      >
        <label htmlFor="link">Link a analizar</label>
        <div className="fila">
          <input
            id="link"
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="https://..."
            maxLength={2048}
            autoComplete="off"
            spellCheck="false"
          />
          <button type="submit" disabled={cargando || texto.trim() === ''}>
            {cargando ? 'Analizando…' : 'Analizar'}
          </button>
        </div>
      </form>

      <div className="archivo">
        <button type="button" className="secundario" onClick={analizarArchivo} disabled={cargando}>
          Analizar un archivo…
        </button>
        <span className="nota">
          Solo calculamos su huella (SHA-256): el archivo no se abre ni se sube.
        </span>
      </div>

      <section aria-live="polite">
        {resultado?.error && <p className="error">{resultado.error}</p>}
        {info && (
          <article className={`resultado ${resultado.veredicto}`}>
            <h2>{info.titulo}</h2>
            <p className="consejo">
              {resultado.nombre && info.consejoArchivo ? info.consejoArchivo : info.consejo}
            </p>
            {/* La URL o el nombre se muestran como texto, nunca como link clickeable. */}
            <p className="url">{resultado.url ?? resultado.nombre}</p>
            <ul>
              {resultado.motivos.map((motivo) => (
                <li key={motivo}>{motivo}</li>
              ))}
            </ul>
            {resultado.desdeCache && (
              <p className="nota">Resultado consultado hace unos minutos.</p>
            )}
          </article>
        )}
      </section>

      <footer>
        Fuentes: Google Safe Browsing, URLhaus y MalwareBazaar (abuse.ch) y VirusTotal. VigIA no
        reemplaza a tu antivirus y puede no conocer amenazas muy nuevas.
      </footer>
    </main>
  )
}

export default App
