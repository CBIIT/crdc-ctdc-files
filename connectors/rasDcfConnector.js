const nodeFetch = require('node-fetch');
const mysql = require('mysql2');
const config = require('../config.js');
const logger = require('../logger');
const {
    parseCookies,
    getSessionIdFromCookie,
    getDatabaseConnection,
    queryDatabase,
} = require('../utils/session-database');


// Setting up a MySQL connection pool from the provided configurations.
// This pool will manage multiple database connections, allowing for efficient reuse and management of connections.
const connection = mysql.createPool({
    host: config.mysql_host,
    user: config.mysql_user,
    password: config.mysql_password,
    database: config.mysql_database,
    insecureAuth : false
});



/**
 * Retrieves the DCF passport from the session database.
 * @returns {String} A promise resolving with the DCF token or -1 in case of failure.
 */
const getPassportFromDatabase = async (req, pool) => {
    logger.info({
        event_type: 'passport_lookup_start',
        has_request: Boolean(req),
        pool_exists: Boolean(pool),
    });
    try {
        const connection = await getDatabaseConnection(pool);
        try {
            const sessionID = getSessionIdFromCookie(req);
            logger.info({
                event_type: 'passport_session_lookup',
                session_id: sessionID,
            });
            if (!sessionID || sessionID==null) throw new Error("No session ID found");
            const rows = await queryDatabase(connection, "SELECT * FROM sessions WHERE session_id = ?", [sessionID]);
            if (!rows || !rows[0] || !rows[0].data) throw new Error("Session expires or not found");

            const parsedData = JSON.parse(rows[0].data);
            const passport = parsedData?.userInfo?.userInfo?.passport_jwt_v11 || "";

            if (typeof passport !== 'string' || passport.trim() === '') {
                throw new Error("Invalid passport format");
            }

            logger.info({
                event_type: 'passport_lookup_success',
                has_passport: true,
            });
            return passport;
        } finally {
            connection.release();
        }
    } catch (error) {
        logger.error({
            event_type: 'passport_lookup_error',
            message: error && error.message ? error.message : String(error),
        });
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
    logger.info({
        event_type: 'dcf_fetch_start',
        file_id,
        has_passport: Boolean(passport),
    });
    if (!config.DCF_FILE_URL_RAS) {
        logger.error({
            event_type: 'dcf_fetch_missing_config',
            message: 'DCF_FILE_URL_RAS not configured',
        });
        return { status: 500, message: 'DCF_FILE_URL_RAS not configured' };
    }

    const tryPostAccess = async (url) => {
        try {
            const body = JSON.stringify({ passports: [passport] });
            logger.info({
                event_type: 'dcf_access_request',
                url,
            });
            const resp = await nodeFetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body
            });
            const text = await resp.text().catch(() => '');
            let data = null;
            try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }

            if (!resp.ok) {
                logger.warn({
                    event_type: 'dcf_access_response_not_ok',
                    status: resp.status,
                    statusText: resp.statusText,
                });
                return { ok: false, status: resp.status, statusText: resp.statusText, body: data };
            }
            logger.info({
                event_type: 'dcf_access_response_ok',
                status: resp.status,
            });
            return { ok: true, status: resp.status, body: data };
        } catch (err) {
            logger.error({
                event_type: 'dcf_access_request_error',
                message: err && err.message ? err.message : String(err),
            });
            return { ok: false, status: 0, statusText: err.message };
        }
    };

    try {
        let accessId = "s3";
        const accessUrl = `${config.DCF_FILE_URL_RAS}/${file_id}/access/${accessId}`;
        console.log('Attempting POST to access with access_id:', accessUrl);
        const result = await tryPostAccess(accessUrl);
        if (result.ok) {
            const respBody = result.body;
            if (respBody && typeof respBody === 'object' && respBody.url) {
                logger.info({
                    event_type: 'dcf_fetch_success',
                    file_id,
                    url: respBody.url,
                });
                return { status: 200, message: respBody.url };
            }
            logger.info({
                event_type: 'dcf_fetch_success',
                file_id,
                response_body: respBody,
            });
            return { status: 200, message: respBody };
        }
        logger.warn({
            event_type: 'dcf_fetch_failed',
            file_id,
            status: result.status || 500,
            message: result.body || result.statusText || 'Access request failed',
        });
        return { status: result.status || 500, message: result.body || result.statusText || 'Access request failed' };
    } catch (err) {
        logger.error({
            event_type: 'dcf_fetch_exception',
            file_id,
            message: err && err.message ? err.message : String(err),
        });
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
    logger.info({
        event_type: 'passport_validation_start',
        has_visa: Boolean(visa),
    });
    if (!visa) {
        logger.warn({
            event_type: 'passport_validation_missing',
            message: 'No visa provided',
        });
        return { ok: false, status: 400, body: 'No visa provided' };
    }
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

        const isValid = trimmed === 'Valid';
        logger.info({
            event_type: 'passport_validation_result',
            url,
            is_valid: isValid,
            response_status: resp && resp.status,
        });
        return isValid;
    } catch (err) {
        logger.error({
            event_type: 'passport_validation_error',
            message: err && err.message ? err.message : String(err),
        });
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
    logger.info({
        event_type: 'ras_dcf_connector_start',
        file_id,
        has_request: Boolean(req),
    });
    const connectionPool = connection;

    const passport = await getPassportFromDatabase(req, connectionPool);

    logger.info({
        event_type: 'passport_status',
        file_id,
        has_passport: passport && passport !== 'NA',
        passport_value: passport && passport !== 'NA' ? 'present' : 'missing',
    });
    if (passport == "NA") {
        logger.warn({
            event_type: 'ras_dcf_connector_token_failure',
            file_id,
            message: 'Failed to retrieve valid token, cannot proceed with file fetch',
        });
         return {
            status: 500,
            message: "Failed to retrieve valid token, cannot proceed with file fetch"
        }
    } else {
        const isValid = await isValidatePassport(passport);
        logger.info({
            event_type: 'passport_validation_outcome',
            file_id,
            is_valid: isValid,
        });
        if (!isValid) {
            logger.warn({
                event_type: 'ras_dcf_connector_validation_failed',
                file_id,
                message: 'Passport validation failed',
            });
            return { status: 500, message: 'Passport validation failed' };
        }
        const result = await fetchDCFFile(file_id, passport);
        logger.info({
            event_type: 'ras_dcf_connector_end',
            file_id,
            status: result && result.status,
        });
        return result;
    }
};

// Export internals for unit testing
module.exports._internals = {
    isValidatePassport,
    fetchDCFFile,
    getPassportFromDatabase,
    parseCookies
};
