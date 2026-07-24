/**
 * Structured JSON logger for NIH CADR audit compliance.
 *
 * Every log entry automatically includes the mandatory CADR fields:
 *   _time, app, cadr_name, nih_ico
 *
 * Two log files are maintained under /logs:
 *   access.log  – HTTP-level access log (written by the morgan middleware in app.js)
 *   cadr-audit.log – structured JSON audit events (written by this module)
 */

const fs = require('fs');
const path = require('path');

const LOG_FOLDER = 'logs';
if (!fs.existsSync(LOG_FOLDER)) {
  fs.mkdirSync(LOG_FOLDER, { recursive: true });
}

const auditLogStream = fs.createWriteStream(
  path.join(__dirname, LOG_FOLDER, 'cadr-audit.log'),
  { flags: 'a' }
);

// Lazily loaded to avoid circular-require issues at startup.
let _config = null;
function getConfig() {
  if (!_config) _config = require('./config');
  return _config;
}

function baseFields() {
  const cfg = getConfig();
  return {
    _time: new Date().toISOString(),
    app: cfg.project || 'CTDC',
    cadr_name: cfg.cadr_name || '',
    nih_ico: cfg.nih_ico || 'NCI',
  };
}

function writeEntry(level, fields) {
  const entry = {
    level,
    ...baseFields(),
    ...(typeof fields === 'string' ? { message: fields } : fields),
  };
  const line = JSON.stringify(entry) + '\n';
  auditLogStream.write(line);
  (level === 'error' ? process.stderr : process.stdout).write(line);
}

const logger = {
  info:  (fields) => writeEntry('info',  fields),
  warn:  (fields) => writeEntry('warn',  fields),
  error: (fields) => writeEntry('error', fields),
};

module.exports = logger;
