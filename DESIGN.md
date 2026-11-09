---
name: VigIA
description: Asistente de ciberseguridad en forma de chat; cada veredicto se emite como un documento con sello de seguridad.
colors:
  tinta: "#0e2a47"
  tinta-hover: "#17406a"
  fondo: "#eef4f8"
  papel: "#ffffff"
  linea: "#d3e2ec"
  linea-fuerte: "#b7cfdf"
  texto: "#12263b"
  texto-2: "#4a6278"
  texto-en-tinta: "#d6e7f2"
  texto-en-tinta-2: "#9bbbd3"
  celeste: "#7fb8da"
  celeste-claro: "#cfe6f3"
  celeste-velo: "#e2eff7"
  accion: "#1f6fa8"
  accion-hover: "#185a8a"
  peligroso: "#b42318"
  sospechoso: "#a5480a"
  desconocido: "#5b6b7a"
  sin-detecciones: "#15803d"
  f-google: "#6b3fa0"
  f-urlhaus: "#c2611f"
  f-bazaar: "#a23b5a"
  f-vt: "#1f6fa8"
  f-reglas: "#2f7d5b"
typography:
  display:
    fontFamily: "'Bodoni Moda', 'Bodoni MT', serif"
    fontSize: "40px"
    fontWeight: 500
    lineHeight: 1.15
  marca:
    fontFamily: "'Bodoni Moda', 'Bodoni MT', serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.01em"
  veredicto:
    fontFamily: "'Bodoni Moda', 'Bodoni MT', serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.1
  veredicto-peligroso:
    fontFamily: "'Bodoni Moda', 'Bodoni MT', serif"
    fontSize: "34px"
    fontWeight: 600
    lineHeight: 1.1
  body:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
  maquina:
    fontFamily: "'Cascadia Mono', Consolas, ui-monospace, monospace"
    fontSize: "12.5px"
    fontWeight: 400
  maquina-rotulo:
    fontFamily: "'Cascadia Mono', Consolas, ui-monospace, monospace"
    fontSize: "12.5px"
    fontWeight: 600
    letterSpacing: "0.08em"
  microtexto:
    fontFamily: "'Cascadia Mono', Consolas, ui-monospace, monospace"
    fontSize: "5px"
    lineHeight: 1
    letterSpacing: "0.06em"
rounded:
  xs: "6px"
  sm: "8px"
  md: "10px"
  lg: "14px"
  xl: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "28px"
  4xl: "32px"
components:
  boton-enviar:
    backgroundColor: "{colors.accion}"
    textColor: "{colors.papel}"
    rounded: "{rounded.md}"
    size: "36px"
  boton-enviar-hover:
    backgroundColor: "{colors.accion-hover}"
  boton-enviar-disabled:
    backgroundColor: "{colors.linea}"
  boton-chico:
    backgroundColor: "{colors.accion}"
    textColor: "{colors.papel}"
    rounded: "{rounded.sm}"
    padding: "5px 10px"
  boton-nueva:
    textColor: "{colors.papel}"
    rounded: "{rounded.md}"
    padding: "9px 12px"
  boton-nueva-hover:
    backgroundColor: "{colors.tinta-hover}"
  sugerencia:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.texto}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
  sugerencia-hover:
    backgroundColor: "{colors.celeste-velo}"
  caja:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.texto}"
    rounded: "{rounded.xl}"
  burbuja-persona:
    backgroundColor: "{colors.celeste-claro}"
    textColor: "{colors.tinta}"
    padding: "10px 14px"
  adjunto:
    backgroundColor: "{colors.fondo}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.sm}"
    padding: "4px 4px 4px 9px"
  sello:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.texto}"
    rounded: "{rounded.lg}"
    padding: "18px 20px"
  lateral:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.texto-en-tinta}"
    width: "264px"
---

# Design System: VigIA

## Overview

**Creative North Star: "Impresión de seguridad"**

VigIA toma su mundo del DNI y los billetes argentinos: azul tinta, celeste institucional, papel blanco, guilloché, microtexto y la línea de lectura mecánica en monoespaciada. La idea es que cada respuesta se lea como un documento verificado: el veredicto lo emite un sello, y la explicación de la IA va abajo, aparte, como texto común.

El tema es claro a propósito: la persona usa VigIA de día, en su casa, en el momento de la duda, con el link o el archivo recién recibido. Fondo celeste muy claro, texto en tinta, una barra lateral azul tinta que da el marco institucional. La densidad es baja y tranquila; lo único que llama la atención es el sello.

Lo que se rechaza: el chat genérico donde el veredicto es una frase más de la IA, y cualquier aviso que transmita certeza ("seguro", "100%").

**Key Characteristics:**
- Tema claro, papel y tinta; la tinta azul (#0e2a47) enmarca, el celeste acompaña.
- El sello de veredicto es la única superficie elevada y siempre está separado del texto de la IA.
- Guilloché solo en el sello (roseta) y en el logo.
- Una tinta fija por fuente de análisis, la misma en la roseta y en la barra lateral.
- Datos de máquina (link, hash, hora de emisión) en monoespaciada.
- Veredictos que se entienden sin color: palabra + símbolo central.

## Colors

Papel blanco y celeste sobre tinta azul, con cuatro colores de veredicto y cinco tintas de fuente que no se usan para nada más.

### Primary
- **Azul tinta** (tinta): la barra lateral, los títulos en Bodoni del área clara, el rótulo de la línea de máquina. Es el color del documento. Su hover (tinta-hover) solo existe sobre la barra lateral.
- **Azul acción** (accion): el único color de acción: botón de enviar, botón chico, foco del teclado, cursor de texto, borde de la caja de mensaje con foco. Hover: accion-hover.

### Secondary
- **Celeste institucional** (celeste): el acento sobre tinta (la "IA" del nombre, el interruptor encendido, el punto que late de "vigilando") y el borde al pasar sobre una sugerencia.
- **Celeste claro** (celeste-claro): la burbuja de la persona y la selección de texto.
- **Velo celeste** (celeste-velo): fondo de sugerencia en hover y del aviso de link copiado.

### Tertiary: tintas de veredicto y de fuente
- **Peligroso** (peligroso), **Sospechoso** (sospechoso), **Desconocido** (desconocido), **Sin detecciones** (sin-detecciones): solo para la palabra del veredicto y el círculo central de la roseta.
- **Tintas de fuente**: Google Safe Browsing (f-google), URLhaus (f-urlhaus), MalwareBazaar (f-bazaar), VirusTotal (f-vt), Reglas de VigIA (f-reglas). Cada una dibuja su anillo en la roseta y su ondita en la lista "Quiénes revisan".

### Neutral
- **Fondo celeste muy claro** (fondo): fondo de la conversación, chips de adjunto, hover de botones ícono.
- **Papel** (papel): sello, sugerencias, caja de mensaje.
- **Línea** (linea) y **línea fuerte** (linea-fuerte): bordes de superficies; la fuerte para la caja de mensaje, el scroll y el microtexto.
- **Texto** (texto) y **texto secundario** (texto-2): cuerpo y notas.
- **Texto sobre tinta** (texto-en-tinta, texto-en-tinta-2): todo lo que va en la barra lateral.

### Named Rules
**La regla de una tinta por fuente.** Cada fuente tiene un color fijo, como los billetes. Ese color no se reutiliza para otra cosa ni cambia de una pantalla a otra.

**La regla del veredicto sin color.** El veredicto nunca se transmite solo por color: siempre lleva su palabra ("Peligroso", "Sospechoso", "Sin información suficiente", "No encontramos amenazas conocidas") y su símbolo en el centro de la roseta (cruz, signo de exclamación, signo de pregunta, tilde).

**La regla de nunca "seguro".** Ningún texto, color ni símbolo dice "seguro". El verde (sin-detecciones) acompaña a "No encontramos amenazas conocidas" y a un consejo que aclara que eso no lo garantiza.

## Typography

**Display Font:** Bodoni Moda, autoalojada en `assets/fuentes` (con Bodoni MT, serif)
**Body Font:** Segoe UI Variable Text (con Segoe UI, system-ui)
**Label/Mono Font:** Cascadia Mono (con Consolas)

**Character:** Bodoni es la letra grabada del documento; Segoe es la voz cotidiana de Windows; Cascadia es la máquina que lee el DNI.

### Hierarchy
- **Display** (Bodoni 500, 40px, 1.15): el saludo de la pantalla vacía.
- **Marca** (Bodoni 600, 30px): el nombre "VigIA" en la barra lateral.
- **Veredicto** (Bodoni 600, 28px; 34px para Peligroso): la palabra del sello, en el color del veredicto.
- **Body** (Segoe 400, 15px, 1.55): conversación y explicación de la IA, máximo 68ch.
- **Body chico** (14px): motivos del sello, sugerencias, "pensando".
- **Label** (Segoe 600, 12px, sin mayúsculas forzadas): títulos de sección de la barra lateral ("Tu PC", "Quiénes revisan").
- **Máquina** (Cascadia 12.5px; rótulo en 600 con 0.08em): la línea LINK / ARCHIVO / SHA-256. Folio "Emitido HH:MM" en 11.5px.
- **Microtexto** (Cascadia 5px, color línea fuerte, oculto a lectores de pantalla): la línea de letras diminutas del sello.

### Named Rules
**La regla de la letra grabada.** Bodoni se reserva para la marca, el saludo y la palabra del veredicto. No va en botones, cuerpo ni etiquetas.

**La regla de la escala por gravedad.** El tamaño del veredicto depende de su gravedad: Peligroso es el más grande (34px, roseta de 112px), Sospechoso sigue (roseta de 100px), Desconocido y Sin detecciones son los más chicos (roseta de 92px).

## Layout

Dos columnas: barra lateral fija de 264px (220px por debajo de 900px de ancho, sin las descripciones de las fuentes) y conversación a la derecha. Cada columna se desplaza sola; la caja de mensaje queda siempre abajo. La conversación y la caja comparten una columna centrada de 760px como máximo, con 28px entre mensajes. La pantalla vacía usa 680px centrados, con tres sugerencias en fila que pasan a una columna por debajo de 1100px.

Los mensajes de la persona van a la derecha (78% de ancho como máximo); las respuestas de VigIA van a la izquierda con el ojo del logo (32px) como avatar, y adentro el sello primero y la explicación debajo. El ritmo de espacios usa múltiplos cercanos de 4 (4 a 32px).

## Elevation & Depth

El sistema es plano: la profundidad viene del contraste entre la barra en tinta, el fondo celeste y el papel blanco. Hay una sola sombra y la usa solo el sello.

### Shadow Vocabulary
- **Sombra del sello** (`box-shadow: 0 1px 2px rgb(14 42 71 / 0.06), 0 8px 24px -8px rgb(14 42 71 / 0.18)`): exclusiva del sello de veredicto.
- **Anillo de foco de la caja** (`box-shadow: 0 0 0 3px rgb(31 111 168 / 0.15)`): no es elevación; es el estado de foco de la caja de mensaje.

### Named Rules
**La regla de la única elevación.** El sello de veredicto es la única superficie elevada de la pantalla. Si algo más necesita destacarse, se resuelve con borde o fondo, no con sombra.

## Shapes

Esquinas suavemente redondeadas: 10px como radio general (botones, estado, sugerencias, interruptor), 8px para botones chicos y adjuntos, 14px para el sello y la burbuja de la persona, 16px para la caja de mensaje. La burbuja de la persona tiene la esquina inferior derecha casi recta (4px), apuntando a quien habla. Bordes de 1px en línea o línea fuerte. Los íconos son propios, dibujados a mano, con trazo de 1.75 y puntas redondeadas.

El guilloché (curvas que oscilan alrededor de un círculo, en tres hilos desfasados) es la forma propia del mundo y aparece solo en la roseta del sello y en el logo.

## Components

### Buttons
- **Shape:** radio general (10px); botón chico 8px.
- **Enviar:** cuadrado de 36px en azul acción con flecha blanca; deshabilitado en línea con flecha gris.
- **Ícono (adjuntar):** 36px, sin fondo, texto secundario; en hover toma el fondo celeste muy claro y la tinta.
- **Botón chico** ("Analizar" del link copiado): azul acción, blanco, 600, 13px.
- **Nueva conversación:** sobre la barra, borde celeste translúcido, texto blanco; hover en tinta-hover.
- **Hover / Focus:** transiciones de 160ms con la curva `cubic-bezier(0.16, 1, 0.3, 1)`; foco de teclado con contorno de 2px en azul acción y 2px de separación.

### Chips
- **Adjunto:** fondo celeste muy claro, borde línea, 8px, 13px en tinta, con botón de quitar de 22px.

### Cards / Containers
- **Sugerencia:** papel, borde línea, 10px, título en tinta 600 y descripción en texto secundario; hover con borde celeste y velo celeste.
- **Aviso de link copiado:** velo celeste con borde celeste; el link en monoespaciada y cortado con puntos suspensivos.

### Inputs / Fields
- **Caja de mensaje:** papel, borde línea fuerte, 16px; con foco el borde pasa a azul acción con un anillo suave. Textarea de 52 a 200px de alto.

### Navigation
- **Barra lateral:** fondo tinta. Logo y nombre arriba, botón de nueva conversación, sección "Tu PC" (estado de Defender en una placa translúcida, aviso en tono cálido; interruptor del portapapeles con pista celeste cuando está encendido y un punto que late mientras vigila), sección "Quiénes revisan" (cada fuente con su ondita en su tinta) y un pie que recuerda que la IA explica pero no decide.

### Sello de veredicto (componente propio)
La pieza central. Papel, borde línea, 14px, la única sombra del sistema. A la izquierda la roseta; a la derecha la palabra del veredicto en Bodoni y en su color, el folio "Emitido HH:MM" en monoespaciada, el consejo en 600, los motivos (cada uno nombra su fuente), una línea de microtexto y la línea de máquina con LINK o ARCHIVO y, para archivos, SHA-256. El link se muestra como texto, nunca como enlace, y se corta solo después de `/ . ? & =` para no dejar letras sueltas.

- **Roseta:** un anillo de guilloché por fuente (tres hilos), en la tinta de esa fuente, de afuera hacia adentro. Detectado: tinta plena; no detectado: 50%; sin datos: 20%; error: punteado. Los anillos se dibujan en cascada (900ms, 140ms de diferencia) cuando llega la respuesta. Mientras se espera, la roseta gira con anillos punteados celestes.
- **Centro:** círculo en el color del veredicto con su símbolo blanco.
- **Error de análisis:** caja plana de papel (12px, sin sombra) con el motivo en texto secundario.
- **Movimiento:** cada mensaje entra con un solo desplazamiento de 6px y fundido (360ms). Con "reducir movimiento" todo queda casi instantáneo.

## Do's and Don'ts

### Do:
- **Do** mostrar el veredicto siempre en el sello, arriba y aparte de la explicación de la IA.
- **Do** acompañar cada color de veredicto con su palabra y su símbolo central.
- **Do** usar la tinta fija de cada fuente en todos lados donde aparezca esa fuente.
- **Do** escribir links, hashes y horas de emisión en Cascadia Mono.
- **Do** mantener el tema claro: papel y celeste sobre tinta.

### Don't:
- **Don't** usar guilloché fuera de la roseta del sello y del logo.
- **Don't** dar sombra a ninguna superficie que no sea el sello.
- **Don't** escribir "seguro" ni "100%" en ningún veredicto, consejo o estado.
- **Don't** mostrar el dato analizado como link clickeable.
- **Don't** usar las tintas de veredicto o de fuente como decoración.
