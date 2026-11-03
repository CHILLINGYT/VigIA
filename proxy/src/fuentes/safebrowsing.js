// Google Safe Browsing v5, método urls.search (la v4 está deprecada).
// Docs: https://developers.google.com/safe-browsing/reference/rest/v5/urls/search
// Uso solo no comercial. En la interfaz hay que atribuir a Google y no afirmar certeza.

const ENDPOINT = 'https://safebrowsing.googleapis.com/v5/urls:search';
const FUENTE = 'google_safe_browsing';

// Orden documentado del enum ThreatType (el número es la posición).
const TIPOS_DE_AMENAZA = ['THREAT_TYPE_UNSPECIFIED', 'MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'];

// --- Decodificador mínimo de protobuf ---
// La v5 solo responde en protobuf (binario) y rechaza alt=json. Protobuf es una lista de campos;
// cada uno empieza con un "varint" que dice su número y su tipo (número * 8 + tipo).
// Tipo 0 = número (varint). Tipo 2 = bloque de bytes con su largo adelante (texto o submensaje).
// Ante cualquier cosa inesperada tiramos un error: es preferible "error" a leer mal.

// Varint: 7 bits por byte; el bit más alto en 1 significa "sigue otro byte".
function leerVarint(bytes, pos) {
	let valor = 0;
	for (let i = 0; i < 10; i++) {
		if (pos >= bytes.length) throw new Error('protobuf cortado');
		const byte = bytes[pos++];
		valor += (byte & 0x7f) * 2 ** (7 * i);
		if (byte < 0x80) return [valor, pos];
	}
	throw new Error('varint demasiado largo');
}

// Devuelve [{ numero, tipo, valor }], donde valor es un número (tipo 0) o bytes (tipo 2).
function leerCampos(bytes) {
	const campos = [];
	let pos = 0;
	while (pos < bytes.length) {
		let clave, valor;
		[clave, pos] = leerVarint(bytes, pos);
		const numero = Math.floor(clave / 8);
		const tipo = clave % 8;
		if (tipo === 0) {
			[valor, pos] = leerVarint(bytes, pos);
		} else if (tipo === 2) {
			let largo;
			[largo, pos] = leerVarint(bytes, pos);
			if (pos + largo > bytes.length) throw new Error('protobuf cortado');
			valor = bytes.subarray(pos, pos + largo);
			pos += largo;
		} else {
			throw new Error(`tipo de campo inesperado: ${tipo}`);
		}
		campos.push({ numero, tipo, valor });
	}
	return campos;
}

// Lee los tipos de amenaza de un ThreatUrl. Pueden venir "empaquetados" (tipo 2, varios varints
// juntos) o uno por campo (tipo 0): protobuf permite las dos formas.
function leerTiposDeAmenaza(campo) {
	if (campo.tipo === 0) return [campo.valor];
	const numeros = [];
	for (let pos = 0; pos < campo.valor.length; ) {
		let n;
		[n, pos] = leerVarint(campo.valor, pos);
		numeros.push(n);
	}
	return numeros;
}

// Estructura de la respuesta (números de campo verificados con las URLs de prueba de Google):
//   SearchUrlsResponse { 1: ThreatUrl threats (repetido), 2: Duration cacheDuration }
//   ThreatUrl { 1: string url, 2: ThreatType threatTypes (repetido) }
export function decodificarRespuesta(bytes) {
	const amenazas = [];
	for (const campo of leerCampos(bytes)) {
		if (campo.numero === 2) continue; // cacheDuration: no lo usamos
		if (campo.numero !== 1 || campo.tipo !== 2) throw new Error(`campo inesperado: ${campo.numero}`);

		const tipos = leerCampos(campo.valor)
			.filter((c) => c.numero === 2)
			.flatMap(leerTiposDeAmenaza);
		if (tipos.length === 0) throw new Error('amenaza sin tipo'); // no sabemos leerla: mejor "error"
		amenazas.push(...tipos.map((n) => TIPOS_DE_AMENAZA[n] ?? `DESCONOCIDO_${n}`));
	}
	return [...new Set(amenazas)];
}

// Devuelve { fuente, resultado: 'detectado' | 'no_detectado' | 'error', detalle? }.
// Si algo falla devolvemos 'error', NUNCA 'no_detectado': una falla no puede parecer un link limpio.
export async function consultarSafeBrowsing(url, apiKey) {
	if (!apiKey) return { fuente: FUENTE, resultado: 'error' };
	try {
		const respuesta = await fetch(`${ENDPOINT}?urls=${encodeURIComponent(url)}`, {
			// La key va en un encabezado y no en la URL, para que no quede en ningún log.
			headers: { 'X-Goog-Api-Key': apiKey },
			signal: AbortSignal.timeout(5000),
		});
		if (!respuesta.ok) {
			// Solo el código y el tipo de error de Google: nunca la URL consultada ni la key.
			console.error('safe_browsing: HTTP', respuesta.status, (await respuesta.text()).slice(0, 300));
			return { fuente: FUENTE, resultado: 'error' };
		}

		const amenazas = decodificarRespuesta(new Uint8Array(await respuesta.arrayBuffer()));
		return amenazas.length > 0
			? { fuente: FUENTE, resultado: 'detectado', detalle: amenazas }
			: { fuente: FUENTE, resultado: 'no_detectado' };
	} catch (e) {
		console.error('safe_browsing:', e.name, e.message);
		return { fuente: FUENTE, resultado: 'error' };
	}
}
