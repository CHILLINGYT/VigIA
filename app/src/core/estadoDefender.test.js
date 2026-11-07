import { test } from 'node:test'
import assert from 'node:assert/strict'
import { interpretarEstadoDefender } from './estadoDefender.js'

const estado = (datos) => interpretarEstadoDefender(datos)

test('activo: modo Normal, antivirus y tiempo real prendidos (como en la PC de Gian)', () => {
  assert.deepEqual(
    estado({ AMRunningMode: 'Normal', AntivirusEnabled: true, RealTimeProtectionEnabled: true }),
    { estado: 'activo', puedeEscanear: true, aviso: null }
  )
})

test('activo pero sin tiempo real: puede escanear, pero avisa', () => {
  const r = estado({
    AMRunningMode: 'Normal',
    AntivirusEnabled: true,
    RealTimeProtectionEnabled: false
  })
  assert.equal(r.estado, 'activo')
  assert.equal(r.puedeEscanear, true)
  assert.match(r.aviso, /tiempo real/)
})

test('pasivo: otro antivirus a cargo, no escaneamos con Defender', () => {
  for (const modo of ['Passive Mode', 'SxS Passive Mode', 'EDR Block Mode']) {
    const r = estado({
      AMRunningMode: modo,
      AntivirusEnabled: true,
      RealTimeProtectionEnabled: false
    })
    assert.equal(r.estado, 'pasivo', modo)
    assert.equal(r.puedeEscanear, false, modo)
  }
})

test('apagado', () => {
  assert.equal(estado({ AMRunningMode: 'Normal', AntivirusEnabled: false }).estado, 'apagado')
  assert.equal(estado({ AMRunningMode: 'Not running', AntivirusEnabled: true }).estado, 'apagado')
})

test('si no pudimos leer el estado: desconocido, sin escanear', () => {
  for (const datos of [null, undefined, 'texto', {}, { AMRunningMode: 3 }]) {
    const r = estado(datos)
    assert.equal(r.estado, 'desconocido')
    assert.equal(r.puedeEscanear, false)
  }
})
