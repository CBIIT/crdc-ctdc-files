const mysql = require('mysql2');
const config = require('../config');
const {getSessionIdFromCookie, queryDatabase} = require('./session-database');

const sessionConnection = mysql.createPool({
  host: config.mysql_host,
  port: config.mysql_port,
  user: config.mysql_user,
  password: config.mysql_password,
  database: config.mysql_database,
  insecureAuth: false,
});

async function getUserInfoFromDatabase(req) {
  const sessionId = getSessionIdFromCookie(req);
  if (!sessionId) return {};
  console.log(`Session ID: ${sessionId}`);
  try {
    const rows = await queryDatabase(
      sessionConnection,
      'SELECT data FROM ctdc.sessions WHERE session_id = ?',
      [sessionId]
    );
    if (!rows || !rows[0] || !rows[0].data) return {};
    const sessionData = JSON.parse(rows[0].data);
    console.log("sessionData:", sessionData);
    return sessionData.userInfo || {};
    
  } catch (error) {
    console.error(`Error fetching user info from database: ${error}`);
    return {};
  }
}

module.exports = {
  getSessionIdFromCookie,
  getUserInfoFromDatabase,
};
