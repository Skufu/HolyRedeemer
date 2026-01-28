import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function run(cmd: string, cwd: string) {
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function readBackendDatabaseUrl(): string {
  if (process.env.E2E_DATABASE_URL) return process.env.E2E_DATABASE_URL;
  // Default to the local docker-compose Postgres (port 5433 on host).
  return 'postgresql://postgres:postgres@localhost:5433/library_dev?sslmode=disable';
}

async function resetAndSeedDatabase(repoRoot: string) {
  // Ensure Postgres is running (docker-compose.yml at repo root).
  run('docker-compose up -d postgres', repoRoot);

  // Wait for readiness using the container's pg_isready.
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      run('docker-compose exec -T postgres pg_isready -U postgres', repoRoot);
      ready = true;
      break;
    } catch {
      await sleep(2000);
    }
  }
  if (!ready) throw new Error('Postgres did not become ready in time.');

  // Drop schema using container psql (avoids needing local psql).
  run(
    'docker-compose exec -T postgres psql -U postgres -d library_dev -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"',
    repoRoot,
  );

  const databaseUrl = readBackendDatabaseUrl();

  // Apply migrations (includes seed data).
  // Prefer installed goose; fall back to `go run` if not available.
  const backendDir = path.join(repoRoot, 'backend');
  try {
    run(`goose -dir internal/database/migrations postgres "${databaseUrl}" up`, backendDir);
  } catch {
    run(
      `go run github.com/pressly/goose/v3/cmd/goose@latest -dir internal/database/migrations postgres "${databaseUrl}" up`,
      backendDir,
    );
  }
}

export default async function globalSetup() {
  const repoRoot = path.resolve(__dirname, '../../..');

  // Allow opting out (e.g. when pointing at a shared/staging env)
  if (process.env.E2E_RESET_DB === 'false') return;

  await resetAndSeedDatabase(repoRoot);
}

