import { readdirSync } from 'node:fs';
import { matchesGlob } from 'node:path';
import { describe, expect, it } from 'vitest';
import config from '../../vitest.config';

/** Every test file must belong to a vitest project, or it silently never runs. */
describe('vitest projects', () => {
  const projects = (config.test?.projects ?? []) as {
    test: { name: string; include: string[]; exclude?: string[] };
  }[];

  const files = (readdirSync('src', { recursive: true }) as string[])
    .map((f) => `src/${f.split(String.fromCharCode(92)).join('/')}`)
    .filter((f) => /\.test\.tsx?$/.test(f));

  it('finds the test files and the projects', () => {
    expect(files.length).toBeGreaterThan(50);
    expect(projects.map((p) => p.test.name)).toEqual(['unit', 'db', 'dom']);
  });

  it('puts every src test file in exactly one project', () => {
    const orphans: string[] = [];
    const doubles: string[] = [];
    for (const file of files) {
      const hits = projects.filter(
        (p) =>
          p.test.include.some((g) => matchesGlob(file, g)) &&
          !(p.test.exclude ?? []).some((g) => matchesGlob(file, g)),
      );
      if (hits.length === 0) orphans.push(file);
      if (hits.length > 1)
        doubles.push(`${file}: ${hits.map((h) => h.test.name).join(', ')}`);
    }
    expect(orphans).toEqual([]);
    expect(doubles).toEqual([]);
  });

  it('runs the theme tests', () => {
    for (const f of [
      'src/styles/contrast.test.ts',
      'src/styles/themes.test.ts',
      'src/lib/appearance.test.ts',
      'src/db/appearance.test.ts',
    ])
      expect(files).toContain(f);
  });
});
