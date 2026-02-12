// @ts-check
import { defineConfig } from "astro/config";
import solidJs from "@astrojs/solid-js";

// https://astro.build/config
export default defineConfig({
	output: "static",
	integrations: [solidJs()],
	build: {
		// Use file format for simpler paths
		format: "file"
	},
	// Empty base ensures relative paths without leading slash
	base: ""
});
