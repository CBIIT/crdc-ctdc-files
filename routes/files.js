const express = require('express');
const router = express.Router();
const config = require('../config');
const getURL = require('../connectors');
const getURLFromSource = require('../connectors/connectorsFromSource.js');
const logger = require('../logger');
const {getSessionIdFromCookie, getUserInfoFromDatabase} = require('../utils/session-user-info');
const {
  getCanonicalFileIdFromRouteParams,
  isGuidPrefix,
  isSupportedSource,
} = require('../utils/file-route');


//const {storeDownloadEvent} = require("../neo4j/neo4j-operations");

function getSignedUrlPayload(message) {
  if (typeof message === 'string' && /^https?:\/\//i.test(message.trim())) {
    return { url: message.trim() };
  }

  if (message && typeof message === 'object') {
    const url = message.url || message.presigned_url || message.fileURL;
    if (typeof url === 'string' && /^https?:\/\//i.test(url.trim())) {
      return { url: url.trim() };
    }
  }

  return null;
}

function normalizeConnectorResponse(response) {
  if (response && typeof response === 'object' && ('status' in response || 'message' in response)) {
    return {
      status: typeof response.status === 'number' ? response.status : 200,
      message: response.message,
    };
  }

  return {
    status: 200,
    message: response,
  };
}

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

/* Endpoint to accept source + study + GUID with the following format: /ras/phs000000/dg.4DFC/uuid */
router.get('/:idp/:phs/:prefix/:fileId', async function(req, res, next) {
  if (!isSupportedSource(req.params.idp) || !isGuidPrefix(req.params.prefix)) {
    return next('route');
  }

  logger.info({
    event_type: 'files_request',
    method: req.method,
    path: req.originalUrl || req.url,
    idp: req.params.idp,
    phs: req.params.phs,
    prefix: req.params.prefix,
    file_id: req.params.fileId,
  });
  const fileId = getCanonicalFileIdFromRouteParams(req.params);
  await getFile(fileId, req, res, next);
});

/* Endpoint to accept source + GUID with the following format: /ras/dg.4DFC/uuid */
router.get('/:idp/:prefix/:fileId', async function(req, res, next) {
  if (!isSupportedSource(req.params.idp) || !isGuidPrefix(req.params.prefix)) {
    return next('route');
  }

  logger.info({
    event_type: 'files_request',
    method: req.method,
    path: req.originalUrl || req.url,
    idp: req.params.idp,
    prefix: req.params.prefix,
    file_id: req.params.fileId,
  });
  const fileId = getCanonicalFileIdFromRouteParams(req.params);
  await getFile(fileId, req, res, next);
});

/* GET file's location based on source + study + bare fileId. /ras/phs000000/uuid */
router.get('/:idp/:phs/:fileId', async function(req, res, next) {
  if (!isSupportedSource(req.params.idp)) {
    return next('route');
  }

  logger.info({
    event_type: 'files_request',
    method: req.method,
    path: req.originalUrl || req.url,
    idp: req.params.idp,
    phs: req.params.phs,
    file_id: req.params.fileId,
  });
  await getFile(req.params.fileId, req, res, next);
});

/* Endpoint to accept GUID with the following format: /dg.4DFC/uuid */
router.get('/:prefix/:fileId', async function(req, res, next) {
  if (!isGuidPrefix(req.params.prefix)) {
    return next('route');
  }

  logger.info({
    event_type: 'files_request',
    method: req.method,
    path: req.originalUrl || req.url,
    prefix: req.params.prefix,
    file_id: req.params.fileId,
  });
  const fileId = getCanonicalFileIdFromRouteParams(req.params);
  await getFile(fileId, req, res, next);
});

/* GET file's location based on source + bare fileId. /ras/uuid */
router.get('/:idp/:fileId', async function(req, res, next) {
  if (!isSupportedSource(req.params.idp)) {
    return next('route');
  }

  logger.info({
    event_type: 'files_request',
    method: req.method,
    path: req.originalUrl || req.url,
    idp: req.params.idp,
    file_id: req.params.fileId,
  });
  await getFile(req.params.fileId, req, res, next);
});

/* GET file's location based on bare fileId. /uuid */
router.get('/:fileId', async function(req, res, next) {
  logger.info({
    event_type: 'files_request',
    method: req.method,
    path: req.originalUrl || req.url,
    file_id: req.params.fileId,
  });
  await getFile(req.params.fileId, req, res, next);
});


async function getFile(fileId, req, res, next) {
  const userInfo = await getUserInfoFromDatabase(req);
  const session_id = getSessionIdFromCookie(req);
  const idp= req.params.idp;
  const phs = req.params.phs ? req.params.phs : 'N/A';

  logger.info({
    event_type: 'file_lookup_start',
    file_id: fileId,
    idp,
    phs,
    session_id,
    path: req.originalUrl || req.url,
    method: req.method,
  });

  const startTime = Date.now();
  try {
    const connectorResponse = idp
      ? await getURLFromSource(fileId, req, res, idp)
      : await getURL(fileId, req, res);
    const response = normalizeConnectorResponse(connectorResponse);
    const duration = Date.now() - startTime;

    logger.info({
      event_type: 'file_lookup_success',
      file_id: fileId,
      source: idp,
      status: response?.status,
      duration_ms: duration,
      path: req.originalUrl || req.url,
    });

    logger.logNihCadrFields('file_download', {
      req,
      userInfo,
      idp: userInfo.IDP || idp,
      statusCode: response.status,
      associated_study: phs,
      duration,
      data_accessed: fileId,
      session_id,
      access_token: userInfo?.userInfo?.tokens?.access_token || '',
    });

    const signedUrlPayload = response.status === 200
      ? getSignedUrlPayload(response.message)
      : null;
    if (signedUrlPayload) {
      return res.status(response.status).json(signedUrlPayload);
    }

    return res.status(response.status).send(response.message);
  } catch (e) {
    const duration = Date.now() - startTime;
    const status = e.statusCode || 400;

    logger.error({
      event_type: 'download_error',
      file_id: fileId,
      url: req.originalUrl,
      src_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      session_id,
      user_id: userInfo.userID || userInfo.sub,
      user_email: userInfo.email,
      duration,
      message: e.message || String(e),
    });

    logger.logNihCadrFields('file_download', {
      req,
      userInfo,
      idp: userInfo.IDP || idp,
      statusCode: status,
      associated_study: phs,
      duration: duration,
      data_accessed: fileId,
      session_id,
      access_token: userInfo?.userInfo?.tokens?.access_token || '',
    });
    const message = e.message || `Error retrieving data for ${fileId}`;
    res.status(status).send(message);
  }
}





module.exports = router;
