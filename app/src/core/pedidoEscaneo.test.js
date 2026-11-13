import { test } from 'node:test'
import assert from 'node:assert/strict'
import { esPedidoDeEscaneo } from './pedidoEscaneo.js'

test('reconoce pedidos de revisar la PC', () => {
  for (const texto of [
    'analiza todos los archivos de mi pc', // lo que escribió Gian en la app (2026-11-12)
    'Escaneá mi compu',
    'revisá la computadora por favor',
    '¿Podés chequear mi notebook?',
    '¿Tengo virus?',
    'creo que tengo malware'
  ]) {
    assert.equal(esPedidoDeEscaneo(texto), true, texto)
  }
})

test('no escanea por cosas que no son ese pedido', () => {
  for (const texto of [
    'hola',
    '¿Cómo me doy cuenta de que un mail es falso?',
    '¿Qué es un virus?',
    'analizá este link: https://ejemplo.com/pc',
    'mi pc anda lenta', // no pide revisar: que lo explique la IA
    'revisá este archivo',
    null
  ]) {
    assert.equal(esPedidoDeEscaneo(texto), false, String(texto))
  }
})
