const { removeTrailingSlashes } = require('./utils');
const fs = require('fs');
const dotenv = require('dotenv')

// Load .env.test in test environment, otherwise load .env
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: envFile });

const DEFAULT_EXPIRATION_SECONDS = 60 * 60 * 24; // 24 hours

const INDEXD = 'INDEXD';
const CLOUD_FRONT = 'CLOUD_FRONT';
const LOCAL = 'LOCAL';
const PUBLIC_S3 = 'PUBLIC_S3';
const SIGNED_S3 = 'SIGNED_S3';
const DUMMY = 'DUMMY';
const ICDC = 'ICDC';
const BENTO = 'BENTO';
const GMB = 'GMB';
const C3DC = 'C3DC';
const CTDC = 'CTDC';
const CDS = 'CDS';
const DCF = 'DCF';
const RAS_DCF = 'RAS';

const config = {
  projectNames: {
    ICDC,
    BENTO,
    GMB,
    C3DC,
    CTDC,
    CDS
  },
  sourceNames: {
    INDEXD,
    CLOUD_FRONT,
    LOCAL,
    PUBLIC_S3,
    SIGNED_S3,
    DUMMY,
    DCF,
    RAS_DCF,
  },
  source: 'DCF',
  res_passport_validation_url: process.env.RAS_PASSPORT_VALIDATION_URL || 'https://stsstg.nih.gov/passport/validate',
  fake: process.env.FAKE ? (process.env.FAKE.toLowerCase() === 'true') : false, // This is used to fake CloudFront call locally
  backendUrl: removeTrailingSlashes(process.env.BACKEND_URL),
  authorizationEnabled: process.env.AUTHORIZATION_ENABLED ? process.env.AUTHORIZATION_ENABLED.toLowerCase() === 'true' : false,
  authEnabled: process.env.AUTH_ENABLED ? process.env.AUTH_ENABLED.toLowerCase() === 'true' : false,
  authUrl: process.env.AUTH_URL ? (process.env.AUTH_URL.toLowerCase() === 'null' ? null : process.env.AUTH_URL) : null,
  version: process.env.VERSION,
  date: process.env.DATE,
  project: (process.env.PROJECT || BENTO).toUpperCase(),
  // MySQL Session
  mysqlSessionEnabled: process.env.MYSQL_SESSION_ENABLED ? process.env.MYSQL_SESSION_ENABLED.toLowerCase() === 'true' : false,
  mysql_host: process.env.MYSQL_HOST,
  mysql_port: process.env.MYSQL_PORT,
  mysql_user: process.env.MYSQL_USER,
  mysql_password: process.env.MYSQL_PASSWORD,
  mysql_database: process.env.MYSQL_DATABASE,
  session_timeout: process.env.SESSION_TIMEOUT ? parseInt(process.env.SESSION_TIMEOUT) * 1000 : 1000 * 30 * 60,  // 30 minutes
  cookie_secret: process.env.COOKIE_SECRET,
  //NEO4j
  neo4j_uri: process.env.NEO4J_URI,
  neo4j_user: process.env.NEO4J_USER,
  neo4j_password: process.env.NEO4J_PASSWORD,
  // NIH CADR logging identifiers
  nih_ico: process.env.NIH_ICO || 'NCI',
  cadr_name: process.env.CADR_NAME || 'Cancer Data Service',




};

if (!config.version) {
  config.version = 'Version not set'
}

if (!config.date) {
  config.date = new Date();
}

// Make sure when authentication is enabled, authUrl is also set
if (config.authEnabled && (!config.authUrl || !config.authUrl.startsWith('http'))) {
  throw `Invalid auth URL: ${config.authUrl}`;
}

function readPrivateKey(keyPath) {
  return fs.readFileSync(keyPath, 'utf8');
}

config.DCF_FILE_URL_RAS = removeTrailingSlashes(process.env.DCF_FILE_URL_RAS || '');
config.DCF_File_URL = removeTrailingSlashes(process.env.DCF_FILE_URL || '');
config.indexDUrl = removeTrailingSlashes(process.env.INDEXD_URL || '');
config.cfUrl = removeTrailingSlashes(process.env.CF_URL || '');
config.cfKeyPairId = process.env.CF_KEY_PAIR_ID || '';
config.cfPrivateKey = process.env.CF_PRIVATE_KEY || '';
config.urlExpiresInSeconds = process.env.URL_EXPIRES_IN_SECONDS || DEFAULT_EXPIRATION_SECONDS

module.exports = config;
