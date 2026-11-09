// Genera el logo de VigIA: un ojo (vigía) cuyo iris es una roseta de guilloché (impresión de seguridad).
// Uso (desde app/): node scripts/generar-logo.mjs src/renderer/src/assets resources
// Después: npx electron scripts/svg-a-png.cjs resources/icon.svg build/icon.png 1024 (y resources/icon.png 512).
import { writeFileSync } from 'fs'

const TINTA = '#0E2A47'
const CELESTE = '#7FB8DA'
const CELESTE_CLARO = '#CFE6F3'

// Curva de guilloché: un círculo cuyo radio oscila k veces por vuelta, desplazado por una fase.
function anillo(cx, cy, r, amplitud, k, fase, puntos = 200) {
  let d = ''
  for (let i = 0; i <= puntos; i++) {
    const t = (i / puntos) * Math.PI * 2
    const rr = r + amplitud * Math.sin(k * t + fase)
    d += `${i === 0 ? 'M' : 'L'}${(cx + rr * Math.cos(t)).toFixed(1)} ${(cy + rr * Math.sin(t)).toFixed(1)}`
  }
  return d + 'Z'
}

// Iris: dos familias de curvas en contrafase (una sube donde la otra baja) forman pétalos trenzados.
function iris(color, colorSuave) {
  const lineas = []
  for (let j = 0; j < 5; j++) {
    const r = 40 + j * 3.2
    lineas.push(`<path d="${anillo(128, 128, r, 7, 12, 0)}" stroke="${color}" stroke-width="1.25" fill="none"/>`)
    lineas.push(`<path d="${anillo(128, 128, r, 7, 12, Math.PI)}" stroke="${colorSuave}" stroke-width="1.25" fill="none"/>`)
  }
  return lineas.join('')
}

// Párpados: la almendra del ojo. El iris queda recortado por ellos, como en un ojo real.
const ALMENDRA = 'M20 128 Q128 34 236 128 Q128 222 20 128 Z'

function ojo({ parpado, color, colorSuave, pupila }) {
  return (
    `<defs><clipPath id="ojo"><path d="${ALMENDRA}"/></clipPath></defs>` +
    `<g clip-path="url(#ojo)">${iris(color, colorSuave)}` +
    `<circle cx="128" cy="128" r="24" fill="${pupila}" stroke="${colorSuave}" stroke-width="2.4"/>` +
    `<circle cx="136" cy="120" r="5.5" fill="#FFFFFF"/></g>` +
    `<path d="${ALMENDRA}" fill="none" stroke="${parpado}" stroke-width="7" stroke-linejoin="round"/>`
  )
}

const svg = (contenido) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">${contenido}</svg>\n`

// 1. Para fondos claros (interfaz). 2. Para la barra azul tinta. 3. Ícono de la app sobre placa tinta.
const marca = svg(ojo({ parpado: TINTA, color: TINTA, colorSuave: CELESTE, pupila: TINTA }))
const marcaClara = svg(ojo({ parpado: CELESTE_CLARO, color: CELESTE_CLARO, colorSuave: CELESTE, pupila: TINTA }))
// En el ícono el ojo se agranda un 14%: sin eso sobra fondo arriba y abajo.
const icono = svg(
  `<rect width="256" height="256" rx="56" fill="${TINTA}"/><g transform="translate(128 128) scale(1.14) translate(-128 -128)">` +
    ojo({ parpado: CELESTE_CLARO, color: CELESTE_CLARO, colorSuave: CELESTE, pupila: TINTA }) +
    '</g>'
)

const [destinoUi, destinoRecursos] = process.argv.slice(2)
writeFileSync(`${destinoUi}/marca.svg`, marca)
writeFileSync(`${destinoUi}/marca-clara.svg`, marcaClara)
writeFileSync(`${destinoRecursos}/icon.svg`, icono)
console.log('ok', marca.length, marcaClara.length, icono.length)
