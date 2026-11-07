// Huella digital (SHA-256) de un archivo. Sin Electron, para poder testearlo con Node.

import { createHash } from 'crypto'
import { createReadStream } from 'fs'

// Lee el archivo de a pedazos (stream): así un archivo de varios GB no llena la memoria.
export function calcularSha256(ruta) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    createReadStream(ruta)
      .on('data', (pedazo) => hash.update(pedazo))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject)
  })
}
