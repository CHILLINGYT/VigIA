import { useEffect, useRef, useState } from 'react'
import marca from './assets/marca.svg'
import marcaClara from './assets/marca-clara.svg'
import { Sello, Roseta, Cortable } from './Sello.jsx'
import { FUENTES } from './fuentes.js'
import { HistorialDefender } from './HistorialDefender.jsx'
import {
  IconoClip,
  IconoEnviar,
  IconoMas,
  IconoCerrar,
  IconoArchivo,
  IconoEscudo,
  IconoAtencion
} from './Iconos.jsx'

const MAXIMO_HISTORIAL = 20 // el proceso principal y el proxy rechazan más
const LARGO_MAXIMO = 4000

let siguienteId = 0
const nuevoId = () => ++siguienteId

// El texto de la IA se muestra como texto plano: párrafos y listas con guiones.
// Nunca se interpreta como HTML ni markdown (CLAUDE.md: no renderizar links ni imágenes de la IA).
function Explicacion({ texto }) {
  const bloques = texto
    .replace(/\*\*|__|`/g, '')
    .split(/\n\s*\n/)
    .filter((b) => b.trim())
  return (
    <div className="explicacion">
      {bloques.map((bloque, i) => {
        const lineas = bloque.split('\n').filter((l) => l.trim())
        if (lineas.every((l) => /^\s*[-*•]\s/.test(l))) {
          return (
            <ul key={i}>
              {lineas.map((l, j) => (
                <li key={j}>{l.replace(/^\s*[-*•]\s/, '')}</li>
              ))}
            </ul>
          )
        }
        return (
          <p key={i} style={{ whiteSpace: 'pre-wrap' }}>
            {bloque}
          </p>
        )
      })}
    </div>
  )
}

function RespuestaVigia({ item }) {
  return (
    <div className="vigia entra">
      <img className="vigia-avatar" src={marca} alt="" />
      <div className="vigia-cuerpo">
        {item.estado === 'analizando' && item.conAnalisis && (
          <div className="pensando" role="status">
            <Roseta fuentes={[]} esperando tamano={44} />
            Consultando Google, abuse.ch y VirusTotal…
          </div>
        )}
        {item.analisis.map((r, i) => (
          <Sello key={i} resultado={r} emitido={item.hora} />
        ))}
        {item.estado !== 'listo' && !(item.estado === 'analizando' && item.conAnalisis) && (
          <p className="pensando" role="status">
            VigIA está escribiendo…
          </p>
        )}
        {item.texto && <Explicacion texto={item.texto} />}
        {item.error && (
          <div className="explicacion">
            <p className="nota-error">{item.error}</p>
          </div>
        )}
      </div>
    </div>
  )
}

const SUGERENCIAS = [
  { titulo: 'Revisar un link', texto: 'Pegalo y te digo qué encontramos.', tipo: 'link' },
  {
    titulo: 'Revisar un archivo',
    texto: 'Adjuntalo con el clip: solo usamos su huella.',
    tipo: 'archivo'
  },
  {
    titulo: 'Preguntar',
    texto: '¿Cómo me doy cuenta de que un mail es falso?',
    tipo: 'pregunta'
  }
]

function App() {
  const [conversacion, setConversacion] = useState([])
  const [texto, setTexto] = useState('')
  const [adjuntos, setAdjuntos] = useState([]) // [{ id, nombre }]
  const [ocupado, setOcupado] = useState(false)
  const [escaneando, setEscaneando] = useState(false)
  const [defender, setDefender] = useState(null)
  const [vigilando, setVigilando] = useState(false)
  const [copiadas, setCopiadas] = useState([])
  const campo = useRef(null)
  const lista = useRef(null)

  useEffect(() => {
    window.vigia.estadoDefender().then(setDefender)
  }, [])
  useEffect(() => window.vigia.alCopiarUrl(setCopiadas), [])

  // Siempre mostramos lo último de la conversación.
  useEffect(() => {
    lista.current?.scrollTo({ top: lista.current.scrollHeight, behavior: 'smooth' })
  }, [conversacion])

  // La caja crece con el texto (hasta un máximo, después aparece la barra de desplazamiento).
  useEffect(() => {
    const el = campo.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [texto])

  const actualizar = (id, cambios) =>
    setConversacion((c) => c.map((item) => (item.id === id ? { ...item, ...cambios } : item)))

  async function adjuntar() {
    const elegido = await window.vigia.adjuntarArchivo()
    if (!elegido.cancelado) setAdjuntos((a) => [...a, elegido].slice(-3))
    campo.current?.focus()
  }

  function quitar(id) {
    window.vigia.quitarAdjunto(id)
    setAdjuntos((a) => a.filter((x) => x.id !== id))
  }

  async function enviar(textoForzado) {
    const escrito = (textoForzado ?? texto).trim()
    if (ocupado || (!escrito && adjuntos.length === 0)) return
    const mensaje = escrito || 'Analizá lo que adjunté.'
    const enviados = adjuntos

    // Lo que la IA ve de la conversación: solo texto, los últimos mensajes.
    const historial = [
      ...conversacion
        // El historial de Defender no va a la IA: tiene rutas de archivos de la PC.
        .filter((i) => i.rol !== 'historial')
        .filter((i) => (i.rol === 'usuario' ? true : i.texto))
        .map((i) => ({
          rol: i.rol === 'usuario' ? 'usuario' : 'asistente',
          texto: i.mensaje ?? i.texto
        })),
      { rol: 'usuario', texto: mensaje }
    ]
      .map((m) => ({ ...m, texto: m.texto.slice(0, LARGO_MAXIMO) }))
      .slice(-MAXIMO_HISTORIAL)
    while (historial[0]?.rol === 'asistente') historial.shift()

    const idRespuesta = nuevoId()
    const conAnalisis = enviados.length > 0 || /https?:\/\//i.test(mensaje)
    setConversacion((c) => [
      ...c,
      {
        id: nuevoId(),
        rol: 'usuario',
        mensaje,
        visible: escrito,
        adjuntos: enviados.map((a) => a.nombre)
      },
      { id: idRespuesta, rol: 'vigia', estado: 'analizando', conAnalisis, analisis: [] }
    ])
    setTexto('')
    setAdjuntos([])
    setCopiadas([])
    setOcupado(true)

    try {
      // Paso 1: los motores de análisis deciden el veredicto (sin IA).
      const paso1 = await window.vigia.analizarMensaje(
        mensaje,
        enviados.map((a) => a.id)
      )
      if (paso1.error) {
        actualizar(idRespuesta, { estado: 'listo', error: paso1.error })
        return
      }
      const hora = new Date().toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      actualizar(idRespuesta, { estado: 'escribiendo', analisis: paso1.analisis, hora })
      // Paso 2: la IA explica lo que ya se decidió.
      const paso2 = await window.vigia.responder(historial, paso1.id)
      actualizar(idRespuesta, { estado: 'listo', texto: paso2.respuesta, error: paso2.error })
    } catch {
      actualizar(idRespuesta, { estado: 'listo', error: 'Algo falló. Probá de nuevo.' })
    } finally {
      setOcupado(false)
      campo.current?.focus()
    }
  }

  // Muestra lo que Defender ya registró. No pasa por la IA ni sale de la PC.
  async function verHistorialDefender() {
    if (ocupado) return
    const id = nuevoId()
    setConversacion((c) => [...c, { id, rol: 'historial', estado: 'cargando' }])
    setOcupado(true)
    try {
      const datos = await window.vigia.historialDefender()
      const hora = new Date().toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      actualizar(id, { estado: 'listo', datos, hora })
    } catch {
      actualizar(id, { estado: 'listo', datos: null })
    } finally {
      setOcupado(false)
    }
  }

  // El escaneo tarda minutos: no bloquea el chat (por eso usa "escaneando" y no "ocupado").
  async function escanearPc() {
    if (escaneando) return
    const id = nuevoId()
    setConversacion((c) => [...c, { id, rol: 'historial', tipo: 'escaneo', estado: 'cargando' }])
    setEscaneando(true)
    try {
      const datos = await window.vigia.escanearPc()
      const hora = new Date().toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      actualizar(id, { estado: 'listo', datos, hora })
    } catch {
      actualizar(id, { estado: 'listo', datos: null })
    } finally {
      setEscaneando(false)
    }
  }

  function nuevaConversacion() {
    adjuntos.forEach((a) => window.vigia.quitarAdjunto(a.id))
    setConversacion([])
    setAdjuntos([])
    setTexto('')
    campo.current?.focus()
  }

  async function cambiarVigilancia() {
    setVigilando(await window.vigia.vigilarPortapapeles(!vigilando))
    setCopiadas([])
  }

  function usarSugerencia(tipo) {
    if (tipo === 'archivo') return adjuntar()
    if (tipo === 'pregunta') return enviar(SUGERENCIAS[2].texto)
    setTexto('Analizá este link: ')
    campo.current?.focus()
  }

  const puedeEnviar = !ocupado && (texto.trim() !== '' || adjuntos.length > 0)

  return (
    <div className="app">
      <aside className="lateral">
        <div className="marca">
          <img src={marcaClara} alt="" />
          <span className="marca-nombre">
            Vig<span>IA</span>
          </span>
        </div>

        <button type="button" className="boton-nueva" onClick={nuevaConversacion}>
          <IconoMas />
          Nueva conversación
        </button>

        <section className="lateral-seccion" aria-label="Estado de la protección">
          <h2>Tu PC</h2>
          {defender === null ? (
            <p className="estado">Revisando Microsoft Defender…</p>
          ) : defender.aviso ? (
            <p className="estado aviso" role="alert">
              <IconoAtencion />
              {defender.aviso}
            </p>
          ) : (
            <p className="estado">
              <IconoEscudo />
              Microsoft Defender está activo y protege tu PC en tiempo real.
            </p>
          )}
          <button
            type="button"
            className="boton-lateral"
            onClick={verHistorialDefender}
            disabled={ocupado}
          >
            <IconoEscudo />
            Ver qué encontró Defender
          </button>
          <button
            type="button"
            className="boton-lateral"
            onClick={escanearPc}
            disabled={escaneando || defender?.puedeEscanear === false}
          >
            <IconoEscudo />
            {escaneando ? 'Escaneando tu PC…' : 'Escanear mi PC (rápido)'}
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={vigilando}
            className="interruptor"
            onClick={cambiarVigilancia}
          >
            Revisar los links que copio
            <span className="interruptor-pista" aria-hidden="true" />
          </button>
          {vigilando && (
            <p className="vigilando" role="status">
              Mirando tu portapapeles: solo usa los links.
            </p>
          )}
        </section>

        <section className="lateral-seccion" aria-label="Fuentes de análisis">
          <h2>Quiénes revisan</h2>
          <ul className="fuentes">
            {Object.entries(FUENTES).map(([id, f]) => (
              <li key={id}>
                <svg width="22" height="12" viewBox="0 0 22 12" aria-hidden="true">
                  <path
                    d="M1 6c2.5-4 5-4 7.5 0s5 4 7.5 0 4-3 5-2"
                    stroke={f.tinta}
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
                {f.nombre}
                <small>{f.descripcion}</small>
              </li>
            ))}
          </ul>
        </section>

        <p className="lateral-pie">
          La IA explica; no decide. El veredicto lo calculan estas fuentes con reglas fijas.
        </p>
      </aside>

      <main className="conversacion">
        <div className="mensajes" ref={lista}>
          {conversacion.length === 0 ? (
            <div className="vacio">
              <img src={marca} alt="" />
              <h1>¿Qué querés revisar?</h1>
              <p>
                Pegá un link, adjuntá un archivo o preguntame lo que quieras sobre seguridad. Te
                digo qué encontraron las fuentes y qué conviene hacer.
              </p>
              <div className="sugerencias">
                {SUGERENCIAS.map((s) => (
                  <button
                    key={s.tipo}
                    type="button"
                    className="sugerencia"
                    onClick={() => usarSugerencia(s.tipo)}
                  >
                    <strong>{s.titulo}</strong>
                    <span>{s.texto}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mensajes-columna" aria-live="polite">
              {conversacion.map((item) =>
                item.rol === 'usuario' ? (
                  <div key={item.id} className="yo entra">
                    {item.adjuntos.map((nombre) => (
                      <span key={nombre} className="adjunto">
                        <IconoArchivo />
                        <span>{nombre}</span>
                      </span>
                    ))}
                    {item.visible && (
                      <p className="yo-texto">
                        <Cortable texto={item.visible} />
                      </p>
                    )}
                  </div>
                ) : item.rol === 'historial' ? (
                  <HistorialDefender key={item.id} item={item} />
                ) : (
                  <RespuestaVigia key={item.id} item={item} />
                )
              )}
            </div>
          )}
        </div>

        <div className="redactar">
          <div className="redactar-columna">
            {copiadas.length > 0 && (
              <div className="copiado" role="status">
                Copiaste un link:
                <span>{copiadas[0]}</span>
                <button
                  type="button"
                  className="boton-chico"
                  onClick={() => enviar(`Analizá este link: ${copiadas[0]}`)}
                  disabled={ocupado}
                >
                  Analizar
                </button>
              </div>
            )}
            <form
              className="caja"
              onSubmit={(e) => {
                e.preventDefault()
                enviar()
              }}
            >
              {adjuntos.length > 0 && (
                <div className="adjuntos">
                  {adjuntos.map((a) => (
                    <span key={a.id} className="adjunto">
                      <IconoArchivo />
                      <span>{a.nombre}</span>
                      <button
                        type="button"
                        onClick={() => quitar(a.id)}
                        aria-label={`Quitar ${a.nombre}`}
                      >
                        <IconoCerrar />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <label htmlFor="mensaje" className="visualmente-oculto">
                Mensaje para VigIA
              </label>
              <textarea
                id="mensaje"
                ref={campo}
                rows={1}
                value={texto}
                maxLength={LARGO_MAXIMO}
                placeholder="Pegá un link o escribí tu pregunta…"
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    enviar()
                  }
                }}
                autoFocus
              />
              <div className="caja-acciones">
                <button
                  type="button"
                  className="boton-icono"
                  onClick={adjuntar}
                  disabled={ocupado || adjuntos.length >= 3}
                  aria-label="Adjuntar un archivo"
                  title="Adjuntar un archivo (se analiza solo su huella)"
                >
                  <IconoClip />
                </button>
                <button
                  type="submit"
                  className="boton-icono boton-enviar"
                  disabled={!puedeEnviar}
                  aria-label="Enviar"
                >
                  <IconoEnviar />
                </button>
              </div>
            </form>
            <p className="aclaracion">
              VigIA no reemplaza a tu antivirus y puede no conocer amenazas muy nuevas.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
