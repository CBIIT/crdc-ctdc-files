const express = require('express');
const router = express.Router();
const config = require('../config');
const getURL = require('../connectors');
const getURLFromSource = require('../connectors/connectorsFromSource.js');
const logger = require('../logger');
const {getSessionIdFromCookie, getUserInfoFromDatabase} = require('../utils/session-user-info');
const {DownloadEvent} = require('../bento-event-logging/model/download-event');


//const {storeDownloadEvent} = require("../neo4j/neo4j-operations");

/* GET ping-ping for health checking. */
router.get('/ping', function(req, res, next) {
  res.send(`pong`);
});

/* GET version for health checking and version checking. */
router.get('/version', function(req, res, next) {
  res.json({
    version: config.version,
    date: config.date
  });
});

router.get('/config', function(req, res, next) {
  logger.info({
    event_type: 'files_config',
    path: req.originalUrl || req.url,
    method: req.method,
    config: {
      project: config.project,
      source: config.source,
      authEnabled: config.authEnabled,
      authorizationEnabled: config.authorizationEnabled,
    },
  });
  res.send(`done`);
});

/* Endpoint to accept GUID with the following format: /dg.4DFC/{rest_of_id} */
router.get('/:prefix/:fileId', async function(req, res, next) {
  const maybeSource = String(req.params.prefix || '').trim().toUpperCase();
  const isSourceRequest = Array.isArray(getURLFromSource.supportedSources)
    && getURLFromSource.supportedSources.includes(maybeSource);

  const source = isSourceRequest ? req.params.prefix : undefined;
  const fileId = isSourceRequest ? req.params.fileId : `${req.params.prefix}/${req.params.fileId}`;

  logger.info({
    event_type: 'files_request',
    method: req.method,
    path: req.originalUrl || req.url,
    source,
    prefix: req.params.prefix,
    file_id: req.params.fileId,
  });
  await getFile(fileId, req, res, next, source);
});

/* GET file's location based on fileId. */
router.get('/:fileId', async function(req, res, next) {
  logger.info({
    event_type: 'files_request',
    method: req.method,
    path: req.originalUrl || req.url,
    file_id: req.params.fileId,
  });
  await getFile(req.params.fileId, req, res, next);
});



/* Endpoint to accept GUID with the following format: /dg.4DFC/{rest_of_id} */
router.get('/:source/:prefix/:fileId', async function(req, res, next) {
  logger.info({
    event_type: 'files_request',
    method: req.method,
    path: req.originalUrl || req.url,
    source: req.params.source,
    prefix: req.params.prefix,
    file_id: req.params.fileId,
  });
  await getFile(req.params.prefix+"/"+req.params.fileId, req, res, next, req.params.source);
});

/* GET file's location based on fileId. */
router.get('/:source/:fileId', async function(req, res, next) {
  logger.info({
    event_type: 'files_request',
    method: req.method,
    path: req.originalUrl || req.url,
    source: req.params.source,
    file_id: req.params.fileId,
  });
  await getFile(req.params.fileId, req, res, next, req.params.source);
});


async function getFile(fileId, req, res, next, source) {

    
  const userInfo = await getUserInfoFromDatabase(req);
  logger.info({
    event_type: 'file_lookup_start',
    file_id: fileId,
    source,
    path: req.originalUrl || req.url,
    method: req.method,
  });

  
  const startTime = Date.now();
  try {
    const cookie = req.headers.cookie;
    let response = source
      ? await getURLFromSource(fileId, req, res, source)
      : await getURL(fileId, req, res);

    logger.info({
      event_type: 'file_lookup_success',
      file_id: fileId,
      source,
      status: response && response.status,
      duration_ms: Date.now() - startTime,
      path: req.originalUrl || req.url,
    });

    console.log(`File lookup successful for fileId: ${userInfo}`);

     logger.logNihCadrFields('Start Download', {
      req,
      userInfo: userInfo,
      idp: userInfo?.IDP,
      statusCode: response.status,
    });
    
    //await storeDownloadEvent(req.session?.userInfo, fileId);
    res.status(response.status).send(response.message);
  } catch (e) {
    const duration = Date.now() - startTime;
    let status = 400;
    if (e.statusCode) {
      status = e.statusCode;
    }
    logger.error({
      event_type:  'download_error',
      file_id:     fileId,
      url:         req.originalUrl,
      src_ip:      req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      session_id:  getSessionIdFromCookie(req),
      user_id:     userInfo.userID,
      user_email:  userInfo.email,
      duration:    duration,
      message:     e.message || String(e),
    });
    logger.logNihCadrFields('Download', {
      req,
      userInfo,
      idp: userInfo.IDP,
      statusCode: status,
    });
    let message = `Error retrieving data for ${fileId}`;
    if (e.message) {
      message = e.message;
    }
    res.status(status).send(message);
  }
}





module.exports = router;
