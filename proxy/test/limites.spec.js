// Archivo aparte: cada archivo de test tiene su propia base de datos, así estos contadores
// no se mezclan con los otros tests.
import { env, applyD1Migrations } from 'cloudflare:test';
import { it, expect, beforeAll } from 'vitest';
import { checkUrl } from './ayuda.js';

beforeAll(() => applyD1Migrations(env.DB, env.TEST_MIGRATIONS));

const pedir = (id) => checkUrl({ url: 'https://example.com' }, { id });

it('una instalación puede hacer 50 consultas por día; la 51 da 429', async () => {
	const id = crypto.randomUUID();
	for (let i = 0; i < 50; i++) expect((await pedir(id)).status).toBe(200);
	expect((await pedir(id)).status).toBe(429);
	// Otra instalación no se ve afectada.
	expect((await pedir(crypto.randomUUID())).status).toBe(200);
});

it('una instalación pasada de su límite no gasta el límite global', async () => {
	const id = crypto.randomUUID();
	for (let i = 0; i < 100; i++) await pedir(id);
	const { cantidad } = await env.DB.prepare("SELECT cantidad FROM uso WHERE id = 'global'").first();
	expect(cantidad).toBe(50 + 1 + 50); // test anterior (50 + 1 de otra instalación) + este
});

// 300 consultas tardan unos 4,5 s, casi el límite de 5 s de vitest: a veces fallaba por tiempo
// (2026-11-13). Le damos 30 s.
it('el total global se corta en 400 aunque se usen IDs nuevos', { timeout: 30_000 }, async () => {
	// Ya hay 101 consultas globales de los tests anteriores: faltan 299 para llegar a 400.
	for (let i = 0; i < 299; i++) await pedir(crypto.randomUUID());
	expect((await pedir(crypto.randomUUID())).status).toBe(429);
});
