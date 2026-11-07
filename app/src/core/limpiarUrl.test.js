import { test } from 'node:test'
import assert from 'node:assert/strict'
import { limpiarUrl } from './limpiarUrl.js'

test('saca parámetros de rastreo y deja los demás', () => {
  assert.equal(
    limpiarUrl(
      'https://tienda.test/producto?id=5&utm_source=fb&utm_campaign=x&fbclid=abc&color=rojo'
    ),
    'https://tienda.test/producto?id=5&color=rojo'
  )
  assert.equal(limpiarUrl('https://a.test/?gclid=1'), 'https://a.test/')
})

test('saca el #fragmento y el usuario:contraseña', () => {
  assert.equal(limpiarUrl('https://a.test/pagina#seccion'), 'https://a.test/pagina')
  assert.equal(limpiarUrl('https://usuario:clave@a.test/'), 'https://a.test/')
})

test('rechaza lo que no es una URL http/https válida', () => {
  for (const texto of [
    null,
    42,
    '',
    'hola',
    'javascript:alert(1)',
    'file:///C:/Windows',
    'https://a.test/' + 'x'.repeat(2100)
  ]) {
    assert.equal(limpiarUrl(texto), null, String(texto).slice(0, 30))
  }
})
