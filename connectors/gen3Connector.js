const axios = require('axios');
const mysql = require('mysql2');
const config = require('../config.js');

const connection = mysql.createPool({
  host: config.mysql_host,
  user: config.mysql_user,
  password: config.mysql_password,
  database: config.mysql_database,
  insecureAuth: false
});

const parseCookies = (cookieHeader) => {
  const list = {};
  cookieHeader && cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    list[parts.shift().trim()] = decodeURI(parts.join('='));
  });
  return list;
};

const getSessionIDFromCookie = (req) => {
  const cookies = parseCookies(req.headers.cookie);
  if (!cookies['connect.sid']) {
    return null;
  }
  return cookies['connect.sid'].match('.*[.]')[0].slice(4, -1);
};

const getDatabaseConnection = (pool) => new Promise((resolve, reject) => {
  pool.getConnection((err, connection) => {
    if (err) reject(err);
    else resolve(connection);
  });
});

const queryDatabase = (connection, query, values = []) => new Promise((resolve, reject) => {
  connection.query(query, values, (err, results) => {
    if (err) reject(err);
    else resolve(results);
  });
});

const getGen3TokenFromAuthService = async (req) => {
  if (!config.gen3AuthUrl) {
    return null;
  }
  try {
    const response = await axios.get(config.gen3AuthUrl, {
      headers: { cookie: req.headers.cookie || '' }
    });
    const data = response.data;
    if (!data) return null;
    if (typeof data === 'string') return data;
    if (data.access_token) return data.access_token;
    if (data.token) return data.token;
    if (data.tokens && data.tokens.access_token) return data.tokens.access_token;
    return null;
  } catch (error) {
    console.error('Error in getGen3TokenFromAuthService:', error.message);
    return null;
  }
};

const getGen3TokenFromDatabase = async (req, pool) => {
  try {
    const connection = await getDatabaseConnection(pool);
    try {
      const sessionID = getSessionIDFromCookie(req);
      if (!sessionID) throw new Error('No session ID found');
      const rows = await queryDatabase(connection, 'SELECT * FROM ctdc.sessions WHERE session_id = ?', [sessionID]);
      if (!rows || !rows[0] || !rows[0].data) throw new Error('Session expires or not found');

      const output = JSON.parse(rows[0].data).tokens;
      return output;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error in getGen3TokenFromDatabase:', error.message);
    return 'NA';
  }
};

const fetchGen3FileStream = async (fileId, accessToken) => {
  const url = `${config.gen3FileUrl}/${fileId}`;
  try {
    const response = await axios.get(url, {
      responseType: 'stream',
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return {
      status: response.status,
      stream: response.data,
      headers: {
        'content-type': response.headers['content-type'],
        'content-length': response.headers['content-length'],
        'content-disposition': response.headers['content-disposition']
      }
    };
  } catch (error) {
    if (error.response) {
      return {
        status: error.response.status,
        message: `File not found: ${error.response.status} (${error.response.statusText})`
      };
    }
    return {
      status: 500,
      message: `Failed to fetch Gen3 file: ${error.message}`
    };
  }
};

module.exports = async (fileId, req) => {
  const connectionPool = connection;
  const authToken = await getGen3TokenFromAuthService(req);
  const token = authToken || await getGen3TokenFromDatabase(req, connectionPool);

  if (token === 'NA') {
    return {
      status: 500,
      message: 'Failed to retrieve valid token, cannot proceed with file fetch'
    };
  }
  return fetchGen3FileStream(fileId, token);
};
