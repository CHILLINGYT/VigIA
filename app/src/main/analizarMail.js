// Análisis de un mail guardado como .eml (en Gmail: ⋮ → "Descargar mensaje").
// Flujo: el usuario lo elige en el diálogo de Windows → postal-mime lo lee → señales de
// encabezados, links y adjuntos (core) → se analizan sus primeros links → veredicto con reglas.
// Nunca se abre ni se ejecuta nada del mail: los adjuntos solo se miran por su nombre y su índice.

import { readFile, stat } from 'fs/promises'
import { basename } from 'path'
import PostalMime from 'postal-mime'
import { senalesDelMail, linksDelMail } from '../core/senalesMail.js'
import { senalesDeAdjuntos } from '../core/adjuntosMail.js'
import { veredictoMail } from '../core/veredictoMail.js'
import { analizarUrl } from './analizarUrl.js'

const TAMANO_MAXIMO = 25 * 1024 * 1024 // Gmail no deja mandar mails más grandes
// Cada link gasta consultas de VirusTotal (4 por minuto en la cuenta gratis).
const MAXIMO_LINKS_MAIL = 2

// Devuelve una lista: primero el resultado del mail y después el de cada link analizado.
export async function analizarMail(ruta) {
  const nombre = basename(ruta)
  let mail
  try {
    const info = await stat(ruta)
    if (!info.isFile() || info.size > TAMANO_MAXIMO)
      return [
        { tipo: 'mail', objetivo: nombre, error: 'El mail es demasiado grande o no es un archivo.' }
      ]
    mail = await PostalMime.parse(await readFile(ruta))
  } catch {
    return [{ tipo: 'mail', objetivo: nombre, error: 'No pudimos leer el mail.' }]
  }

  const cabecera = senalesDelMail(mail)
  const { links, senales: senalesLinks } = linksDelMail(mail)
  const senales = [...cabecera.senales, ...senalesLinks, ...senalesDeAdjuntos(mail.attachments)]
  const analisisLinks = await Promise.all(links.slice(0, MAXIMO_LINKS_MAIL).map(analizarUrl))

  const { veredicto, motivos } = veredictoMail({
    autenticado: cabecera.autenticado,
    senales,
    veredictosLinks: analisisLinks.map((r) => r.veredicto)
  })

  return [
    {
      tipo: 'mail',
      objetivo: cabecera.asunto || nombre,
      remitente: cabecera.remitente.direccion,
      veredicto,
      motivos,
      // Para la roseta del sello: las reglas de VigIA son las que revisaron el mail.
      fuentes: [
        { fuente: 'reglas_vigia', resultado: senales.length > 0 ? 'detectado' : 'no_detectado' }
      ]
    },
    ...analisisLinks
  ]
}
