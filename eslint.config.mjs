import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { FlatCompat } = require('@eslint/eslintrc');
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
const config = [...compat.extends('next/core-web-vitals', 'next/typescript'), { ignores: ['.next/**', 'out/**', 'node_modules/**', 'next-env.d.ts', 'tests/tmp*/**'] }, { files: ['components/Dashboard.tsx'], rules: { '@next/next/no-html-link-for-pages': 'off' } }];
// Full document navigation keeps static offline routing independent of Next RSC requests.
export default config;
