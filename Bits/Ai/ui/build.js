#!/usr/bin/env node
// Build script for AI bit - runs vite build

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const bitDir = __dirname;
const rootDir = join(bitDir, '..', '..', '..');
const rootNodeModules = join(rootDir, 'node_modules');

console.log('Building AI Bit UI...');

if (!existsSync(rootNodeModules)) {
    console.warn('Warning: Root node_modules not found. Run "npm install" at project root first.');
}

console.log('Running vite build...');
try {
    execSync('npm run build', { cwd: bitDir, stdio: 'inherit' });
    console.log('✓ AI UI built successfully');
} catch (error) {
    console.error('npm run build failed');
    process.exit(1);
}
