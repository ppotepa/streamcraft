import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendUrl = process.env.VITE_BACKEND_URL;

export default defineConfig({
    root: resolve(__dirname, 'src'),
    base: '/ai/ui/',
    server: {
        port: 5173,
        open: '/ai/ui/',
        proxy: backendUrl ? {
            '/ai': {
                target: backendUrl,
                changeOrigin: true
            }
        } : undefined,
        middlewareMode: false,
        hmr: true
    },
    build: {
        outDir: resolve(__dirname, 'dist'),
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'src/index.html')
            },
            output: {
                entryFileNames: 'assets/[name].js',
                chunkFileNames: 'assets/[name].js',
                assetFileNames: 'assets/[name].[ext]'
            }
        }
    }
});
