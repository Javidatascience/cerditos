// Comprueba la regla de CLAUDE.md: `src/core/` es lógica pura, sin DOM, sin reloj del
// sistema y sin azar. El tiempo entra siempre como parámetro (dt/now).

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CORE_DIR = join(import.meta.dirname, '.');
const FORBIDDEN: RegExp[] = [/\bwindow\b/, /\bdocument\b/, /\blocalStorage\b/, /Date\.now\(/, /Math\.random\(/];

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(full));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      files.push(full);
    }
  }
  return files;
}

describe('src/core es lógica pura', () => {
  const files = collectSourceFiles(CORE_DIR);

  it('encuentra al menos un fichero fuente que comprobar', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((f) => [f] as const))('%s no usa APIs de navegador ni azar/reloj del sistema', (file) => {
    const content = readFileSync(file, 'utf-8');
    for (const pattern of FORBIDDEN) {
      expect(content).not.toMatch(pattern);
    }
  });

  it.each(files.map((f) => [f] as const))('%s no importa nada de src/ui/', (file) => {
    const content = readFileSync(file, 'utf-8');
    expect(content).not.toMatch(/from\s+['"][.\w/]*\/ui\//);
  });
});
