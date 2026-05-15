import pg from 'pg';
import 'dotenv/config';

async function reset() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const hash = '$2b$10$nARQb0bbF1aMsmyYtOuLG.Mxs8zVRXBTc5v.qkhITx9vHEQ5O.5d2';
  await pool.query('UPDATE ml_commercial.admin_users SET password_hash = $1 WHERE username = $2', [hash, 'admin']);
  console.log('Password hash reset successfully.');
  await pool.end();
}

reset();
