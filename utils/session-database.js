function parseCookies(cookieHeader) {
  const cookies = {};
  cookieHeader && cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    cookies[parts.shift().trim()] = decodeURI(parts.join('='));
  });
  return cookies;
}

function getSessionIdFromCookie(req) {
  const cookies = parseCookies(req && req.headers && req.headers.cookie);
  const sessionCookie = cookies['connect.sid'];
  if (!sessionCookie) return null;

  const sessionId = sessionCookie.match(/^s:(.+)\./);
  return sessionId ? sessionId[1] : null;
}

function getDatabaseConnection(pool) {
  return new Promise((resolve, reject) => {
    pool.getConnection((error, connection) => {
      if (error) reject(error);
      else resolve(connection);
    });
  });
}

function queryDatabase(connection, query, values = []) {
  return new Promise((resolve, reject) => {
    connection.query(query, values, (error, results) => {
      if (error) reject(error);
      else resolve(results);
    });
  });
}

module.exports = {
  parseCookies,
  getSessionIdFromCookie,
  getDatabaseConnection,
  queryDatabase,
};
