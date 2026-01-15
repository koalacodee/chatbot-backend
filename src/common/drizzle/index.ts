import { migrate as drizzleMigrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export async function migrate() {
  const folder = process.env.DRIZZLE_MIGRATIONS_FOLDER;
  if (!folder) {
    console.warn('DRIZZLE_MIGRATIONS_FOLDER is not set');
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn('DATABASE_URL is not set');
    return;
  }

  await waitForDatabase(databaseUrl).then(async () => {
    console.log('Database is ready!');
    const pool = new Pool({
      connectionString: databaseUrl,
      max: 1,
    });
    const db = drizzle(pool);
    await drizzleMigrate(db, {
      migrationsFolder: folder,
    });
    await pool.end();
  });
  console.log('Migrations completed!');
  return true;
}

async function waitForDatabase(url: string, maxAttempts = 10, interval = 3000) {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      // Create a new SQL instance with the provided URL
      const db = new Pool({
        connectionString: url,
      });

      // Attempt to connect to the database
      await db.query('SELECT 1');
      console.log('Database is ready!');
      return true;
    } catch (_error) {
      console.log('Database is not ready yet. Retrying...');
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  console.error('Failed to connect to the database after multiple attempts.');
  return false;
}
