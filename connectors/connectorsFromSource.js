const config = require('../config');

const CONNECTOR_MODULES = {
  [config.sourceNames.INDEXD]: './indexdConnector',
  [config.sourceNames.CLOUD_FRONT]: './cloudFrontConnector',
  [config.sourceNames.LOCAL]: './localConnector',
  [config.sourceNames.SIGNED_S3]: './S3Connector',
  [config.sourceNames.PUBLIC_S3]: './publicS3Connector',
  [config.sourceNames.DUMMY]: './dummyConnector',
  [config.sourceNames.DCF]: './dcfConnector',
  RAS: './rasDcfConnector',
};

const cache = {};

function getConnector(source) {
  const sourceName = String(source || '').trim().toUpperCase();
  const modulePath = CONNECTOR_MODULES[sourceName];
  if (!modulePath) {
    const error = new Error(`Invalid URL source: '${source}'`);
    error.statusCode = 400;
    throw error;
  }
  if (!cache[sourceName]) {
    // Loaded lazily so unused connectors don't need their config at startup
    cache[sourceName] = require(modulePath);
  }
  return cache[sourceName];
}

async function getURLFromSource(fileId, req, res, source) {
  const connector = getConnector(source);
  return connector(fileId, req, res);
}

module.exports = getURLFromSource;
module.exports.getConnector = getConnector;
module.exports.supportedSources = Object.keys(CONNECTOR_MODULES);
