import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analizarDominio } from './dominiosParecidos.js'

const tipos = (url) => analizarDominio(url).map((s) => `${s.tipo}${s.marca ? ':' + s.marca : ''}`)

test('los sitios oficiales y sus subdominios no dan señales', () => {
  for (const url of [
    'https://www.mercadopago.com.ar/',
    'https://www.mercadolibre.com.ar/ofertas',
    'https://auth.mercadolibre.com/',
    'https://www.bna.com.ar/',
    'https://www.arca.gob.ar/',
    'https://web.whatsapp.com/',
    'https://www.google.com/',
    'https://www.barca.es/' // "barca" no es "arca"
  ]) {
    assert.deepEqual(tipos(url), [], url)
  }
})

test('detecta el nombre de una marca en un dominio ajeno', () => {
  assert.deepEqual(tipos('https://mercadopago-seguridad.com/'), ['usa_marca:Mercado Pago'])
  assert.deepEqual(tipos('https://mercadopago.com.verificar-cuenta.xyz/'), [
    'usa_marca:Mercado Pago'
  ])
  assert.deepEqual(tipos('https://arca-tramites.online/'), ['usa_marca:ARCA (ex AFIP)'])
  assert.deepEqual(tipos('https://bna.homebanking-ar.com/'), ['usa_marca:Banco Nación'])
})

test('detecta dominios con letras cambiadas', () => {
  assert.deepEqual(tipos('https://mercadopag0.com/'), ['usa_marca:Mercado Pago']) // 0 → o
  assert.deepEqual(tipos('https://rnercadolibre.com.ar/'), ['usa_marca:Mercado Libre']) // rn → m
  assert.deepEqual(tipos('https://mercadolibree.com/'), ['usa_marca:Mercado Libre'])
  assert.deepEqual(tipos('https://mercadolirbe.com/'), ['dominio_parecido:Mercado Libre'])
  assert.deepEqual(tipos('https://correoargentlno.com/'), ['dominio_parecido:Correo Argentino']) // "l" en vez de "i"
})

test('detecta el truco del @ y las letras de otro alfabeto', () => {
  assert.deepEqual(tipos('https://mercadopago.com.ar@sitio-malo.test/'), ['usuario_en_url'])
  // "mercаdopago" con una "а" cirílica: el navegador la convierte a punycode (xn--).
  const senales = tipos('https://www.mercаdopago.com/')
  assert.ok(senales.includes('caracteres_raros'), senales.join())
})
