#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Compile TypeScript and run the callHaapi function
async function runHaapiScript() {
    try {
        console.log('Compiling TypeScript...');
        
        // Compile TypeScript files
        execSync('npx tsc', { 
            cwd: path.join(__dirname, '..'),
            stdio: 'inherit' 
        });
        
        console.log('Running callHaapi function...');
        
        // Import and run the compiled function
        const { callHaapi } = require('../dist/authz.js');
        await callHaapi();
        
        console.log('callHaapi function completed successfully!');
    } catch (error) {
        console.error('Error running callHaapi:', error.message);
        process.exit(1);
    }
}

// Run the script
runHaapiScript();