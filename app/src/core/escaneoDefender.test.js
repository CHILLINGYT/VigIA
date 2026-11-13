import { test } from 'node:test'
import assert from 'node:assert/strict'
import { concluirEscaneo, amenazasDesde, interpretarEscaneoArchivo } from './escaneoDefender.js'

// Salidas reales de MpCmdRun en la PC de Gian (2026-11-13), recortadas.
const SALIDA_EICAR = `Scan starting...
Scan finished.
Scanning C:\\prueba\\eicar2 found 1 threats.

<===========================LIST OF DETECTED THREATS==========================>
----------------------------- Threat information ------------------------------
Threat                  : Virus:DOS/EICAR_Test_File
Resources               : 1 total
    file                : C:\\prueba\\eicar2\\eicar.com
-------------------------------------------------------------------------------
`
const SALIDA_ERROR =
  'CmdTool: Failed with hr = 0x80070002. Check C:\\Users\\x\\AppData\\Local\\Temp\\MpCmdRun.log for more information'

test('archivo: EICAR detectado con su nombre (caso real)', () => {
  assert.deepEqual(interpretarEscaneoArchivo(2, SALIDA_EICAR), {
    fuente: 'defender',
    resultado: 'detectado',
    detalle: ['Virus:DOS/EICAR_Test_File']
  })
})

test('archivo: código 2 sin amenazas listadas es un error (caso real)', () => {
  assert.equal(interpretarEscaneoArchivo(2, SALIDA_ERROR).resultado, 'error')
})

test('archivo: código 0 es limpio; si no terminó, error', () => {
  assert.equal(
    interpretarEscaneoArchivo(0, 'Scan starting...\nScan finished.').resultado,
    'no_detectado'
  )
  assert.equal(interpretarEscaneoArchivo(null, '').resultado, 'error')
  assert.equal(interpretarEscaneoArchivo(2, undefined).resultado, 'error')
})

const amenaza = (estado) => ({ nombre: 'Virus:DOS/EICAR_Test_File', estado })

test('código 0 y nada nuevo: no encontramos amenazas conocidas (caso real)', () => {
  const r = concluirEscaneo(0, [])
  assert.equal(r.nivel, 'sin_detecciones')
  assert.doesNotMatch(`${r.titulo} ${r.consejo}`, /limpi[ao]|100%|segur[ao]/i)
})

test('el texto dice qué tipo de escaneo se hizo', () => {
  assert.match(concluirEscaneo(0, []).consejo, /rápido/)
  assert.match(concluirEscaneo(0, [], 'completo').consejo, /todos los archivos/)
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
