import type { Config } from 'tailwindcss';

export default {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    darkMode: 'media',
    theme: {
        extend: {},
    },
    plugins: [],
} satisfies Config;