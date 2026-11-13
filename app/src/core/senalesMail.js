// Señales de un mail sospechoso, mirando los ENCABEZADOS (quién lo mandó de verdad).
// Lógica pura: recibe el mail ya leído por postal-mime, así se puede testear sin la app.
// No decide el veredicto: devuelve señales [{ tipo, detalle }] que después usa el scoring.

import { analizarDominio, marcaFalsa } from './dominiosParecidos.js'

const dominioDe = (direccion) =>
  String(direccion ?? '')
    .split('@')
    .pop()
    .toLowerCase()
    .trim()

// "mail.mercadopago.com" y "mercadopago.com" son el mismo remitente: no es una señal.
const mismoDominio = (a, b) => a === b || a.endsWith('.' + b) || b.endsWith('.' + a)

// Authentication-Results lo agrega el servidor que RECIBIÓ el mail (Gmail, Outlook):
// dice si el dominio del remitente confirmó que el mail es suyo (SPF, DKIM, DMARC).
// Usamos el primero (el de más arriba), que es el del último servidor, el más confiable:
// los de más abajo pudo haberlos escrito cualquiera.
function autenticacion(headers) {
  const valor = headers.find((h) => h.key === 'authentication-results')?.value
  if (!valor) return null
  const resultado = (nombre) =>
    new RegExp(`\\b${nombre}=(\\w+)`, 'i').exec(valor)?.[1]?.toLowerCase()
  return { spf: resultado('spf'), dkim: resultado('dkim'), dmarc: resultado('dmarc') }
}

// mail: lo que devuelve PostalMime.parse(). Devuelve { remitente, asunto, senales }.
export function senalesDelMail(mail) {
  const headers = Array.isArray(mail?.headers) ? mail.headers : []
  const nombre = mail?.from?.name ?? ''
  const direccion = mail?.from?.address ?? ''
  const dominio = dominioDe(direccion)
  const senales = []

  // 1. ¿El dominio del remitente confirmó que el mail es suyo?
  const auth = autenticacion(headers)
  if (auth?.dmarc === 'fail') {
    senales.push({
      tipo: 'dmarc_falla',
      detalle: `El mail dice venir de ${dominio}, pero ese dominio no confirma haberlo enviado (DMARC falló).`
    })
  } else if (['fail', 'softfail'].includes(auth?.spf) && auth?.dkim !== 'pass') {
    senales.push({
      tipo: 'spf_falla',
      detalle: `El servidor que envió el mail no está autorizado por ${dominio} (SPF falló).`
    })
  }

  // 2. Si respondés, ¿la respuesta va a otro lado?
  const responderA = (mail?.replyTo ?? []).map((r) => r?.address).find(Boolean)
  if (responderA && dominio && !mismoDominio(dominioDe(responderA), dominio)) {
    senales.push({
      tipo: 'responder_a_otro',
      detalle: `Si respondés, tu respuesta no va a ${dominio} sino a ${dominioDe(responderA)}.`
    })
  }

  // 3. ¿El nombre visible dice ser una marca, pero escribe desde otro dominio?
  const marca = marcaFalsa(nombre, dominio)
  if (marca) {
    senales.push({
      tipo: 'nombre_falso',
      marca,
      detalle: `Se presenta como "${marca}", pero escribe desde ${dominio}, que no es un dominio oficial.`
    })
  }

  // 4. ¿El dominio del remitente imita a una marca? (mercadopag0.com, mercadopago-seguridad.com)
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/.test(dominio)) {
    for (const s of analizarDominio(`https://${dominio}/`)) {
      if (s.marca && s.marca === marca) continue // ya lo dijimos en el punto 3
      senales.push({
        tipo: s.tipo,
        detalle: `La dirección del remitente: ${s.detalle[0].toLowerCase()}${s.detalle.slice(1)}.`
      })
    }
  }

  return {
    remitente: { nombre, direccion, dominio },
    asunto: mail?.subject ?? '',
    senales
  }
}
