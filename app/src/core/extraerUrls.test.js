import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extraerUrls } from './extraerUrls.js'

test('encuentra links dentro de un mensaje', () => {
  assert.deepEqual(
    extraerUrls(
      'Hola! Tu paquete está retenido, pagá acá: https://correo-ar.test/pago?id=9. Gracias'
    ),
    ['https://correo-ar.test/pago?id=9']
  )
})

test('saca signos pegados al final y no repite links', () => {
  assert.deepEqual(extraerUrls('(ver https://a.test/x), https://a.test/x! y http://b.test'), [
    'https://a.test/x',
    'http://b.test'
  ])
})

test('ignora texto sin links, links raros y textos gigantes', () => {
  assert.deepEqual(extraerUrls('mi contraseña es 1234'), [])
  assert.deepEqual(extraerUrls('javascript:alert(1) ftp://a.test'), [])
  assert.deepEqual(extraerUrls(null), [])
  assert.deepEqual(extraerUrls('https://a.test/ ' + 'x'.repeat(100001)), [])
})

test('devuelve como mucho 5 links', () => {
  const texto = Array.from({ length: 8 }, (_, i) => `https://sitio${i}.test/`).join(' ')
  assert.equal(extraerUrls(texto).length, 5)
})
