const express = require('express');
const router = express.Router();
const config = require('../config');
const getURL = require('../connectors');
const logger = require('../logger');
const {DownloadEvent} = require('../bento-event-logging/model/download-event');


//const {storeDownloadEvent} = require("../neo4j/neo4j-operations");

/* GET ping-ping for health checking. */
router.get('/ping', function(req, res, next) {
  console.log(config);
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
  console.log(config);
  res.send(`done`);
});

/* Endpoint to accept GUID with the following format: /dg.4DFC/{rest_of_id} */
router.get('/:prefix/:fileId', async function(req, res, next) {
  await getFile(req.params.prefix+"/"+req.params.fileId, req, res, next);
});

/* GET file's location based on fileId. */
router.get('/:fileId', async function(req, res, next) {
  await getFile(req.params.fileId, req, res, next);
});




async function getFile(fileId, req, res, next) {
  console.log(fileId);
  const startTime = Date.now();
  try {
    const cookie = req.headers.cookie;
    console.log("Get Cookie ");
    let response = await getURL(fileId, req, res);

    const duration = Date.now() - startTime;
    const userInfo = (req.session && req.session.userInfo) || {};
    const userName = [userInfo.firstName, userInfo.lastName].filter(Boolean).join(' ') || undefined;
    const srcIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const downloadEvent = new DownloadEvent(
      userInfo.userID,
      userInfo.email,
      userInfo.IDP,
      undefined,   // fileFormat – not available without a metadata lookup
      fileId,
      undefined,   // fileName – not available at URL-resolution stage
      undefined,   // fileSize – not available at URL-resolution stage
      {
        user_name:             userName,
        session_id:            req.session && req.session.id,
        transaction_number:    userInfo.txn,
        src_ip:                srcIp,
        user_country_name:     userInfo.country,
        user_org:              userInfo.organization,
        eRA_commons_id:        userInfo.eRACommonsID,
        user_permission_group: userInfo.role,
        url:                   req.originalUrl,
        http_user_agent:       req.headers['user-agent'],
        status:                response.status,
        duration:              duration,
        data_repository:       config.cadr_name || config.project,
      }
    );
    logger.info(downloadEvent);

    //await storeDownloadEvent(req.session?.userInfo, fileId);
    res.status(response.status).send(response.message);
  } catch (e) {
    console.error(e);
    const duration = Date.now() - startTime;
    const userInfo = (req.session && req.session.userInfo) || {};
    logger.error({
      event_type:  'download_error',
      file_id:     fileId,
      url:         req.originalUrl,
      src_ip:      req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      session_id:  req.session && req.session.id,
      user_id:     userInfo.userID,
      user_email:  userInfo.email,
      duration:    duration,
      message:     e.message || String(e),
    });
    let status = 400;
    if (e.statusCode) {
      status = e.statusCode;
    }
    let message = `Error retrieving data for ${fileId}`;
    if (e.message) {
      message = e.message;
    }
    res.status(status).send(message);
  }
}





module.exports = router;
