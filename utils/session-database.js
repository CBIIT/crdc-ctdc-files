function parseCookies(cookieHeader) {
  const list = {};
  cookieHeader && cookieHeader.split(';').forEach((cookie) => {
    const separatorIndex = cookie.indexOf('=');
    if (separatorIndex === -1) return;

    const name = cookie.slice(0, separatorIndex).trim();
    const value = cookie.slice(separatorIndex + 1);
    list[name] = decodeURIComponent(value);
  });
  return list;
}

function getSessionIdFromCookie(req) {
  const cookies = parseCookies(req && req.headers && req.headers.cookie);
  const sessionCookie = cookies['connect.sid'];
  if (!sessionCookie) return null;

  const match = sessionCookie.match(/^s:([^.]*)\./);
  console.log(match ? match[1] : null);
  return match ? match[1] : null;
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
  console.log("Executing query:", query, "with values:", values);
  return new Promise((resolve, reject) => {
    connection.query(query, values, (error, results) => {
      if (error) {
        console.log("Query execution error:", error);
        reject(error);
      } else {
         console.log("Query executed successfully");
        resolve(results);
      }
    });
  });
}

module.exports = {
  parseCookies,
  getSessionIdFromCookie,
  getDatabaseConnection,
  queryDatabase,
};
