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

/**
 * ✅ ADDED: Query helper function
 */
const query = async (sql, params = []) => {
  try {
    const [rows] = await promisePool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Query Error:', error);
    throw error;
  }
};

/**
 * ✅ ADDED: Transaction helper function
 */
const transaction = async (callback) => {
  const connection = await promisePool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  pool,
  promisePool,
  testConnection,
  query,        // ✅ NOW EXPORTED
  transaction,  // ✅ NOW EXPORTED
};