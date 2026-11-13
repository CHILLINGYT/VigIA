import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import PostalMime from 'postal-mime'
import { senalesDelMail } from './senalesMail.js'
import { marcaFalsa } from './dominiosParecidos.js'

// Mails de prueba inventados (tests/fixtures/), leídos con el mismo parser que usa la app.
const leer = async (nombre) =>
  PostalMime.parse(await readFile(new URL(`../../../tests/fixtures/${nombre}`, import.meta.url)))
const tipos = (r) => r.senales.map((s) => s.tipo)

test('phishing que se hace pasar por Mercado Pago: todas las señales de encabezado', async () => {
  const r = senalesDelMail(await leer('phishing-mercadopago.eml'))
  assert.equal(r.remitente.dominio, 'mercadopago-alertas.com')
  assert.equal(r.asunto, 'Tu cuenta será suspendida en 24 horas') // acentos decodificados
  assert.deepEqual(tipos(r), ['dmarc_falla', 'responder_a_otro', 'nombre_falso'])
  assert.match(r.senales[1].detalle, /ayuda-cuentas\.net/)
})

test('mail legítimo de Mercado Pago: ninguna señal', async () => {
  assert.deepEqual(tipos(senalesDelMail(await leer('legitimo-mercadopago.eml'))), [])
})

test('falsifica el dominio oficial de ARCA: solo lo delata DMARC', async () => {
  // El nombre y el dominio son los oficiales: sin la autenticación no habría forma de darse cuenta.
  assert.deepEqual(tipos(senalesDelMail(await leer('suplantacion-arca.eml'))), ['dmarc_falla'])
})

test('SPF falla pero DKIM pasa: no es señal (pasa con los reenvíos)', () => {
  const r = senalesDelMail({
    headers: [{ key: 'authentication-results', value: 'mx; spf=fail; dkim=pass; dmarc=none' }],
    from: { name: '', address: 'a@ejemplo.com' }
  })
  assert.deepEqual(tipos(r), [])
})

test('sin encabezados ni remitente: no rompe y no inventa señales', () => {
  for (const mail of [null, {}, { headers: 'roto', from: { address: 42 } }]) {
    assert.deepEqual(senalesDelMail(mail).senales, [])
  }
})

test('marcaFalsa: el nombre visible nombra una marca que no es la del dominio', () => {
  assert.equal(marcaFalsa('Mercado Pago', 'gmail.com'), 'Mercado Pago')
  assert.equal(marcaFalsa('Banco Nación - Avisos', 'avisos.net'), 'Banco Nación')
  assert.equal(marcaFalsa('Mercado Pago', 'mercadopago.com.ar'), null) // oficial
  assert.equal(marcaFalsa('Barca Fan Club', 'ejemplo.com'), null) // "barca" no es "arca"
  assert.equal(marcaFalsa('Juan Pérez', 'gmail.com'), null)
})
