// Detecta dominios que imitan marcas argentinas (típico del phishing).
// Lógica pura y local: no consulta nada afuera.

// shortcut: lista armada a mano; el equipo de investigación tiene que verificar cada dominio
// oficial (y sumar bancos) en docs/investigacion.md antes de la presentación.
const MARCAS = [
  {
    nombre: 'Mercado Pago',
    claves: ['mercadopago'],
    oficiales: ['mercadopago.com', 'mercadopago.com.ar']
  },
  {
    nombre: 'Mercado Libre',
    claves: ['mercadolibre'],
    oficiales: ['mercadolibre.com', 'mercadolibre.com.ar']
  },
  { nombre: 'Banco Nación', claves: ['banconacion', 'bna'], oficiales: ['bna.com.ar'] },
  { nombre: 'Banco Provincia', claves: ['bancoprovincia'], oficiales: ['bancoprovincia.com.ar'] },
  {
    nombre: 'Banco Galicia',
    claves: ['bancogalicia', 'galicia'],
    oficiales: ['bancogalicia.com', 'galicia.ar']
  },
  { nombre: 'Santander', claves: ['santander'], oficiales: ['santander.com.ar'] },
  { nombre: 'BBVA', claves: ['bbva'], oficiales: ['bbva.com.ar'] },
  { nombre: 'Banco Macro', claves: ['bancomacro', 'macro'], oficiales: ['macro.com.ar'] },
  { nombre: 'ARCA (ex AFIP)', claves: ['arca', 'afip'], oficiales: ['arca.gob.ar', 'afip.gob.ar'] },
  { nombre: 'ANSES', claves: ['anses'], oficiales: ['anses.gob.ar'] },
  {
    nombre: 'Correo Argentino',
    claves: ['correoargentino'],
    oficiales: ['correoargentino.com.ar']
  },
  { nombre: 'WhatsApp', claves: ['whatsapp'], oficiales: ['whatsapp.com', 'whatsapp.net', 'wa.me'] }
]

// Caracteres que se parecen a letras: los estafadores escriben "mercadopag0" o "rnercadolibre".
function normalizar(texto) {
  return texto
    .replace(/rn/g, 'm')
    .replace(/vv/g, 'w')
    .replace(/0/g, 'o')
    .replace(/1/g, 'l')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
}

// Distancia de Levenshtein: cuántas letras hay que agregar, borrar o cambiar para pasar de a a b.
function distancia(a, b) {
  let anterior = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const actual = [i]
    for (let j = 1; j <= b.length; j++) {
      const cambio = a[i - 1] === b[j - 1] ? 0 : 1
      actual[j] = Math.min(anterior[j] + 1, actual[j - 1] + 1, anterior[j - 1] + cambio)
    }
    anterior = actual
  }
  return anterior[b.length]
}

const esOficial = (host, marca) => marca.oficiales.some((d) => host === d || host.endsWith('.' + d))

// ¿El texto (por ejemplo, el nombre visible de un mail: "Mercado Pago <x@gmail.com>") nombra
// una marca, pero el dominio no es uno de sus oficiales? Devuelve el nombre de la marca o null.
export function marcaFalsa(texto, dominio) {
  const t = String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
  const palabras = t.split(/[^a-z0-9]+/).filter(Boolean)
  const junto = palabras.join('')
  const host = String(dominio ?? '').toLowerCase()
  for (const marca of MARCAS) {
    if (esOficial(host, marca)) continue
    // Igual que con los dominios: las claves cortas (bna, arca) solo como palabra exacta.
    if (marca.claves.some((c) => palabras.includes(c) || (c.length >= 6 && junto.includes(c))))
      return marca.nombre
  }
  return null
}

// Devuelve una lista de señales [{ tipo, marca?, detalle }] sobre el dominio de la URL.
// Lista vacía = no encontramos nada raro en el nombre (no quiere decir que sea seguro).
export function analizarDominio(textoUrl) {
  const url = new URL(textoUrl)
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  const senales = []

  // Truco "https://mercadopago.com@sitio-malo.com": lo que está antes de @ no es el dominio.
  if (url.username) {
    senales.push({
      tipo: 'usuario_en_url',
      detalle: 'La dirección usa "@" para disimular el sitio real'
    })
  }
  // Punycode (xn--): letras de otros alfabetos que se ven iguales, como la "а" cirílica.
  if (host.split('.').some((parte) => parte.startsWith('xn--'))) {
    senales.push({
      tipo: 'caracteres_raros',
      detalle: 'El dominio usa letras de otro alfabeto que pueden imitar a las nuestras'
    })
  }

  // Partimos el dominio en palabras: "mercadopago-seguridad.com.ar" → mercadopago, seguridad, com, ar.
  const palabras = host.split(/[.-]/).map(normalizar)
  for (const marca of MARCAS) {
    if (esOficial(host, marca)) continue
    for (const clave of marca.claves) {
      // Las claves cortas (bna, arca) solo cuentan como palabra exacta: "barca" no es "arca".
      const contiene = palabras.some((p) => p === clave || (clave.length >= 6 && p.includes(clave)))
      const parecida =
        clave.length >= 6 && palabras.some((p) => p !== clave && distancia(p, clave) <= 2)
      if (contiene) {
        senales.push({
          tipo: 'usa_marca',
          marca: marca.nombre,
          detalle: `Usa el nombre de ${marca.nombre} pero no es su sitio oficial`
        })
        break
      }
      if (parecida) {
        senales.push({
          tipo: 'dominio_parecido',
          marca: marca.nombre,
          detalle: `El dominio se parece al de ${marca.nombre} pero no es el oficial`
        })
        break
      }
    }
  }
  return senales
}
