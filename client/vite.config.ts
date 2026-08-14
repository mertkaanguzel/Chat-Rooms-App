import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const sharedSource = fileURLToPath(new URL('../shared/src/index.ts', import.meta.url));

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@chat/shared': sharedSource,
        },
    },
    test: {
        environment: 'jsdom',
        environmentOptions: {
            jsdom: {
                url: 'http://localhost:3000/',
            },
        },
        setupFiles: ['./src/test/setup.ts'],
        include: ['src/**/*.spec.{ts,tsx}'],
        css: false,
    },
});