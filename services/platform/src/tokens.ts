import { secret, type Env } from './model';
export async function tokenKey(env: Env) {
  const bytes = new TextEncoder().encode(secret(env, 'OAUTH_ENCRYPTION_KEY'));
  return crypto.subtle.importKey(
    'raw',
    await crypto.subtle.digest('SHA-256', bytes),
    'AES-GCM',
    false,
    ['encrypt', 'decrypt'],
  );
}
export async function encryptTokens(env: Env, value: unknown) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await tokenKey(env),
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return JSON.stringify({ iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) });
}
export async function decryptTokens(env: Env, value: string) {
  const v = JSON.parse(value);
  const decoded = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(v.iv) },
    await tokenKey(env),
    new Uint8Array(v.data),
  );
  return JSON.parse(new TextDecoder().decode(decoded));
}
