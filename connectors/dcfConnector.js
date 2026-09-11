const nodeFetch = require('node-fetch');
const mysql = require('mysql2');
const config = require('../config.js');
const logger = require('../logger');


// Setting up a MySQL connection pool from the provided configurations.
// This pool will manage multiple database connections, allowing for efficient reuse and management of connections.
const connection = mysql.createPool({
    host: config.mysql_host,
    user: config.mysql_user,
    password: config.mysql_password,
    database: config.mysql_database,
    insecureAuth : false
});




const parseCookies = (cookieHeader) => {
    const list = {};
    cookieHeader && cookieHeader.split(';').forEach((cookie) => {
        const parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });
    return list;
};



/**
 * Extracts the session ID from the cookies in the request.
 * Logs and returns the session ID if present, or null if not found.
 * @param {Object} req - The incoming HTTP request containing cookies.
 * @returns {String|null} The extracted session ID or null if not available.
 */
const getSessionIDFromCookie = (req) => {
    logger.info({ event_type: 'session_cookie_lookup' });
    const cookies = parseCookies(req.headers.cookie);
     
    if (!cookies["connect.sid"]) {
        return null;
    }
    return cookies["connect.sid"].match('.*[.]')[0].slice(4, -1);
};


/**
 * Asynchronously gets a database connection from the connection pool.
 * Logs the attempt and result of getting a connection.
 * @param {Object} pool - The database connection pool.
 * @returns {Promise<Object>} A promise resolving with a database connection.
 */
const getDatabaseConnection = (pool) => new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
        if (err) reject(err);
        else resolve(connection);
    });
});




/**
 * Performs a database query using an established connection.
 * Logs the query execution attempt and outcome.
 * @param {Object} connection - The database connection to use for the query.
 * @param {String} query - The SQL query string to execute.
 * @param {Array} values - Parameters to pass to the query for prepared statements.
 * @returns {Promise<Array|Object>} A promise resolving with the query results.
 */
const queryDatabase = (connection, query, values = []) => new Promise((resolve, reject) => {
    connection.query(query, values, (err, results) => {
        if (err) reject(err);
        else resolve(results);
    });
});



/**
 * Retrieves the DCF token from the database using the session ID obtained from the request cookie.
 * Logs the process of retrieving the token and any errors or issues encountered.
 * @param {Object} req - The incoming HTTP request to extract the session ID from.
 * @param {Object} pool - The database connection pool to use for queries.
 * @returns {String} A promise resolving with the DCF token or -1 in case of failure.
 */
const getDCFTokenFromDatabase = async (req, pool) => {
    logger.info({ event_type: 'dcf_token_lookup_start' });
    try {
        const connection = await getDatabaseConnection(pool);
        try {
            const sessionID = getSessionIDFromCookie(req); // Example sessionID, replace with actual logic
            if (!sessionID || sessionID==null) throw new Error("No session ID found");
            const rows = await queryDatabase(connection, "SELECT * FROM ctdc.sessions WHERE session_id = ?", [sessionID]);
            if (!rows || !rows[0] || !rows[0].data) throw new Error("Session expires or not found");

            const output = JSON.parse(rows[0].data).tokens;
            return output;
        } finally {
            connection.release();
        }
    } catch (error) {
        logger.error({ event_type: 'dcf_token_lookup_error', message: error.message });
        return "NA";
    }
};


/**
 * Fetches a DCF file using the provided file ID and access token.
 * Logs the request attempt, any errors encountered, and the success state.
 * @param {String} file_id - The ID of the file to fetch.
 * @param {String} accessToken - The access token required for authentication.
 * @returns { Object } 
 */
const fetchDCFFile = async (file_id, accessToken) => {
    const url = `${config.DCF_File_URL}/${file_id}`;
    logger.info({ event_type: 'dcf_file_fetch_start', file_id, url });
    try {
        const response = await nodeFetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) {
            logger.error({
                event_type: 'dcf_file_fetch_unauthorized',
                status: response.status,
                message: response.statusText,
            });
            return {
                status: response.status,
                message: `File not found: ${response.status} (${response.statusText})`
            };
            // throw new Error(`HTTP error! status: ${response.status}`);
        }
        logger.info({ event_type: 'dcf_file_fetch_success', file_id });

        const signed_url= await response.json();

        return {
            status: 200,
            message: signed_url
        };
    } catch (error) {
        logger.error({ event_type: 'dcf_file_fetch_error', file_id, message: error.message });
        return {
            status: 500,
            message: "Failed to fetch DCF file:"+ error.message
        };
    }
};


/**
 * The main function that orchestrates the retrieval of a DCF token and fetching of a file.
 * Logs the process and handles any failures encountered along the way.
 * @param {String} file_id - The ID of the file to be fetched.
 * @param {Object} req - The request object, used to retrieve the session ID and DCF token.
 */
module.exports = async (file_id, req) => {
    logger.info({ event_type: 'dcf_connector_start', file_id });
    const connectionPool = connection;
    logger.info({ event_type: 'dcf_database_pool_ready' });

    const token = await getDCFTokenFromDatabase(req, connectionPool);

    if (token == "NA") {
         return {
            status: 500,
            message: "Failed to retrieve valid token, cannot proceed with file fetch"
        }
    } else {
        return fetchDCFFile(file_id, token);
    }
};
