import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '..', '.env');
const examplePath = path.resolve(__dirname, '..', '.env.example');

function parseEnv(content) {
  const lines = content.split(/\r?\n/);
  const map = new Map();
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1);
    map.set(key, value);
  }
  return map;
}

function upsertLine(lines, key, value) {
  const idx = lines.findIndex((line) => line.startsWith(`${key}=`));
  if (idx >= 0) lines[idx] = `${key}=${value}`;
  else lines.push(`${key}=${value}`);
}

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    console.log('[setup] Created server/.env from .env.example');
  } else {
    fs.writeFileSync(envPath, 'PORT=3001\n', 'utf8');
    console.log('[setup] Created minimal server/.env');
  }
}

const original = fs.readFileSync(envPath, 'utf8');
const lines = original.split(/\r?\n/);
const env = parseEnv(original);

let changed = false;

if (!env.get('PORT') || !env.get('PORT').trim()) {
  upsertLine(lines, 'PORT', '3001');
  changed = true;
}

if (!env.get('FRONTEND_URL') || !env.get('FRONTEND_URL').trim()) {
  upsertLine(lines, 'FRONTEND_URL', 'http://localhost:5173');
  changed = true;
}

if (!env.get('ALLOWED_ORIGINS') || !env.get('ALLOWED_ORIGINS').trim()) {
  upsertLine(lines, 'ALLOWED_ORIGINS', 'http://localhost:5173');
  changed = true;
}

if (!env.get('JWT_SECRET') || !env.get('JWT_SECRET').trim()) {
  const jwtSecret = crypto.randomBytes(32).toString('hex');
  upsertLine(lines, 'JWT_SECRET', jwtSecret);
  changed = true;
  console.log('[setup] Generated JWT_SECRET');
}

if (changed) {
  fs.writeFileSync(envPath, lines.join('\n'), 'utf8');
  console.log('[setup] Updated server/.env');
} else {
  console.log('[setup] server/.env already has auto-fill values');
}

const after = parseEnv(fs.readFileSync(envPath, 'utf8'));

const requiredManual = [
  'MONGODB_URI',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GEMINI_API_KEY',
  'EMAIL_USER',
  'EMAIL_APP_PASSWORD'
];

const missing = requiredManual.filter((k) => !after.get(k) || !after.get(k).trim());

console.log('\n[setup] Manual steps still required:');
if (missing.length === 0) {
  console.log('- None. All required keys are present.');
} else {
  for (const key of missing) console.log(`- ${key}`);
}

console.log('\n[setup] Next commands:');
console.log('1) npm run setup:auto');
console.log('2) Fill missing keys above in server/.env');
console.log('3) npm run dev');
