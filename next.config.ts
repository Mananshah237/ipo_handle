import type { NextConfig } from 'next';
const config: NextConfig = { output: 'export', trailingSlash: true, poweredByHeader: false, outputFileTracingRoot: process.cwd() };
export default config;
