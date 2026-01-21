import commonjs from '@rollup/plugin-commonjs';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import {defineConfig, RollupOptions} from 'rollup';
import copy from 'rollup-plugin-copy';

const env = process.env.ROLLUP_WATCH === 'true' ? 'development' : 'production';
const options: RollupOptions = {

    input: './src/portfolio.tsx',
    output: {

        dir: 'dist',
        format: 'esm',
        sourcemap: true,
        entryFileNames: 'app.bundle.js',
        chunkFileNames: '[name].bundle.js',

        manualChunks: (id: string) => {

            if (!id.includes('node_modules')) {
                return null;
            }

            return 'vendor';
        },
    },
    plugins: [

        nodeResolve({browser: true}),
        commonjs(),
        typescript(),
        copy({
            targets: [
                { src: 'app.css', dest: 'dist' },
            ],
        }),
        env === 'production' && terser()
    ],
};

export default defineConfig(options);
