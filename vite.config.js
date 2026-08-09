import {defineConfig} from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
	root: 'example',
	// The base path is passed on the CLI by the `build-example` script,
	// because it needs to match the gh-pages repo name.
	publicDir: false,
	server: {
		port: 8888,
		host: true,
		open: true,
	},
	build: {
		minify: false,
		outDir: '../public',
		emptyOutDir: true,
		sourcemap: 'inline',
	},
});
