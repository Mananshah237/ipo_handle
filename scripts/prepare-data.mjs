import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('public/data', { recursive: true });
await copyFile('data/latest.json', 'public/data/latest.json');
