import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [solid()],
    root: resolve(__dirname, 'src'),
    base: '/sc2/ui/',
    server: {
        port: 5173,
        open: '/sc2/ui/',
        proxy: {
            '/sc2': {
                target: 'http://localhost:5000',
                changeOrigin: true
            }
        },
        middlewareMode: false,
        hmr: true
    },
    build: {
        outDir: resolve(__dirname, 'dist'),
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'src/index.html'),
                screens: resolve(__dirname, 'src/screens.html'),
                mmrTracker: resolve(__dirname, 'src/mmr-tracker.html')
            },
            output: {
                entryFileNames: 'assets/[name].js',
                chunkFileNames: 'assets/[name].js',
                assetFileNames: 'assets/[name].[ext]'
            }
        }
    }
});
