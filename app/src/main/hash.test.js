import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { execFileSync } from 'child_process'
import { calcularSha256 } from './hash.js'

test('calcula el SHA-256 igual que los valores de referencia y que Windows', async () => {
  const carpeta = await mkdtemp(join(tmpdir(), 'vigia-hash-'))
  try {
    const abc = join(carpeta, 'abc.txt')
    await writeFile(abc, 'abc')
    // Valor de referencia del estándar (FIPS 180-2) para "abc".
    assert.equal(
      await calcularSha256(abc),
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    )

    const vacio = join(carpeta, 'vacio.txt')
    await writeFile(vacio, '')
    assert.equal(
      await calcularSha256(vacio),
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    )

    // Un archivo de 20 MB (se lee en muchos pedazos), comparado con Get-FileHash de Windows.
    const grande = join(carpeta, 'grande.bin')
    await writeFile(grande, Buffer.alloc(20 * 1024 * 1024, 7))
    const windows = execFileSync('powershell', [
      '-NoProfile',
      '-Command',
      `(Get-FileHash -Algorithm SHA256 -LiteralPath '${grande}').Hash`
    ])
      .toString()
      .trim()
      .toLowerCase()
    assert.equal(await calcularSha256(grande), windows)
  } finally {
    await rm(carpeta, { recursive: true })
  }
})

test('si el archivo no existe, falla (no inventa un hash)', async () => {
  await assert.rejects(calcularSha256(join(tmpdir(), 'no-existe-vigia.bin')))
})
