import 'dotenv/config';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import dataSource from '../src/typeorm.config';

type DiscoveredMigration = {
  timestamp: number;
  name: string;
};

type AppliedMigrationRow = {
  id: number;
  timestamp: string | number;
  name: string;
};

function parseTimestampFromName(name: string): number | null {
  const match = name.match(/(\d{13})$/);
  if (!match) return null;
  return Number(match[1]);
}

async function discoverMigrations(): Promise<DiscoveredMigration[]> {
  const migrationsDir = resolve(__dirname, '../src/database/migrations');
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.ts') || file.endsWith('.js'))
    .sort((a, b) => a.localeCompare(b));

  const discovered: DiscoveredMigration[] = [];
  for (const file of files) {
    const filePath = join(migrationsDir, file);
    const content = readFileSync(filePath, 'utf8');
    const classMatch = content.match(/export\s+class\s+([A-Za-z0-9_]+)/);
    if (!classMatch) continue;
    const name = classMatch[1];
    const timestamp = parseTimestampFromName(name);
    if (!timestamp) continue;
    discovered.push({ timestamp, name });
  }

  return discovered.sort((a, b) => a.timestamp - b.timestamp);
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');

  await dataSource.initialize();
  try {
    const appliedRows = (await dataSource.query(
      'SELECT id, `timestamp`, `name` FROM migrations ORDER BY id ASC',
    )) as AppliedMigrationRow[];
    const discovered = await discoverMigrations();

    if (discovered.length === 0) {
      throw new Error('No se detectaron migraciones en src/database/migrations');
    }

    const maxAppliedTimestamp = appliedRows.reduce<number>(
      (max, row) => Math.max(max, Number(row.timestamp)),
      0,
    );

    const appliedKey = new Set(
      appliedRows.map((row) => `${Number(row.timestamp)}::${row.name}`),
    );

    const baselineCandidates = discovered.filter(
      (migration) => migration.timestamp <= maxAppliedTimestamp,
    );
    const missingLegacy = baselineCandidates.filter(
      (migration) =>
        !appliedKey.has(`${migration.timestamp}::${migration.name}`),
    );

    console.log(
      `[baseline] applied=${appliedRows.length} discovered=${discovered.length} maxAppliedTimestamp=${maxAppliedTimestamp}`,
    );
    console.log(
      `[baseline] missingLegacy=${missingLegacy.length} (timestamp <= ${maxAppliedTimestamp})`,
    );

    if (missingLegacy.length === 0) {
      console.log('[baseline] No hay migraciones legacy faltantes. OK.');
      return;
    }

    for (const migration of missingLegacy) {
      console.log(
        `[baseline] ${apply ? 'INSERT' : 'PLAN'} ${migration.timestamp} ${migration.name}`,
      );
      if (!apply) continue;
      await dataSource.query(
        'INSERT INTO migrations (`timestamp`, `name`) VALUES (?, ?)',
        [migration.timestamp, migration.name],
      );
    }

    console.log(
      `[baseline] ${apply ? 'Reconciliacion aplicada' : 'Dry-run completado'}.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error('[baseline] ERROR', error);
  process.exit(1);
});
