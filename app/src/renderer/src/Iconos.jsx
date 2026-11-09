// Íconos dibujados a mano: mismo trazo (1.75) y puntas redondeadas en todos.
const Base = ({ children, tamano = 20 }) => (
  <svg
    width={tamano}
    height={tamano}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
)

export const IconoClip = () => (
  <Base>
    <path d="M20.5 11.5 12.6 19.4a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" />
  </Base>
)

export const IconoEnviar = () => (
  <Base>
    <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
  </Base>
)

export const IconoMas = () => (
  <Base tamano={18}>
    <path d="M12 5v14M5 12h14" />
  </Base>
)

export const IconoCerrar = () => (
  <Base tamano={14}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Base>
)

export const IconoArchivo = () => (
  <Base tamano={16}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </Base>
)

export const IconoEscudo = () => (
  <Base tamano={16}>
    <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z" />
    <path d="m9 12 2 2 4-4" />
  </Base>
)

export const IconoAtencion = () => (
  <Base tamano={16}>
    <path d="M12 4 2.8 19.5h18.4z" />
    <path d="M12 10v4.5M12 17.2v.1" />
  </Base>
)
