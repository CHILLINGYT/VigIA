// Tests de URLhaus con la API de abuse.ch simulada.
import { it, expect, vi, afterEach } from 'vitest';
import { consultarUrlhaus } from '../src/fuentes/urlhaus.js';

const simularUrlhaus = (respuesta) => vi.spyOn(globalThis, 'fetch').mockResolvedValue(respuesta);

afterEach(() => vi.restoreAllMocks());

it('marca "detectado" si la URL está en la base', async () => {
	simularUrlhaus(Response.json({ query_status: 'ok', threat: 'malware_download', url_status: 'online', tags: ['emotet'] }));
	expect(await consultarUrlhaus('http://malo.test/x.exe', 'key-falsa')).toEqual({
		fuente: 'urlhaus',
		resultado: 'detectado',
		detalle: ['malware_download', 'url_online'],
	});
});

it('marca "no_detectado" si no hay resultados', async () => {
	simularUrlhaus(Response.json({ query_status: 'no_results' }));
	expect((await consultarUrlhaus('https://example.com/', 'key-falsa')).resultado).toBe('no_detectado');
});

it('marca "error" ante respuestas raras, errores HTTP o fallas de red', async () => {
	simularUrlhaus(Response.json({ query_status: 'invalid_url' }));
	expect((await consultarUrlhaus('https://example.com/', 'key-falsa')).resultado).toBe('error');
	simularUrlhaus(new Response('no autorizado', { status: 401 }));
	expect((await consultarUrlhaus('https://example.com/', 'key-falsa')).resultado).toBe('error');
	vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('sin conexión'));
	expect((await consultarUrlhaus('https://example.com/', 'key-falsa')).resultado).toBe('error');
});

it('sin API key no llama a URLhaus', async () => {
	const fetch = simularUrlhaus(Response.json({}));
	expect((await consultarUrlhaus('https://example.com/', undefined)).resultado).toBe('error');
	expect(fetch).not.toHaveBeenCalled();
});

it('manda la key en el encabezado Auth-Key y la URL como formulario', async () => {
	const fetch = simularUrlhaus(Response.json({ query_status: 'no_results' }));
	await consultarUrlhaus('https://example.com/a?b=c', 'key-falsa');
	const [endpoint, opciones] = fetch.mock.calls[0];
	expect(endpoint).toBe('https://urlhaus-api.abuse.ch/v1/url/');
	expect(opciones.method).toBe('POST');
	expect(opciones.headers['Auth-Key']).toBe('key-falsa');
	expect(opciones.body.toString()).toBe('url=https%3A%2F%2Fexample.com%2Fa%3Fb%3Dc');
});
