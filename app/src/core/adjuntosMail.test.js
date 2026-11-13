import { test } from 'node:test'
import assert from 'node:assert/strict'
import { senalesDeAdjuntos, leerIndiceZip } from './adjuntosMail.js'

// Arma un zip mínimo en memoria (sin comprimir) con esos nombres, para no guardar binarios.
// conContrasena prende el bit de "cifrado" en cada entrada, como hace un zip con contraseña.
function armarZip(nombres, conContrasena = false) {
  const enc = new TextEncoder()
  const locales = []
  const centrales = []
  let offset = 0
  for (const nombre of nombres) {
    const n = enc.encode(nombre)
    const local = new Uint8Array(30 + n.length)
    const vl = new DataView(local.buffer)
    vl.setUint32(0, 0x04034b50, true)
    vl.setUint16(6, conContrasena ? 1 : 0, true)
    vl.setUint16(26, n.length, true)
    local.set(n, 30)
    const central = new Uint8Array(46 + n.length)
    const vc = new DataView(central.buffer)
    vc.setUint32(0, 0x02014b50, true)
    vc.setUint16(8, conContrasena ? 1 : 0, true)
    vc.setUint16(28, n.length, true)
    vc.setUint32(42, offset, true)
    central.set(n, 46)
    locales.push(local)
    centrales.push(central)
    offset += local.length
  }
  const tamCentral = centrales.reduce((s, c) => s + c.length, 0)
  const fin = new Uint8Array(22)
  const vf = new DataView(fin.buffer)
  vf.setUint32(0, 0x06054b50, true)
  vf.setUint16(8, nombres.length, true)
  vf.setUint16(10, nombres.length, true)
  vf.setUint32(12, tamCentral, true)
  vf.setUint32(16, offset, true)
  const todo = new Uint8Array(offset + tamCentral + 22)
  let p = 0
  for (const parte of [...locales, ...centrales, fin]) {
    todo.set(parte, p)
    p += parte.length
  }
  return todo
}

const tipos = (adjuntos) => senalesDeAdjuntos(adjuntos).map((s) => s.tipo)

test('leerIndiceZip: lee los nombres y detecta la contraseña', () => {
  assert.deepEqual(leerIndiceZip(armarZip(['a.txt', 'carpeta/', 'carpeta/b.exe'])), {
    nombres: ['a.txt', 'carpeta/', 'carpeta/b.exe'],
    conContrasena: false
  })
  assert.equal(leerIndiceZip(armarZip(['a.txt'], true)).conContrasena, true)
})

test('leerIndiceZip: algo que no es un zip, o un zip roto, devuelve null (no rompe)', () => {
  assert.equal(leerIndiceZip(new TextEncoder().encode('esto no es un zip, es texto')), null)
  assert.equal(leerIndiceZip(null), null)
  const roto = armarZip(['a.exe'])
  roto[0 + 30 + 'a.exe'.length] = 0 // pisamos la firma de la entrada del índice
  assert.equal(leerIndiceZip(roto), null)
})

test('programas, páginas, imágenes de disco y macros', () => {
  assert.deepEqual(
    tipos([
      { filename: 'instalador.exe' },
      { filename: 'Factura.PDF.exe' },
      { filename: 'comprobante.html' },
      { filename: 'logo.svg' },
      { filename: 'documentos.iso' },
      { filename: 'planilla.xlsm' }
    ]),
    [
      'adjunto_ejecutable',
      'adjunto_disfrazado',
      'adjunto_pagina',
      'adjunto_pagina',
      'adjunto_disco',
      'adjunto_macros'
    ]
  )
})

test('zip con un programa adentro (incluso en una carpeta)', () => {
  const s = senalesDeAdjuntos([
    { filename: 'factura.zip', content: armarZip(['leeme.txt', 'docs/', 'docs/factura.pdf.exe']) }
  ])
  assert.deepEqual(
    s.map((x) => x.tipo),
    ['adjunto_disfrazado']
  )
  assert.equal(
    s[0].detalle,
    'Dentro de "factura.zip", el adjunto "factura.pdf.exe" parece un .pdf, pero es un programa (.exe).'
  )
  // Los zips hechos en Windows separan las carpetas con "\" (probado con Compress-Archive).
  assert.deepEqual(tipos([{ filename: 'w.zip', content: armarZip(['sub\\', 'sub\\x.exe']) }]), [
    'adjunto_ejecutable'
  ])
})

test('zip con contraseña', () => {
  assert.deepEqual(tipos([{ filename: 'datos.zip', content: armarZip(['datos.pdf'], true) }]), [
    'zip_con_contrasena'
  ])
})

test('.docx con macros escondidas (un .docm renombrado)', () => {
  const docx = armarZip(['[Content_Types].xml', 'word/document.xml', 'word/vbaProject.bin'])
  assert.deepEqual(tipos([{ filename: 'contrato.docx', content: docx }]), ['adjunto_macros'])
})

test('adjuntos normales no son señal', () => {
  assert.deepEqual(
    tipos([
      { filename: 'foto.jpg' },
      { filename: 'resumen.pdf' },
      { filename: 'informe.docx', content: armarZip(['word/document.xml']) },
      { filename: 'fotos.zip', content: armarZip(['a.jpg', 'b.png']) },
      { filename: null }, // una parte sin nombre (por ejemplo, una imagen del cuerpo)
      { filename: 'roto.zip', content: new Uint8Array([1, 2, 3]) }
    ]),
    []
  )
  assert.deepEqual(senalesDeAdjuntos(null), [])
})
