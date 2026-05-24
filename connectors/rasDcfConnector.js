const nodeFetch = require('node-fetch');
const mysql = require('mysql2');
const config = require('../config.js');


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
    console.log("getSessionIDFromCookie");
    const cookies = parseCookies(req.headers.cookie);
     
    console.log(cookies["connect.sid"]);
    if (!cookies["connect.sid"]) {
        return null;
    }
    console.log(cookies["connect.sid"].match('.*[.]')[0].slice(4, -1));
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
const getPassportFromDatabase = async (req, pool) => {
    console.log("getDCFTokenFromDatabase");
    try {
        const connection = await getDatabaseConnection(pool);
        try {
            const sessionID = getSessionIDFromCookie(req); // Example sessionID, replace with actual logic
            console.log("sessionID: ", sessionID)
            if (!sessionID || sessionID==null) throw new Error("No session ID found");
            const rows = await queryDatabase(connection, "SELECT * FROM sessions WHERE session_id = ?", [sessionID]);
            if (!rows || !rows[0] || !rows[0].data) throw new Error("Session expires or not found");

            const parsedData = JSON.parse(rows[0].data);
            const passport = parsedData?.userInfo?.passport_jwt_v11 || "";

            // validate the passport is a non-empty string
            if (typeof passport !== 'string' || passport.trim() === '') {
                throw new Error("Invalid passport format");
            }
            //validate the passport is a valide or not
            

            return passport;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Error in getPassportFromDatabase:", error.message);
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
const fetchDCFFile = async (file_id, passport) => {
    if (!config.DCF_FILE_URL_RAS) {
        return { status: 500, message: 'DCF_FILE_URL_RAS not configured' };
    }

    const tryPostAccess = async (url) => {
        try {
            const body = JSON.stringify({ passports: [passport] });
            const resp = await nodeFetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body
            });
            const text = await resp.text().catch(() => '');
            let data = null;
            try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }

            if (!resp.ok) {
                return { ok: false, status: resp.status, statusText: resp.statusText, body: data };
            }
            return { ok: true, status: resp.status, body: data };
        } catch (err) {
            return { ok: false, status: 0, statusText: err.message };
        }
    };

    try {
        let accessId = "s3";
        const accessUrl = `${config.DCF_FILE_URL_RAS}/${file_id}/access/${accessId}`;
        console.log('Attempting POST to access with access_id:', accessUrl);
        result = await tryPostAccess(accessUrl);
        if (result.ok) {
            const respBody = result.body;
            if (respBody && typeof respBody === 'object' && respBody.url) {
                return { status: 200, message: respBody.url };
            }
            return { status: 200, message: respBody };
        }
        return { status: result.status || 500, message: result.body || result.statusText || 'Access request failed' };
    } catch (err) {
        return { status: 500, message: 'Error fetching metadata or requesting access: ' + err.message };
    }
};

/**
 * Validate a passport/visa with the STS validation endpoint.
 * Sends form-encoded body `visa=...` as required.
 * @param {String} visa
 * @returns {Object} { ok, status, body }
 */
const isValidatePassport = async (visa) => {
    if (!visa) return { ok: false, status: 400, body: 'No visa provided' };
    const url = config.res_passport_validation_url;
    try {
        const params = new URLSearchParams();
        params.append('visa', visa);

        const resp = await nodeFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });

        const text = await resp.text().catch(() => '');
        const trimmed = (text || '').toString().trim();

        // Per spec: a plain text response equal to 'Valid' (case-sensitive) means success.
        const isValid = trimmed === 'Valid';
        return isValid;
    } catch (err) {
        return false;
    }
};


/**
 * The main function that orchestrates the retrieval of a DCF token and fetching of a file.
 * Logs the process and handles any failures encountered along the way.
 * @param {String} file_id - The ID of the file to be fetched.
 * @param {Object} req - The request object, used to retrieve the session ID and DCF token.
 */
module.exports = async (file_id, req) => {
    console.log("This is DCF Connector ");
    const connectionPool = connection;
    console.log("MYSQL Connection Completed ");

    const passport = await getPassportFromDatabase(req, connectionPool);

    console.log("Access Token: ", passport);
    if (passport == "NA") {
         return {
            status: 500,
            message: "Failed to retrieve valid token, cannot proceed with file fetch"
        }
    } else {
        // Validate passport/visa before requesting DCF access
        const isValid = await isValidatePassport(passport);
        // passport usually expires in 12 hours
        console.log('Passport validation result:', isValid);
        if (!isValid) {
            return { status: 500, message: 'Passport validation failed' };
        }
        return fetchDCFFile(file_id, passport);
    }
};

// Export internals for unit testing
module.exports._internals = {
    isValidatePassport,
    fetchDCFFile,
    getPassportFromDatabase,
    parseCookies
};
