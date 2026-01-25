#!/usr/bin/env node
// Build script for SC2 bit - runs npm install and vite build

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const bitDir = __dirname;
const nodeModulesPath = join(bitDir, 'node_modules');

console.log('Building SC2 Bit UI...');

// Install dependencies if node_modules doesn't exist
if (!existsSync(nodeModulesPath)) {
    console.log('Installing npm dependencies...');
    try {
        execSync('npm install', { cwd: bitDir, stdio: 'inherit' });
    } catch (error) {
        console.error('npm install failed');
        process.exit(1);
    }
}

// Run vite build
console.log('Running vite build...');
try {
    execSync('npm run build', { cwd: bitDir, stdio: 'inherit' });
    console.log('✓ SC2 UI built successfully');
} catch (error) {
    console.error('npm run build failed');
    process.exit(1);
}

