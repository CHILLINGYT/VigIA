---
version: 1
slug: "app-src-renderer-src-app-jsx"
primary_target: "app/src/renderer/src/App.jsx"
related_targets: []
---

# Superficie: chat principal de VigIA

Modo: Operate. Audiencia: cualquier persona sin conocimientos técnicos, en el momento de la duda (link o archivo recién recibido). Tarea: escribir, pegar un link o adjuntar un archivo y recibir veredicto + explicación. Restricciones: el veredicto lo decide el scoring, nunca la IA; se muestra aparte de la explicación; nunca "seguro".

## Direction contract

THESIS: Cada respuesta se emite como un documento verificado: el veredicto es un sello de seguridad con roseta de guilloché, separado del texto de la IA. Rechaza el chat genérico donde el veredicto es una frase más de la IA.

OWN-WORLD: Impresión de seguridad del DNI y los billetes. Barra lateral azul tinta (#0E2A47), fondo celeste muy claro, texto tinta; celeste #7FB8DA como tinta institucional. Una tinta fija por fuente. Guilloché solo en el sello; datos de máquina en monoespaciada como la línea de lectura del DNI. Una sola elevación: la tarjeta de veredicto. Veredictos distinguibles sin color (forma de la roseta + palabra) y con escala fija de tamaño por gravedad.

STORY: La persona pregunta como en cualquier chat; ve que cuatro fuentes reales responden (anillos que se dibujan), lee el veredicto en grande y la explicación simple, y sabe qué hacer.

FIRST VIEWPORT: Barra lateral angosta a la izquierda (logo, nueva conversación, estado de Defender, interruptor del portapapeles). Columna central de conversación, máx. ~760px. Vacío: logo grande, saludo y sugerencias. Abajo, caja de mensaje con clip de adjuntar y enviar. Respuesta: tarjeta-sello (roseta izquierda, veredicto, motivos con fuente, línea de máquina con link o hash) y debajo el texto de la IA.

FORM: Impresión de seguridad (DNI y billetes), candidato 3 de 7 de la lista propia. seed:556722b599042a59

Signature move: la roseta del sello, un anillo por fuente que se dibuja cuando esa fuente responde; punteado si falló.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

ADAPTACIÓN (revisión final, 2026-11-08): el proxy devuelve todas las fuentes en una sola respuesta, así que los anillos se dibujan en cascada fija (de afuera hacia adentro) cuando llega esa respuesta, no uno por fuente en tiempo real. Mientras se espera, la roseta gira con anillos punteados. Dibujar cada anillo al llegar su fuente queda como mejora futura (requiere que el proxy responda por partes). El veredicto sin color se lee por la palabra y el símbolo del centro, no por la forma de la roseta.
