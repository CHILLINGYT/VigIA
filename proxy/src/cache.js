// Caché de resultados de /check-url con la Cache API de Cloudflare.
// Si alguien consultó la misma URL hace poco, reutilizamos el resultado y no gastamos
// cuota de las APIs (VirusTotal permite solo 4 consultas por minuto).
// Ojo: la caché es por centro de datos, no global. Alcanza para el MVP.

// 15 minutos: un link nuevo de phishing puede entrar a las listas en cualquier momento,
// así que no conviene guardar un "no detectado" por mucho tiempo.
const SEGUNDOS_EN_CACHE = 15 * 60;

// La clave es el SHA-256 de la URL: así no guardamos la URL tal cual ni nos pasamos de largo.
async function clave(url) {
	const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(url));
	const hex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
	return `https://cache.vigia.invalid/check-url/${hex}`; // dominio inventado: solo sirve de clave
}

export async function leerCache(url) {
	const guardada = await caches.default.match(await clave(url));
	return guardada ? guardada.json() : null;
}

// Solo guardamos si TODAS las fuentes respondieron: un 'error' no se guarda,
// así la próxima consulta vuelve a intentar en vez de repetir la falla 15 minutos.
export async function guardarCache(url, datos) {
	if (datos.fuentes.some((f) => f.resultado === 'error')) return;
	const respuesta = Response.json(datos, { headers: { 'Cache-Control': `max-age=${SEGUNDOS_EN_CACHE}` } });
	await caches.default.put(await clave(url), respuesta);
}
