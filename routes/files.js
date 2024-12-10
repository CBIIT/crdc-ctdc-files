const express = require('express');
const router = express.Router();
const config = require('../config');
const getURL = require('../connectors');
const { randomUUID } = require("crypto");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/cloudfront-signer");
const fs = require("fs").promises;
const os = require("os");
const path = require("path");
const { errorName } = require("../constants/error-constants");

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

router.post('/get-manifest-file-signed-url', async function(req, res, next) {
  try {
    // Check if the necessary data is in the request body
    if (!req.body || !req.body.manifestData) {
      return res.status(400).send({
        error: 'Bad Request',
        message: 'Missing manifest data in the request body.'
      });
    }
    // obj = {
    //   "errors": [
    //     {
    //       "status": 400,
    //       "error": "Bad Request",
    //       "message": "Missing manifest data in the request body.",
    //       "details": {
    //         "field": "manifestData",
    //         "required": true
    //       }
    //     },
    //     {
    //       "status": 401,
    //       "error": "Unauthorized",
    //       "message": "Authentication failed, please check your credentials.",
    //       "details": {
    //         "reason": "Invalid API key or token"
    //       }
    //     },
    //     {
    //       "status": 403,
    //       "error": "Forbidden",
    //       "message": "You do not have permission to perform this action.",
    //       "details": {
    //         "reason": "User does not have sufficient access rights"
    //       }
    //     },
    //     {
    //       "status": 404,
    //       "error": "Not Found",
    //       "message": "The requested resource could not be found.",
    //       "details": {
    //         "resource": "manifest",
    //         "identifier": "manifestId123"
    //       }
    //     },
    //     {
    //       "status": 500,
    //       "error": "Internal Server Error",
    //       "message": "An unknown error occurred while processing the request.",
    //       "details": {
    //         "timestamp": "2024-12-09T12:34:56Z",
    //         "traceId": "abc123xyz"
    //       }
    //     }
    //   ]
    // }
    

    let response = await uploadManifestToS3(req.body);
    
    res.send({
      manifestSignedUrl: response
    });
  } catch (error) {
    console.error(error);
    if (error instanceof SomeSpecificError) {
      return res.status(400).send({
        error: 'Bad Request',
        message: 'Invalid manifest data format.'
      });
    } else if (error instanceof AuthenticationError) {
      return res.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication failed, please check your credentials.'
      });
    } else {
      return res.status(500).send({
        error: 'Internal Server Error',
        message: error.message || 'An unknown error occurred while processing the request.'
      });
    }
  }
});


async function getFile(fileId, req, res, next) {
  console.log(fileId)
  try {
    const cookie = req.headers.cookie;
    console.log("Get Cookie ");
    let response = await getURL(fileId, req, res);
    //await storeDownloadEvent(req.session?.userInfo, fileId);
     res.status(response.status).send(response.message);
  } catch (e) {
    console.error(e);
    let status = 400;
    if (e.statusCode) {
      status = e.statusCode;
    }
    let message = `Error retrieving data for ${fileId}`
    if (e.message) {
      message = e.message;
    }
    res.status(status).send(message);
  }
};

async function uploadManifestToS3(parameters) {
  try {
    const s3Client = new S3Client({
      region: config.AWS_REGION,
      credentials: {
        accessKeyId: config.S3_ACCESS_KEY_ID,
        secretAccessKey: config.S3_SECRET_ACCESS_KEY,
      },
    });

    obj = JSON.stringify(parameters.manifest)
    try {
      JSON.parse(obj);
      } 
    catch (e){
        try{
          obj = JSON.stringify(parameters.manifest)
          JSON.parse(obj)
          }
        catch (e){
            return getSignedUrl({
              url: `Failed to Parse , Malformed data `,
              dateLessThan: new Date(
                Date.now() + 1000 * config.SIGNED_URL_EXPIRY_SECONDS
              ),
          });
        }
    }
    
    //convert body into a CSV file
    const manifestCsv = parameters.manifest
    const tempCsvFile = `${randomUUID()}.csv`;
    const tempCsvFilePath = path.join(os.tmpdir(), tempCsvFile);
    //TODO add try catch here for argerror
    try {
    await fs.writeFile(tempCsvFilePath, manifestCsv, {
      encoding: "utf-8",
    });
    } catch (e){
      
      try{
        const manifestCsvTry = JSON.stringify(parameters.manifest)
        await fs.writeFile(tempCsvFilePath, manifestCsvTry, {
          encoding: "utf-8",
        });}
      catch (e){
          return getSignedUrl({
            url: `Failed to Write to file , Malformed data `,
            dateLessThan: new Date(
              Date.now() + 1000 * config.SIGNED_URL_EXPIRY_SECONDS
            ),
        });
      }
    
    }
    

    const uploadParams = {
      Bucket: config.FILE_MANIFEST_BUCKET_NAME,
      Key: tempCsvFile,
      Body: await fs.readFile(tempCsvFilePath, { encoding: "utf-8" }),
    };
    const uploadCommand = new PutObjectCommand(uploadParams);
    //upload CSV
    await s3Client.send(uploadCommand);
    //Return signed URL for CSV
    return getSignedUrl({
      keyPairId: config.CLOUDFRONT_KEY_PAIR_ID,
      privateKey: config.CLOUDFRONT_PRIVATE_KEY,
      url: `${config.CLOUDFRONT_DOMAIN}/${tempCsvFile}`,
      dateLessThan: new Date(
        Date.now() + 1000 * config.SIGNED_URL_EXPIRY_SECONDS
      ),
    });
  } catch (error) {
    console.error(error);
    return error;
  }
}



module.exports = router;
