// Exportar/importar la partida como texto. Ver docs/02-arquitectura.md §6.
// Formato: "CERDITOS1:" + base64(UTF-8 del JSON) + ":" + checksum FNV-1a en hex.
// Base64 y FNV-1a están escritos a mano (sobre bytes UTF-8, vía TextEncoder/TextDecoder) para
// funcionar igual en el navegador y en Node (tests): `btoa` solo admite Latin1 y los nombres
// del juego llevan tildes y eñes.

import { migrate, SaveValidationError } from './migrations.ts';
import { serialize, type SaveData } from './serialize.ts';
import type { GameState } from '../core/state.ts';

const PREFIX = 'CERDITOS1:';
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]!;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += BASE64_CHARS[b0 >> 2];
    out += BASE64_CHARS[((b0 & 0x03) << 4) | (b1 === undefined ? 0 : b1 >> 4)];
    out += b1 === undefined ? '=' : BASE64_CHARS[((b1 & 0x0f) << 2) | (b2 === undefined ? 0 : b2 >> 6)];
    out += b2 === undefined ? '=' : BASE64_CHARS[b2 & 0x3f];
  }
  return out;
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/=+$/, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    const value = BASE64_CHARS.indexOf(ch);
    if (value === -1) throw new Error('Carácter fuera del alfabeto base64.');
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

/** Texto que el jugador puede copiar y pegar en otro dispositivo (01 §10, 02 §6). */
export function exportSave(state: GameState, now: number): string {
  const json = JSON.stringify(serialize(state, now));
  const b64 = bytesToBase64(new TextEncoder().encode(json));
  return `${PREFIX}${b64}:${fnv1a(b64)}`;
}

export type ImportResult = { ok: true; data: SaveData } | { ok: false; error: string };

/** Valida prefijo, checksum, JSON y versión; migra. No normaliza (eso lo hace quien llame,
 * con el contenido actual) ni sustituye la partida (la decisión de reemplazar es de la UI). */
export function parseImport(text: string): ImportResult {
  const trimmed = text.trim();
  if (!trimmed.startsWith(PREFIX)) {
    return { ok: false, error: 'Eso no parece un código de partida de Cerditos.' };
  }

  const rest = trimmed.slice(PREFIX.length);
  const sep = rest.lastIndexOf(':');
  if (sep === -1) {
    return { ok: false, error: 'El código está incompleto.' };
  }
  const b64 = rest.slice(0, sep);
  const checksum = rest.slice(sep + 1);
  if (fnv1a(b64) !== checksum) {
    return { ok: false, error: 'El código parece incompleto o se ha copiado mal.' };
  }

  let json: string;
  try {
    json = new TextDecoder('utf-8', { fatal: true }).decode(base64ToBytes(b64));
  } catch {
    return { ok: false, error: 'El código no se puede leer.' };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: 'El código no se puede leer.' };
  }

  try {
    return { ok: true, data: migrate(raw) };
  } catch (err) {
    const message = err instanceof SaveValidationError ? err.message : 'Partida no válida.';
    return { ok: false, error: message };
  }
}
