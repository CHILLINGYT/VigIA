// Motor de scoring: decide el VEREDICTO con reglas fijas. Nunca lo decide el LLM:
// la IA recibe este resultado ya calculado y solo lo explica (principio de CLAUDE.md).
//
// Veredictos, del más grave al menos grave:
//   peligroso       → al menos una fuente confiable la marca como amenaza
//   sospechoso      → hay indicios, pero no una detección firme
//   desconocido     → no hay indicios, pero tampoco datos suficientes para decir algo
//   sin_detecciones → todas las fuentes respondieron y ninguna encontró nada
// Nunca decimos "seguro": como mucho, "no encontramos amenazas conocidas".

// Las fuentes que tienen que responder para poder decir "sin detecciones".
export const FUENTES_LINK = ['google_safe_browsing', 'urlhaus', 'virustotal']
export const FUENTES_ARCHIVO = ['malwarebazaar', 'virustotal']

// Con 3 motores o más que la marcan como maliciosa, VirusTotal cuenta como detección firme.
// Con 1 o 2 puede ser un falso positivo: queda como "sospechoso".
const MINIMO_MOTORES_PELIGROSO = 3

const AMENAZAS_GOOGLE = {
  SOCIAL_ENGINEERING: 'un engaño (phishing)',
  MALWARE: 'software malicioso',
  UNWANTED_SOFTWARE: 'software no deseado',
  POTENTIALLY_HARMFUL_APPLICATION: 'una aplicación potencialmente dañina'
}

// fuentes: lo que devolvió el proxy (o null si no se pudo consultar).
// senales: lo que encontró el análisis local (dominios parecidos, etc.).
// esperadas: FUENTES_LINK o FUENTES_ARCHIVO.
// Devuelve { veredicto, motivos: [texto, ...] }.
export function calcularVeredicto(fuentes, senales = [], esperadas = FUENTES_LINK) {
  const lista = Array.isArray(fuentes) ? fuentes : []
  const fuente = (nombre) => lista.find((f) => f?.fuente === nombre)
  const peligrosos = []
  const sospechosos = []

  const google = fuente('google_safe_browsing')
  if (google?.resultado === 'detectado') {
    const tipos = (google.detalle ?? []).map((t) => AMENAZAS_GOOGLE[t] ?? t).join(', ')
    peligrosos.push(
      `Según Google Safe Browsing, este sitio podría contener ${tipos || 'una amenaza'}.`
    )
  }

  if (fuente('urlhaus')?.resultado === 'detectado') {
    peligrosos.push('URLhaus (abuse.ch) tiene registrada esta dirección como fuente de malware.')
  }

  const bazaar = fuente('malwarebazaar')
  if (bazaar?.resultado === 'detectado') {
    const familia = bazaar.detalle?.[0]
    peligrosos.push(
      `MalwareBazaar (abuse.ch) tiene este archivo registrado como malware${familia ? ` (${familia})` : ''}.`
    )
  }

  const vt = fuente('virustotal')
  if (vt?.resultado === 'detectado' && vt.motores) {
    const { maliciosos = 0, sospechosos: dudosos = 0, total = 0 } = vt.motores
    const texto = `En VirusTotal, ${maliciosos + dudosos} de ${total} antivirus lo marcan como peligroso.`
    if (maliciosos >= MINIMO_MOTORES_PELIGROSO) peligrosos.push(texto)
    else sospechosos.push(texto)
  }

  const defender = fuente('defender')
  if (defender?.resultado === 'detectado') {
    const nombre = defender.detalle?.[0]
    peligrosos.push(
      `Microsoft Defender, el antivirus de tu PC, lo detecta como amenaza${nombre ? ` (${nombre})` : ''}.`
    )
  }

  for (const senal of senales) sospechosos.push(senal.detalle)

  if (peligrosos.length > 0)
    return { veredicto: 'peligroso', motivos: [...peligrosos, ...sospechosos] }
  if (sospechosos.length > 0) return { veredicto: 'sospechoso', motivos: sospechosos }

  // Sin indicios. ¿Respondieron todas las fuentes? Si alguna falló, no la conoce o falta, no alcanza.
  const respondieronTodas = esperadas.every(
    (nombre) => fuente(nombre)?.resultado === 'no_detectado'
  )
  // Un archivo propio (una foto, un documento) casi nunca está en las bases por huella: "sin_datos".
  // Si además Defender lo escaneó y no encontró nada, ya podemos decir "no encontramos amenazas
  // conocidas". Si alguna fuente dio error, no alcanza.
  const defenderCubre =
    defender?.resultado === 'no_detectado' &&
    esperadas.every((nombre) => ['no_detectado', 'sin_datos'].includes(fuente(nombre)?.resultado))
  if (!respondieronTodas && !defenderCubre) {
    return {
      veredicto: 'desconocido',
      motivos: ['No pudimos consultar todas las fuentes o no tienen datos sobre esto.']
    }
  }
  return {
    veredicto: 'sin_detecciones',
    motivos: ['No encontramos amenazas conocidas en las fuentes consultadas.']
  }
}
