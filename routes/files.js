const express = require('express');
const router = express.Router();
const config = require('../config');
const getURL = require('../connectors');
const converter = require("json-2-csv");
const { randomUUID } = require("crypto");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { errorName } = require("../constants/error-constants");
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
  const obj = [
    {
      "id": 1,
      "name": "Alice",
      "age": 30,
      "email": "alice@example.com",
      "isActive": true
    },
    {
      "id": 2,
      "name": "Bob",
      "age": 24,
      "email": "bob@example.com",
      "isActive": false
    },
    {
      "id": 3,
      "name": "Charlie",
      "age": 28,
      "email": "charlie@example.com",
      "isActive": true
    },
    {
      "id": 4,
      "name": "David",
      "age": 35,
      "email": "david@example.com",
      "isActive": false
    }
  ];
  const myJSON = JSON.stringify(obj);
  await uploadManifestToS3(req.params.manifest,myJSON);
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

async function uploadManifestToS3(parameters,obj) {
  try {
    const s3Client = new S3Client({
      region: config.AWS_REGION,
      credentials: {
        accessKeyId: config.S3_ACCESS_KEY_ID,
        secretAccessKey: config.S3_SECRET_ACCESS_KEY,
      },
    });
    
    const parsedManifest = JSON.parse(obj);
    if (!parsedManifest || !Array.isArray(parsedManifest)) {
      throw new Error(errorName.MALFORMED_FILE_MANIFEST);
    }
    

    const manifestCsv = await converter.json2csv(parsedManifest);
    const tempCsvFile = `${randomUUID()}.csv`;
    const tempCsvFilePath = path.join(os.tmpdir(), tempCsvFile);
    await fs.writeFile(tempCsvFilePath, manifestCsv, {
      encoding: "utf-8",
    });

    const uploadParams = {
      Bucket: config.FILE_MANIFEST_BUCKET_NAME,
      Key: tempCsvFile,
      Body: await fs.readFile(tempCsvFilePath, { encoding: "utf-8" }),
    };
    const uploadCommand = new PutObjectCommand(uploadParams);
    console.log(uploadCommand); 
    await s3Client.send(uploadCommand);

    return getSignedUrl({
      keyPairId: config.CLOUDFRONT_KEY_PAIR_ID,
      privateKey: config.CLOUDFRONT_PRIVATE_KEY,
      url: `${config.CLOUDFRONT_DOMAIN}/${tempCsvFile}`,
      dateLessThan: new Date(
        Date.now() + 1000 * config.SIGNED_URL_EXPIRY_SECONDS
      ),
    });
    return console.log(uploadCommand); 
  } catch (error) {
    console.error(error);
    return error;
  }
}



module.exports = router;
