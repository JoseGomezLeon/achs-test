import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'

let pg: StartedPostgreSqlContainer | null = null

export async function startPostgres(): Promise<StartedPostgreSqlContainer> {
  if (pg) return pg
  pg = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('pec_test')
    .withUsername('pec')
    .withPassword('pec')
    .start()
  return pg
}

export async function stopPostgres(): Promise<void> {
  if (pg) {
    await pg.stop()
    pg = null
  }
}

export function getConnectionString(): string {
  if (!pg) throw new Error('Postgres container not started — call startPostgres() first')
  return pg.getConnectionUri()
}
