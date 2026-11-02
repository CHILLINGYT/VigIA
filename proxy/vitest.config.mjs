import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		cloudflareTest(async () => ({
			wrangler: { configPath: "./wrangler.jsonc" },
			miniflare: {
				bindings: {
					// Token falso, solo para tests (el real se carga con `wrangler secret put`).
					APP_TOKEN: "token-de-prueba",
					// Las migraciones se leen acá (Node) y se aplican en cada archivo de test.
					TEST_MIGRATIONS: await readD1Migrations("./migrations"),
				},
			},
		})),
	],
});
