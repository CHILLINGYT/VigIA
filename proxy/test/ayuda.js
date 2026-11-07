import { SELF } from 'cloudflare:test';

// Hace un POST a una ruta del proxy como lo haría la app. Se puede pisar cualquier encabezado.
export function pedir(ruta, cuerpo, { token = 'token-de-prueba', id = crypto.randomUUID() } = {}) {
	const headers = { 'Content-Type': 'application/json' };
	if (token !== null) headers.Authorization = `Bearer ${token}`;
	if (id !== null) headers['X-Instalacion-Id'] = id;
	return SELF.fetch(`http://example.com${ruta}`, {
		method: 'POST',
		headers,
		body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
	});
}

export const checkUrl = (cuerpo, opciones) => pedir('/check-url', cuerpo, opciones);
