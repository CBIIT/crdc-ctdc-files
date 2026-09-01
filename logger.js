const winston = require('winston');
const { isCaseInsensitiveEqual } = require('./utils/string-util');

const APP_NAME = process.env.APP_NAME || 'CTDC-Files';
const CADR_NAME = process.env.CADR_NAME || 'CTDC(Clinical and Translational Data Commons)';
const NIH_ICO = process.env.NIH_ICO || 'NCI';
const DEST_IP = process.env.DEST_IP || undefined;
const DEST_PORT = process.env.DEST_PORT || undefined;

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
        if (DEST_IP) info.dest_ip = DEST_IP;
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
    if (req.originalUrl || req.url) context.url = req.originalUrl || req.url;
    if (req.headers) {
        if (req.headers['user-agent']) context.http_user_agent = req.headers['user-agent'];
        if (req.headers['content-type']) context.http_content_type = req.headers['content-type'];
    }
    const localPort = req.socket && req.socket.localPort;
    if (localPort) context.dest_port = String(localPort);
    else if (DEST_PORT) context.dest_port = DEST_PORT;
    const localAddress = req.socket && req.socket.localAddress;
    if (localAddress) context.dest_ip = localAddress;
    else if (DEST_IP) context.dest_ip = DEST_IP;
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
function logNihCadrFields(eventType, { req, userInfo, idp, statusCode = 200 } = {}) {
    // NIH CADR field-by-field logging only applies to the RAS identity provider
    // if (!isCaseInsensitiveEqual(idp, "RAS")) return;

    const safeReq = req || {};
    const safeUserInfo = userInfo || {};
    const headers = safeReq.headers || {};
    // winston's format chain has no splat(), so values must be inlined in the message string
    const log = (label, value) => winston.info(`${label}: ${value}`);
    log('Event Type ', eventType);
    log('NIH User ID', safeUserInfo.sub ?? NA);
    log('Transaction Number', safeUserInfo.txn ?? NA);
    log('Data Repository accessed', NA);
    log('Study/Data set accessed', NA);
    log('Date/Time of access', new Date().toISOString());
    log('Source IP address of the connection', safeReq.ip ?? NA);
    log('Destination IP address of the connection', NA);
    log('Destination port of the connection', NA);
    log('Identifies the users first name and last name associated with the event', `${safeUserInfo.firstName ?? safeUserInfo.first_name ?? NA} ${safeUserInfo.lastName ?? safeUserInfo.last_name ?? NA}`);
    log('NIH, Login.gov, RAS or other providers', `${idp ?? NA} ${safeUserInfo.source ?? NA}`);
    log('Unique session identifier', safeReq.sessionID ?? NA);
    log('The requested URL', safeReq.originalUrl ?? NA);
    log('The application or service accessed', 'ctdc-file-service');
    log('Browser or client application making the request', headers['user-agent'] ?? NA);
    log('Outcome of the action (e.g., HTTP status code)', String(statusCode));
    log('Content type of the HTTP response', headers['content-type'] ?? NA);
    log('Number of bytes transferred', headers['content-length'] ?? NA);
    log('Duration of the connection', NA);
    log('NIH ICO', 'N/A');
    log('CADR Name', 'CTDC(Clinical and Translational Data Commons)');
    log('User Country Name', NA);
    log("Name of the user's institution affiliation", NA);
    log("User's Email address", safeUserInfo.email ?? NA);
    log('eRA Commons ID', safeUserInfo.federated_identities_ial2?.identities?.era?.userid ?? NA);
    log('User Permission Group', 'dbGaP Authorized User');
    log('user_id', safeUserInfo.sub ?? NA);
}

module.exports = winston;
module.exports.logAuditEvent = logAuditEvent;
module.exports.extractRequestContext = extractRequestContext;
module.exports.logNihCadrFields = logNihCadrFields;
