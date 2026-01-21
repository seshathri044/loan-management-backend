const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool(process.env.DATABASE_URL);

const promisePool = pool.promise();

const testConnection = async () => {
  try {
    const conn = await promisePool.getConnection();
    console.log('✅ Database connected');
    conn.release();
    return true;
  } catch (err) {
    console.error('❌ DB connection failed:', err.message);
    return false;
  }
};

module.exports = {
  pool,
  promisePool,
  testConnection,
};
