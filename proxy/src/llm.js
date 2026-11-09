// Capa de abstracción del modelo de lenguaje (CLAUDE.md: poder cambiar de Groq a Gemini sin tocar la app).
// Los dos proveedores hablan el mismo "idioma" (API compatible con OpenAI): cambia la dirección,
// el modelo y la key. Se elige con la variable LLM_PROVEEDOR ("groq" por defecto).

const PROVEEDORES = {
	groq: {
		url: 'https://api.groq.com/openai/v1/chat/completions',
		modelo: () => 'openai/gpt-oss-20b',
		key: (env) => env.GROQ_API_KEY,
		// gpt-oss "piensa" antes de responder: pensamiento corto y sin devolverlo en la respuesta.
		extras: { reasoning_effort: 'low', include_reasoning: false },
	},
	gemini: {
		url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
		// shortcut: el modelo de Gemini se configura con GEMINI_MODELO; verificar el id en su documentación al cambiar.
		modelo: (env) => env.GEMINI_MODELO,
		key: (env) => env.GEMINI_API_KEY,
		extras: {},
	},
};

// mensajes: [{ role: 'user' | 'assistant', content }]. Devuelve el texto de la respuesta.
// Si algo falla, tira un error: el que llama decide qué mostrar.
export async function completar(mensajes, env) {
	const proveedor = PROVEEDORES[env.LLM_PROVEEDOR ?? 'groq'];
	const key = proveedor?.key(env);
	if (!proveedor || !key || !proveedor.modelo(env)) throw new Error('modelo no configurado');

	const respuesta = await fetch(proveedor.url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
		body: JSON.stringify({
			model: proveedor.modelo(env),
			messages: mensajes,
			temperature: 0.4,
			max_completion_tokens: 2048,
			...proveedor.extras,
		}),
		signal: AbortSignal.timeout(30000),
	});
	if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);

	const texto = (await respuesta.json())?.choices?.[0]?.message?.content;
	if (typeof texto !== 'string' || texto.trim() === '') throw new Error('respuesta vacía');
	return texto.trim();
}
