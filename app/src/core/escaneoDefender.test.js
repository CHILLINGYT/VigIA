import { test } from 'node:test'
import assert from 'node:assert/strict'
import { concluirEscaneo, amenazasDesde } from './escaneoDefender.js'

const amenaza = (estado) => ({ nombre: 'Virus:DOS/EICAR_Test_File', estado })

test('código 0 y nada nuevo: no encontramos amenazas conocidas (caso real)', () => {
  const r = concluirEscaneo(0, [])
  assert.equal(r.nivel, 'sin_detecciones')
  assert.doesNotMatch(`${r.titulo} ${r.consejo}`, /limpi[ao]|100%|segur[ao]/i)
})

test('código 2 con amenaza nueva: peligroso (caso real con EICAR)', () => {
  assert.equal(concluirEscaneo(2, [amenaza('sin_resolver')]).nivel, 'peligroso')
})

test('código 2 SIN amenaza nueva: es un error, no una detección (caso real: archivo inexistente)', () => {
  const r = concluirEscaneo(2, [])
  assert.equal(r.nivel, 'desconocido')
  assert.match(r.titulo, /no pudimos/i)
})

test('si no terminó (null) tampoco decimos que está todo bien', () => {
  assert.equal(concluirEscaneo(null, []).nivel, 'desconocido')
})

test('lo que dice el historial manda sobre el código de salida', () => {
  assert.equal(concluirEscaneo(0, [amenaza('sin_resolver')]).nivel, 'peligroso')
  assert.equal(concluirEscaneo(0, [amenaza('desconocido')]).nivel, 'peligroso')
  assert.equal(concluirEscaneo(2, [amenaza('permitida')]).nivel, 'sospechoso')
  assert.equal(concluirEscaneo(2, [amenaza('resuelta')]).nivel, 'sin_detecciones')
})

test('amenazasDesde: solo las detectadas durante el escaneo', () => {
  const inicio = Date.parse('2026-11-13T03:40:00Z')
  const lista = [
    { fecha: '2026-11-13T03:41:00Z' }, // durante: entra
    { fecha: '2026-11-13T03:39:57Z' }, // 3 s antes: entra por el margen
    { fecha: '2026-11-12T21:19:00Z' }, // del día anterior: no entra
    { fecha: null } // sin fecha: no entra
  ]
  assert.equal(amenazasDesde(lista, inicio).length, 2)
  assert.deepEqual(amenazasDesde(null, inicio), [])
})
