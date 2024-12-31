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
  console.log('returning Signed URL')
  try {
    // Check if the necessary data is in the request body
    if (!req.body || !req.body.manifest) {
      console.log('Missing manifest data in the request body.')
      return res.status(400).send({
        error: 'Bad Request',
        message: 'Missing manifest data in the request body.'
      });
    }
   
    let response = await uploadManifestToS3(req.body);
    
    res.send({
      manifestSignedUrl: response
    });
  } catch (error) {
    console.error(error);
    if (error instanceof SomeSpecificError) {
      console.log('Invalid manifest data format.')
      return res.status(400).send({
        error: 'Bad Request',
        message: 'Invalid manifest data format.'
      });
    } else if (error instanceof AuthenticationError) {
      console.log('Authentication failed, please check your credentials.')
      return res.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication failed, please check your credentials.'
      });
    } else {
      console.log('An unknown error occurred while processing the request.')
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
    
    //convert body into a CSV file
    const manifestCsv = parameters.manifest
    const tempCsvFile = `${randomUUID()}.csv`;
    const tempCsvFilePath = path.join(os.tmpdir(), tempCsvFile);
    try {
    await fs.writeFile(tempCsvFilePath, manifestCsv, {
      encoding: "utf-8",
    });
    } catch (e){
      
      try{
        const manifestCsvTry = JSON.stringify(parameters.manifest)
        console.log(parameters.manifest)
        console.log('Attempting to Stringify data')
        await fs.writeFile(tempCsvFilePath, manifestCsvTry, {
          encoding: "utf-8",
        });}
      catch (e){
        console.log('Failed to Write to file , Malformed data ')
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
    console.log('Sending upload to S3Client')
    try {
    await s3Client.send(uploadCommand);
    }
    catch{
      return getSignedUrl({
        url: `S3 failed connect `,
        dateLessThan: new Date(
          Date.now() + 1000 * config.SIGNED_URL_EXPIRY_SECONDS
        ),
    });

    }
    //Return signed URL for CSV
    console.log('returning Signed URL')
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
    return getSignedUrl({
      url: 'code exits uploadManifestToS3' + error,
      dateLessThan: new Date(
        Date.now() + 1000 * config.SIGNED_URL_EXPIRY_SECONDS
      ),
  });
  }
}



module.exports = router;
