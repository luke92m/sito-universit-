import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: ['legacy/**', '.next/**', 'node_modules/**', 'lib/data/**', 'next-env.d.ts', 'playwright-report/**', 'dist/**', '.vinext/**', '.cloudflare/**']
  }
];

export default config;
