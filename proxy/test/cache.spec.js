// Tests de la caché de resultados (usa la Cache API local que simula wrangler).
import { env, applyD1Migrations } from 'cloudflare:test';
import { it, expect, beforeAll } from 'vitest';
import { leerCache, guardarCache } from '../src/cache.js';
import { checkUrl } from './ayuda.js';

beforeAll(() => applyD1Migrations(env.DB, env.TEST_MIGRATIONS));

const limpio = (url) => ({
	url,
	fuentes: [
		{ fuente: 'google_safe_browsing', resultado: 'no_detectado' },
		{ fuente: 'virustotal', resultado: 'sin_datos' },
	],
});

it('guarda un resultado completo y lo devuelve igual', async () => {
	const datos = limpio('https://guardado.test/');
	expect(await leerCache(datos.url)).toBeNull();
	await guardarCache(datos.url, datos);
	expect(await leerCache(datos.url)).toEqual(datos);
	expect(await leerCache('https://otra.test/')).toBeNull();
});

it('NO guarda si alguna fuente dio error', async () => {
	const datos = limpio('https://con-error.test/');
	datos.fuentes.push({ fuente: 'urlhaus', resultado: 'error' });
	await guardarCache(datos.url, datos);
	expect(await leerCache(datos.url)).toBeNull();
});

it('/check-url responde desde la caché si la URL ya estaba guardada', async () => {
	const datos = limpio('https://ya-consultada.test/');
	await guardarCache(datos.url, datos);
	const respuesta = await (await checkUrl({ url: datos.url })).json();
	expect(respuesta).toEqual({ ...datos, desde_cache: true });
});
