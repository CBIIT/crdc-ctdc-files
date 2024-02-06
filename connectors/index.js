const config = require('../config');
let getUrl;

switch (config.source) {
  case config.sourceNames.INDEXD:
    getUrl = require('./indexdConnector');
    break;
  case config.sourceNames.CLOUD_FRONT:
    getUrl = require('./cloudFrontConnector');
    break;
  case config.sourceNames.LOCAL:
    getUrl = require('./localConnector');
    break;
  case config.sourceNames.SIGNED_S3:
    getUrl = require('./S3Connector');
    break;
  case config.sourceNames.PUBLIC_S3:
    getUrl = require('./publicS3Connector');
    break;
  case config.sourceNames.DUMMY:
    getUrl = require('./dummyConnector');
    break;
  case config.sourceNames.DCF:
    getUrl = require('./dcfConnector');
    break;
  default:
    throw `This shouldn't happen, invalid URL source: '${config.source}'`;
}

module.exports = getUrl;
