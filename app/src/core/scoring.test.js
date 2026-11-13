import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcularVeredicto, FUENTES_ARCHIVO } from './scoring.js'

const limpio = () => [
  { fuente: 'google_safe_browsing', resultado: 'no_detectado' },
  { fuente: 'urlhaus', resultado: 'no_detectado' },
  {
    fuente: 'virustotal',
    resultado: 'no_detectado',
    motores: { maliciosos: 0, sospechosos: 0, total: 93 }
  }
]
const con = (nombre, cambios) =>
  limpio().map((f) => (f.fuente === nombre ? { ...f, ...cambios } : f))
const veredicto = (fuentes, senales) => calcularVeredicto(fuentes, senales).veredicto

test('todas las fuentes limpias = sin_detecciones (nunca "seguro")', () => {
  const r = calcularVeredicto(limpio())
  assert.equal(r.veredicto, 'sin_detecciones')
  assert.match(r.motivos[0], /no encontramos amenazas conocidas/i)
})

test('Safe Browsing o URLhaus solos alcanzan para "peligroso"', () => {
  assert.equal(
    veredicto(
      con('google_safe_browsing', { resultado: 'detectado', detalle: ['SOCIAL_ENGINEERING'] })
    ),
    'peligroso'
  )
  assert.equal(
    veredicto(
      con('urlhaus', { resultado: 'detectado', detalle: ['malware_download', 'url_offline'] })
    ),
    'peligroso'
  )
})

test('Safe Browsing se atribuye a Google y sin afirmar certeza', () => {
  const r = calcularVeredicto(
    con('google_safe_browsing', { resultado: 'detectado', detalle: ['SOCIAL_ENGINEERING'] })
  )
  assert.match(r.motivos[0], /^Según Google Safe Browsing, este sitio podría contener un engaño/)
})

test('VirusTotal: 3 o más motores = peligroso; 1 o 2 = sospechoso', () => {
  const vt = (maliciosos, sospechosos = 0) =>
    veredicto(
      con('virustotal', { resultado: 'detectado', motores: { maliciosos, sospechosos, total: 93 } })
    )
  assert.equal(vt(3), 'peligroso')
  assert.equal(vt(2), 'sospechoso')
  assert.equal(vt(0, 2), 'sospechoso')
})

test('el caso real de Emotet (URLhaus + 1 motor de VT) da peligroso', () => {
  const fuentes = [
    { fuente: 'google_safe_browsing', resultado: 'no_detectado' },
    { fuente: 'urlhaus', resultado: 'detectado', detalle: ['malware_download', 'url_offline'] },
    {
      fuente: 'virustotal',
      resultado: 'detectado',
      motores: { maliciosos: 1, sospechosos: 0, total: 92 }
    }
  ]
  const r = calcularVeredicto(fuentes)
  assert.equal(r.veredicto, 'peligroso')
  assert.equal(r.motivos.length, 2) // URLhaus (peligroso) + VirusTotal (sospechoso) como contexto
})

test('un dominio parecido con fuentes limpias = sospechoso', () => {
  const senales = [
    {
      tipo: 'usa_marca',
      marca: 'Mercado Pago',
      detalle: 'Usa el nombre de Mercado Pago pero no es su sitio oficial'
    }
  ]
  assert.equal(veredicto(limpio(), senales), 'sospechoso')
})

test('si falta información, el veredicto es "desconocido" y no "sin_detecciones"', () => {
  assert.equal(
    veredicto(con('virustotal', { resultado: 'sin_datos', motores: undefined })),
    'desconocido'
  )
  assert.equal(veredicto(con('urlhaus', { resultado: 'error' })), 'desconocido')
  assert.equal(veredicto(limpio().slice(0, 2)), 'desconocido') // falta una fuente
  assert.equal(veredicto(null), 'desconocido') // el proxy no respondió
  assert.equal(veredicto(con('urlhaus', { resultado: 'algo_raro' })), 'desconocido')
})

test('archivos: MalwareBazaar detecta = peligroso, con la familia de malware', () => {
  const fuentes = [
    { fuente: 'malwarebazaar', resultado: 'detectado', detalle: ['AZORult', 'exe'] },
    {
      fuente: 'virustotal',
      resultado: 'detectado',
      motores: { maliciosos: 60, sospechosos: 0, total: 71 }
    }
  ]
  const r = calcularVeredicto(fuentes, [], FUENTES_ARCHIVO)
  assert.equal(r.veredicto, 'peligroso')
  assert.match(r.motivos[0], /MalwareBazaar .* \(AZORult\)/)
})

test('archivos: las fuentes esperadas son MalwareBazaar y VirusTotal', () => {
  const limpioArchivo = [
    { fuente: 'malwarebazaar', resultado: 'no_detectado' },
    {
      fuente: 'virustotal',
      resultado: 'no_detectado',
      motores: { maliciosos: 0, sospechosos: 0, total: 70 }
    }
  ]
  assert.equal(calcularVeredicto(limpioArchivo, [], FUENTES_ARCHIVO).veredicto, 'sin_detecciones')
  // Con las fuentes de link, a este resultado le faltarían Safe Browsing y URLhaus.
  assert.equal(calcularVeredicto(limpioArchivo).veredicto, 'desconocido')
  // Un archivo que VirusTotal nunca vio: desconocido, no "sin detecciones".
  const nuevo = [limpioArchivo[0], { fuente: 'virustotal', resultado: 'sin_datos' }]
  assert.equal(calcularVeredicto(nuevo, [], FUENTES_ARCHIVO).veredicto, 'desconocido')
})

test('archivos con Defender: si Defender lo detecta, peligroso aunque nadie más lo conozca', () => {
  const r = calcularVeredicto(
    [
      { fuente: 'malwarebazaar', resultado: 'sin_datos' },
      { fuente: 'virustotal', resultado: 'sin_datos' },
      { fuente: 'defender', resultado: 'detectado', detalle: ['Virus:DOS/EICAR_Test_File'] }
    ],
    [],
    FUENTES_ARCHIVO
  )
  assert.equal(r.veredicto, 'peligroso')
  assert.match(r.motivos[0], /Microsoft Defender.*EICAR/)
})

test('archivos con Defender: un archivo propio que nadie conoce y Defender no marca', () => {
  const propio = [
    { fuente: 'malwarebazaar', resultado: 'sin_datos' },
    { fuente: 'virustotal', resultado: 'sin_datos' },
    { fuente: 'defender', resultado: 'no_detectado' }
  ]
  assert.equal(calcularVeredicto(propio, [], FUENTES_ARCHIVO).veredicto, 'sin_detecciones')
  // Si una base de datos no respondió (error), Defender solo no alcanza.
  const conError = [{ fuente: 'malwarebazaar', resultado: 'error' }, ...propio.slice(1)]
  assert.equal(calcularVeredicto(conError, [], FUENTES_ARCHIVO).veredicto, 'desconocido')
  // Y si Defender no pudo escanear, vuelve a ser desconocido como antes.
  const sinDefender = [...propio.slice(0, 2), { fuente: 'defender', resultado: 'error' }]
  assert.equal(calcularVeredicto(sinDefender, [], FUENTES_ARCHIVO).veredicto, 'desconocido')
})
