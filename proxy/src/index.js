// Proxy de VigIA (Cloudflare Worker).
// Guarda las API keys y es lo único que habla con las APIs externas.
// Cualquier ruta que no esté acá devuelve 404: este Worker NO es un proxy abierto.

import { registrarUso } from './limites.js';
import { leerCache, guardarCache } from './cache.js';
import { consultarSafeBrowsing } from './fuentes/safebrowsing.js';
import { consultarUrlhaus } from './fuentes/urlhaus.js';
import { consultarVirusTotal, consultarVirusTotalArchivo } from './fuentes/virustotal.js';
import { consultarMalwareBazaar } from './fuentes/malwarebazaar.js';

const LARGO_MAXIMO_URL = 2048;
const LARGO_MAXIMO_CUERPO = 4096;
const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const FORMATO_SHA256 = /^[0-9a-f]{64}$/i;

const error = (status, mensaje) => Response.json({ error: mensaje }, { status });

// Compara el token en tiempo constante, para no filtrar pistas por cuánto tarda la respuesta.
function tokenValido(recibido, esperado) {
	if (!esperado || !recibido) return false;
	const a = new TextEncoder().encode(recibido);
	const b = new TextEncoder().encode(esperado);
	return a.byteLength === b.byteLength && crypto.subtle.timingSafeEqual(a, b);
}

// Devuelve la URL si es válida (http/https, largo razonable) o null si no.
function validarUrl(texto) {
	if (typeof texto !== 'string' || texto.length === 0 || texto.length > LARGO_MAXIMO_URL) return null;
	try {
		const url = new URL(texto);
		return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
	} catch {
		return null;
	}
}

// Controles 1 a 3, iguales para todos los endpoints.
// Devuelve { idInstalacion, datos } o { rechazo: Response } si algo no está bien.
async function leerPedido(request, env) {
	// 1. ¿El pedido viene de la app? (barrera, no seguridad fuerte: el token se puede extraer de la app)
	const token = request.headers.get('Authorization')?.replace(/^Bearer /, '');
	if (!tokenValido(token, env.APP_TOKEN)) return { rechazo: error(401, 'no autorizado') };

	// 2. ¿Trae un ID de instalación con formato correcto?
	const idInstalacion = request.headers.get('X-Instalacion-Id');
	if (!FORMATO_UUID.test(idInstalacion ?? '')) return { rechazo: error(400, 'falta el ID de instalación') };

	// 3. ¿El cuerpo es JSON chico?
	const cuerpo = await request.text();
	if (cuerpo.length > LARGO_MAXIMO_CUERPO) return { rechazo: error(413, 'pedido demasiado grande') };
	try {
		return { idInstalacion, datos: JSON.parse(cuerpo) };
	} catch {
		return { rechazo: error(400, 'el cuerpo tiene que ser JSON') };
	}
}

// Control 4: ¿le queda cuota hoy? Devuelve null si puede seguir, o la respuesta de rechazo.
// Si la base falla, rechazamos: preferimos no responder a gastar cuotas.
async function descontarCuota(env, idInstalacion) {
	try {
		return (await registrarUso(env.DB, idInstalacion, 'consulta')) ? null : error(429, 'llegaste al límite de consultas de hoy');
	} catch {
		return error(503, 'servicio no disponible, probá más tarde');
	}
}

// Pasos 5 y 6: caché y fuentes. Devolvemos lo que dice cada fuente: el veredicto lo calcula la app.
async function responderConCache(ctx, clave, base, consultarFuentes) {
	// 5. ¿Alguien lo consultó hace poco? Devolvemos ese resultado sin gastar cuota de las APIs.
	const enCache = await leerCache(clave);
	if (enCache) return Response.json({ ...enCache, desde_cache: true });

	// 6. Consultamos las fuentes en paralelo: el usuario espera lo que tarda la más lenta, no la suma.
	const resultado = { ...base, fuentes: await consultarFuentes() };
	// waitUntil: guardamos en caché después de responder, sin hacer esperar al usuario.
	ctx.waitUntil(guardarCache(clave, resultado));
	return Response.json({ ...resultado, desde_cache: false });
}

async function checkUrl(request, env, ctx) {
	const pedido = await leerPedido(request, env);
	if (pedido.rechazo) return pedido.rechazo;
	const url = validarUrl(pedido.datos?.url);
	if (!url) return error(400, 'url inválida');
	const sinCuota = await descontarCuota(env, pedido.idInstalacion);
	if (sinCuota) return sinCuota;

	return responderConCache(ctx, url.href, { url: url.href }, () =>
		Promise.all([
			consultarSafeBrowsing(url.href, env.SAFE_BROWSING_KEY),
			consultarUrlhaus(url.href, env.URLHAUS_KEY),
			consultarVirusTotal(url.href, env.VIRUSTOTAL_KEY),
		]),
	);
}

// Archivos: la app manda SOLO el SHA-256 (nunca el archivo). 64 caracteres hexadecimales.
async function checkHash(request, env, ctx) {
	const pedido = await leerPedido(request, env);
	if (pedido.rechazo) return pedido.rechazo;
	const sha256 = pedido.datos?.sha256;
	if (typeof sha256 !== 'string' || !FORMATO_SHA256.test(sha256)) return error(400, 'sha256 inválido');
	const hash = sha256.toLowerCase();
	const sinCuota = await descontarCuota(env, pedido.idInstalacion);
	if (sinCuota) return sinCuota;

	// La clave de caché lleva "hash:" adelante para que nunca se mezcle con una URL.
	// URLHAUS_KEY sirve también para MalwareBazaar: abuse.ch da una sola Auth-Key para sus servicios.
	return responderConCache(ctx, `hash:${hash}`, { sha256: hash }, () =>
		Promise.all([consultarMalwareBazaar(hash, env.URLHAUS_KEY), consultarVirusTotalArchivo(hash, env.VIRUSTOTAL_KEY)]),
	);
}

export default {
	async fetch(request, env, ctx) {
		const { pathname } = new URL(request.url);

		if (request.method === 'GET' && pathname === '/') {
			return Response.json({ servicio: 'vigia-proxy', estado: 'ok' });
		}
		if (request.method === 'POST' && pathname === '/check-url') {
			return checkUrl(request, env, ctx);
		}
		if (request.method === 'POST' && pathname === '/check-hash') {
			return checkHash(request, env, ctx);
		}

		return error(404, 'no encontrado');
	},
};
