const winston = require('winston');

const APP_NAME = process.env.APP_NAME || 'ctdc-app';
const CADR_NAME = process.env.CADR_NAME || 'ctdc';
const NIH_ICO = process.env.NIH_ICO || 'NCI';
const DEST_PORT = process.env.DEST_PORT || 443;

// NIH CADR structured JSON format — emits _time, app, cadr_name, nih_ico on every log entry
const nihFormat = winston.format.combine(
    winston.format.timestamp({ format: () => new Date().toISOString() }),
    winston.format.errors({ stack: true }),
    winston.format((info) => {
        info._time = info.timestamp;
        delete info.timestamp;
        info.app = APP_NAME;
        info.cadr_name = CADR_NAME;
        info.nih_ico = NIH_ICO;
        if (DEST_PORT) info.dest_port = DEST_PORT;
        return info;
    })(),
    winston.format.json()
);

if (!global.__CTDC_WINSTON_INITIALIZED__) {
    winston.configure({
        transports: [
            new winston.transports.Console({ format: nihFormat })
        ]
    });
    global.__CTDC_WINSTON_INITIALIZED__ = true;
}

/**
 * Extract NIH CADR required fields from an Express request object.
 * @param {object} req - Express request object
 * @returns {object} NIH CADR fields extractable from the request
 */
function extractRequestContext(req) {
    if (!req) return {};
    const context = {};
    if (req.sessionID) context.session_id = req.sessionID;
    const ip = req.ip
        || (req.connection && req.connection.remoteAddress)
        || (req.socket && req.socket.remoteAddress);
    if (ip) context.src_ip = ip;
    const path = req.originalUrl || req.url;
    const host = typeof req.get === 'function' ? req.get('host') : req.headers?.host;
    if (path) context.url = host && req.protocol ? `${req.protocol}://${host}${path}` : path;
    if (req.headers) {
        if (req.headers['user-agent']) context.http_user_agent = req.headers['user-agent'];
        if (req.headers['content-type']) context.http_content_type = req.headers['content-type'];
    }
    if (req.hostname) context.dest_ip = `${req.protocol}://${host}`;
    return context;
}

/**
 * Log a structured NIH CADR audit event.
 * @param {string} level - Winston log level (info, warn, error, debug)
 * @param {string} eventType - NIH CADR event type (e.g. Login, Logout, Download)
 * @param {object} eventData - Event-specific fields (user_id, user_email, status, etc.)
 * @param {object} [req] - Express request object — used to populate request-context fields
 */
function logAuditEvent(level, eventType, eventData, req) {
    const requestContext = extractRequestContext(req);
    winston[level]({
        event_type: eventType,
        ...requestContext,
        ...eventData,
    });
}

const NA = 'N/A';
const RAS_FIELD_MISSING = 'Expected from RAS but not provided.';
const RAS_FIELD_EMPTY = 'Got an empty value from RAS.';



function getRasField(info, field) {
    if (!Object.prototype.hasOwnProperty.call(info, field)) {
        return RAS_FIELD_MISSING;
    }
    return info[field] === '' || info[field] == null
        ? RAS_FIELD_EMPTY
        : info[field];
}

function getRasFieldFromAliases(info, fields) {
    const field = fields.find((candidate) =>
        Object.prototype.hasOwnProperty.call(info, candidate)
    );
    return field ? getRasField(info, field) : RAS_FIELD_MISSING;
}

function getTxnFromAccessToken(accessToken) {
    if (typeof accessToken !== 'string' || accessToken.trim() === '') {
        return { txn: NA, status: 'missing' };
    }
    try {
        const parts = accessToken.split('.');
        if (parts.length !== 3 || !parts[1]) {
            return { txn: NA, status: 'invalid' };
        }
        const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        if (!claims || Object.keys(claims).length === 0) return { txn: RAS_FIELD_MISSING, status: 'invalid' };
        if (claims.txn == null || claims.txn === '') return { txn: RAS_FIELD_EMPTY, status: 'missing_txn' };
        return { txn: claims.txn, status: 'decoded' };
    } catch (error) {
        return { txn: NA, status: 'invalid' };
    }
}

/**
 * Log the verbose NIH CADR field-by-field audit trail for an auth event.
 * Falls back to "N/A" whenever `req` or `userInfo` (or a specific field on them) is unavailable.
 * @param {string} eventType - e.g. 'Authentication', 'Logout'
 * @param {object} [options]
 * @param {object} [options.req] - Express request object
 * @param {object} [options.userInfo] - IDP user info payload
 * @param {string} [options.idp] - Identity provider name
 * @param {number|string} [options.statusCode] - HTTP status code to report as the outcome
 */
function logNihCadrFields(eventType, {
    req,
    userInfo,
    idp,
    statusCode,
    associated_study,
    duration,
    data_accessed,
    session_id,
    access_token,
} = {}) {
    if (typeof idp !== 'string' || idp.toUpperCase() !== 'RAS') return;

    const safeReq = req || {};
    const safeUserInfo = userInfo?.userInfo?.userInfo || {};
    const txnResult = getTxnFromAccessToken(access_token || '');
    const headers = safeReq.headers || {};
    const requestContext = extractRequestContext(safeReq);
    
    winston.log({
        level: 'info',
        event_type: eventType ?? NA,
        user_id: getRasField(safeUserInfo, 'sub'),
        txn: txnResult.txn,
        _time: new Date().toISOString(),
        src_ip: requestContext.src_ip ?? NA,
        dest_ip: requestContext.dest_ip ?? NA,
        dest_port: requestContext.dest_port ?? NA,
        user_name: `${getRasFieldFromAliases(safeUserInfo, ['firstName', 'first_name'])} ${getRasFieldFromAliases(safeUserInfo, ['lastName', 'last_name'])}`,
        user_id_provider: getRasField(safeUserInfo, 'source'),
        session_id: session_id ?? NA,
        url: requestContext.url ?? NA,
        http_user_agent: headers['user-agent'] ?? NA,
        status: statusCode ?? NA,
        http_content_type: headers['content-type'] ?? NA,
        bytes: headers['content-length'] ?? NA,
        duration: duration ?? NA,
        user_country_name: NA,
        user_org: NA,
        user_email: getRasField(safeUserInfo, 'email'),
        associated_study: associated_study ?? NA,
        eRA_commons_id: getRasField(
            safeUserInfo.federated_identities_ial2?.identities?.era || {},
            'userid'
        ),
        user_permission_group: 'dbGaP',
        data_accessed: data_accessed ?? NA,
        data_repository_accessed: NA,
    });
}

module.exports = winston;   
module.exports.logAuditEvent = logAuditEvent;
module.exports.extractRequestContext = extractRequestContext;
module.exports.logNihCadrFields = logNihCadrFields;
module.exports.getTxnFromAccessToken = getTxnFromAccessToken;
