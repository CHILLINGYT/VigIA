// Veredicto de un mail, con reglas fijas (nunca la IA), igual que el de links y archivos.
//   peligroso       → alguno de sus links es peligroso, o hay 3 señales o más juntas
//   sospechoso      → 1 o 2 señales, o algún link sospechoso
//   desconocido     → sin señales, pero el mail no trae los datos para comprobar al remitente
//   sin_detecciones → sin señales y el remitente se pudo comprobar
// Por qué 3: una sola señal puede tener una explicación inocente (por ejemplo, un Reply-To
// distinto en un mail de una empresa). Varias juntas casi nunca la tienen.

const SENALES_PARA_PELIGROSO = 3
const MAXIMO_MOTIVOS = 10 // el proxy no acepta más
const LARGO_MAXIMO_MOTIVO = 300 // los nombres los elige quien manda el mail: los cortamos

// autenticado: si el mail traía Authentication-Results. senales: [{ detalle }].
// veredictosLinks: los veredictos de los links del mail que se analizaron.
export function veredictoMail({ autenticado, senales = [], veredictosLinks = [] }) {
  const linkPeligroso = veredictosLinks.includes('peligroso')
  const motivos = senales.map((s) => String(s.detalle).slice(0, LARGO_MAXIMO_MOTIVO))
  if (linkPeligroso) motivos.unshift('Al menos un link del mail es peligroso (mirá su análisis).')

  const resultado = (veredicto, lista) => ({ veredicto, motivos: lista.slice(0, MAXIMO_MOTIVOS) })

  if (linkPeligroso || senales.length >= SENALES_PARA_PELIGROSO)
    return resultado('peligroso', motivos)
  if (senales.length > 0 || veredictosLinks.includes('sospechoso'))
    return resultado(
      'sospechoso',
      motivos.length > 0 ? motivos : ['Uno de sus links es sospechoso (mirá su análisis).']
    )
  if (!autenticado) {
    return resultado('desconocido', [
      'El mail no trae los datos para comprobar quién lo mandó. Tampoco encontramos otras señales.'
    ])
  }
  return resultado('sin_detecciones', [
    'No encontramos señales de engaño en el remitente, los links ni los adjuntos.'
  ])
}
