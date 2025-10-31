#!/usr/bin/env node

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Compile TypeScript and run the callHaapi function
async function runHaapiScript() {
    try {
        console.log('Compiling TypeScript...');
        
        // Compile TypeScript files
        execSync('npm run build:haapi', { 
            cwd: path.join(__dirname, '..'),
            stdio: 'inherit' 
        });
        
        console.log('Running callHaapi...');
        execSync('node dist/run-haapi.js', { 
            cwd: path.join(__dirname, '..'),
            stdio: 'inherit' 
        });
        console.log('callHaapi function completed successfully!');
    } catch (error) {
        console.error('Error running callHaapi:', error.message);
        process.exit(1);
    }
}

// Run the script
runHaapiScript();