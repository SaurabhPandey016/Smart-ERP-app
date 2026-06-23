import pkg from 'pg';
const { Client } = pkg;
import 'dotenv/config';

(async () => {
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  try {
    await client.connect();
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public';");
    console.log('Tables in public schema:');
    res.rows.forEach(r => console.log('-', r.table_name));
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
})();
