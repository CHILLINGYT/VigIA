// Proxy de VigIA (Cloudflare Worker).
// Guarda las API keys y es lo único que habla con las APIs externas.
// Cualquier ruta que no esté acá devuelve 404: este Worker NO es un proxy abierto.

import { registrarUso } from './limites.js';
import { consultarSafeBrowsing } from './fuentes/safebrowsing.js';

const LARGO_MAXIMO_URL = 2048;
const LARGO_MAXIMO_CUERPO = 4096;
const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

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

async function checkUrl(request, env) {
	// 1. ¿El pedido viene de la app? (barrera, no seguridad fuerte: el token se puede extraer de la app)
	const token = request.headers.get('Authorization')?.replace(/^Bearer /, '');
	if (!tokenValido(token, env.APP_TOKEN)) return error(401, 'no autorizado');

	// 2. ¿Trae un ID de instalación con formato correcto?
	const idInstalacion = request.headers.get('X-Instalacion-Id');
	if (!FORMATO_UUID.test(idInstalacion ?? '')) return error(400, 'falta el ID de instalación');

	// 3. ¿El cuerpo es JSON chico con una URL válida?
	const cuerpo = await request.text();
	if (cuerpo.length > LARGO_MAXIMO_CUERPO) return error(413, 'pedido demasiado grande');
	let datos;
	try {
		datos = JSON.parse(cuerpo);
	} catch {
		return error(400, 'el cuerpo tiene que ser JSON');
	}
	const url = validarUrl(datos?.url);
	if (!url) return error(400, 'url inválida');

	// 4. ¿Le queda cuota hoy? Si la base falla, rechazamos: preferimos no responder a gastar cuotas.
	try {
		if (!(await registrarUso(env.DB, idInstalacion, 'consulta'))) {
			return error(429, 'llegaste al límite de consultas de hoy');
		}
	} catch {
		return error(503, 'servicio no disponible, probá más tarde');
	}

	// 5. Consultamos las fuentes. Devolvemos lo que dice cada una: el veredicto lo calcula la app.
	// Próximos pasos: se suman URLhaus y VirusTotal a esta lista.
	const fuentes = await Promise.all([consultarSafeBrowsing(url.href, env.SAFE_BROWSING_KEY)]);
	return Response.json({ url: url.href, fuentes });
}

export default {
	async fetch(request, env) {
		const { pathname } = new URL(request.url);

		if (request.method === 'GET' && pathname === '/') {
			return Response.json({ servicio: 'vigia-proxy', estado: 'ok' });
		}
		if (request.method === 'POST' && pathname === '/check-url') {
			return checkUrl(request, env);
		}

		return error(404, 'no encontrado');
	},
};
