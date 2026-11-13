import { test } from 'node:test'
import assert from 'node:assert/strict'
import { interpretarHistorial, concluir } from './historialDefender.js'

// Datos reales que devolvió Defender en la PC de Gian con el archivo de prueba EICAR
// (2026-11-12). PowerShell devolvió objetos sueltos, no listas.
const EICAR = {
  detecciones: {
    ThreatID: 2147519003,
    InitialDetectionTime: '/Date(1794529193171)/',
    ThreatStatusID: 1,
    Resources: ['file:_C:\\Users\\prueba\\eicar.com']
  },
  amenazas: { ThreatID: 2147519003, ThreatName: 'Virus:DOS/EICAR_Test_File', SeverityID: 5 }
}

test('EICAR detectado y sin resolver (caso real)', () => {
  const r = interpretarHistorial(EICAR)
  assert.equal(r.ok, true)
  assert.deepEqual(r.amenazas, [
    {
      nombre: 'Virus:DOS/EICAR_Test_File',
      gravedad: null, // SeverityID 5 no está documentado: no inventamos una gravedad
      estado: 'sin_resolver',
      fecha: new Date(1794529193171).toISOString(),
      ubicaciones: ['C:\\Users\\prueba\\eicar.com']
    }
  ])
  assert.deepEqual(r.resumen, { total: 1, resueltas: 0, permitidas: 0, pendientes: 1 })
})

test('historial vacío: ninguna amenaza', () => {
  const r = interpretarHistorial({ detecciones: [], amenazas: [] })
  assert.equal(r.ok, true)
  assert.deepEqual(r.resumen, { total: 0, resueltas: 0, permitidas: 0, pendientes: 0 })
})

test('clasifica cada estado de Defender', () => {
  const det = (ThreatID, ThreatStatusID) => ({ ThreatID, ThreatStatusID })
  const r = interpretarHistorial({
    detecciones: [det(1, 3), det(2, 2), det(3, 6), det(4, 5), det(5, 103), det(6, 0), det(7, 99)],
    amenazas: []
  })
  assert.deepEqual(
    r.amenazas.map((a) => a.estado),
    ['resuelta', 'resuelta', 'resuelta', 'permitida', 'sin_resolver', 'desconocido', 'desconocido']
  )
  // Lo desconocido cuenta como pendiente: no decimos "resuelto" si no lo sabemos.
  assert.deepEqual(r.resumen, { total: 7, resueltas: 3, permitidas: 1, pendientes: 3 })
})

test('gravedades documentadas', () => {
  const r = interpretarHistorial({
    detecciones: [1, 2, 3, 4].map((id) => ({ ThreatID: id, ThreatStatusID: 3 })),
    amenazas: [1, 2, 3, 4].map((id) => ({ ThreatID: id, SeverityID: id }))
  })
  assert.deepEqual(
    r.amenazas.map((a) => a.gravedad),
    ['baja', 'moderada', 'alta', 'grave']
  )
})

test('ordena de la más reciente a la más vieja', () => {
  const r = interpretarHistorial({
    detecciones: [
      { ThreatID: 1, InitialDetectionTime: '/Date(1000)/' },
      { ThreatID: 2, InitialDetectionTime: '/Date(3000)/' },
      { ThreatID: 3, InitialDetectionTime: '/Date(2000)/' }
    ],
    amenazas: []
  })
  assert.deepEqual(
    r.amenazas.map((a) => a.fecha),
    [3000, 2000, 1000].map((ms) => new Date(ms).toISOString())
  )
})

test('datos rotos o lectura fallida: ok false, sin inventar nada', () => {
  for (const datos of [null, undefined, 'texto', 42]) {
    const r = interpretarHistorial(datos)
    assert.equal(r.ok, false)
    assert.deepEqual(r.amenazas, [])
  }
})

test('conclusión: lo sin resolver pesa más que todo lo demás', () => {
  const r = (pendientes, permitidas, total) =>
    concluir({ total, resueltas: total - pendientes - permitidas, permitidas, pendientes }).nivel
  assert.equal(r(1, 1, 5), 'peligroso')
  assert.equal(r(0, 1, 5), 'sospechoso')
  assert.equal(r(0, 0, 5), 'sin_detecciones')
  assert.equal(r(0, 0, 0), 'sin_detecciones')
  assert.equal(concluir(null).nivel, 'desconocido')
})

test('conclusión: nunca promete que la PC está limpia', () => {
  const vacio = concluir({ total: 0, resueltas: 0, permitidas: 0, pendientes: 0 })
  assert.doesNotMatch(`${vacio.titulo} ${vacio.consejo}`, /limpi[ao]|100%|segur[ao]/i)
})

test('ubicaciones que no son archivos se muestran tal cual', () => {
  const r = interpretarHistorial({
    detecciones: { ThreatID: 1, ThreatStatusID: 3, Resources: 'regkey:_HKCU\\Software\\algo' },
    amenazas: []
  })
  assert.deepEqual(r.amenazas[0].ubicaciones, ['regkey:_HKCU\\Software\\algo'])
})
