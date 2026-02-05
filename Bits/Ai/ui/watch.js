#!/usr/bin/env node
// Watch script for AI bit - runs vite dev server with HMR on port 5173

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const bitDir = __dirname;
const rootDir = join(bitDir, '..', '..', '..');
const rootNodeModules = join(rootDir, 'node_modules');

console.log('Starting AI Bit UI dev server with HMR...');
console.log('UI will be available at: http://localhost:5173/ai/ui');
console.log('');

if (!existsSync(rootNodeModules)) {
    console.warn('Warning: Root node_modules not found. Run "npm install" at project root first.');
}

console.log('Starting vite dev server...');
const viteProcess = spawn('npm', ['run', 'dev'], {
    cwd: bitDir,
    stdio: 'inherit',
    shell: true
});

viteProcess.on('error', (error) => {
    console.error('Failed to start vite dev server:', error);
    process.exit(1);
});

viteProcess.on('exit', (code) => {
    if (code !== 0) {
        console.error(`Vite dev server exited with code ${code}`);
        process.exit(code);
    }
});

process.on('SIGINT', () => {
    console.log('\nStopping vite dev server...');
    process.exit(0);
});
