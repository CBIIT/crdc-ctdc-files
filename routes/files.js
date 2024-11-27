const express = require('express');
const router = express.Router();
const config = require('../config');
const getURL = require('../connectors');
const converter = require("json-2-csv");
const { randomUUID } = require("crypto");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/cloudfront-signer");
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
  // const obj = [
  //   {
  //     "id": 1,
  //     "name": "Alice",
  //     "age": 30,
  //     "email": "alice@example.com",
  //     "isActive": true
  //   },
  //   {
  //     "id": 2,
  //     "name": "Bob",
  //     "age": 24,
  //     "email": "bob@example.com",
  //     "isActive": false
  //   },
  //   {
  //     "id": 3,
  //     "name": "Charlie",
  //     "age": 28,
  //     "email": "charlie@example.com",
  //     "isActive": true
  //   },
  //   {
  //     "id": 4,
  //     "name": "David",
  //     "age": 35,
  //     "email": "david@example.com",
  //     "isActive": false
  //   }
  // ];

//   obj = `name,drs_uri,File ID,Md5sum,Participant ID,Biospecimen ID,Diagnosis,MedDRA Disease Code,Primary Site,Histology,Stage of Disease,Tumor Grade,Age,Sex,Gender,Race,Ethnicity,Carcinogen Exposure,Targeted Therapy,Parent Biospecimen ID,Anatomical Collection Site,Tissue Category,Collection Timepoint,User Comment
// MSB-00140-06-genomic-report-CTDCv1,drs://nci-crdc.datacommons.io/dg.4DFC/870175D4-EE9A-4A64-BF7A-6CDDB18C22BD,dg.4DFC/870175D4-EE9A-4A64-BF7A-6CDDB18C22BD,dd970cc07d55b06754594e8177826b93,MSB-00140,MSB-00140-06,Plasma Cell Myeloma,10028566,Bone Marrow,Plasma cell neoplasm,,,65.0,Female,,White,Not Hispanic or Latino,[No],"[Bortezomib, Lenalidomide]",MSB-00140-06,Iliac Crest,,Progression (Fresh)
// MSB-00140-06-somatic-mutations-CTDCv1,drs://nci-crdc.datacommons.io/dg.4DFC/CC00EEF6-1730-40B3-9FA6-3D8FCD39EB83,dg.4DFC/CC00EEF6-1730-40B3-9FA6-3D8FCD39EB83,e02f606a33fcd21a4358caa740b86457,MSB-00140,MSB-00140-06,Plasma Cell Myeloma,10028566,Bone Marrow,Plasma cell neoplasm,,,65.0,Female,,White,Not Hispanic or Latino,[No],"[Bortezomib, Lenalidomide]",MSB-00140-06,Iliac Crest,,Progression (Fresh)
// MSB-00241-01-somatic-mutations-CTDCv1,drs://nci-crdc.datacommons.io/dg.4DFC/7E4EE0AD-DFCC-4AEA-BA47-9C94E6A6E116,dg.4DFC/7E4EE0AD-DFCC-4AEA-BA47-9C94E6A6E116,632e9c93ebd618758b135c685f2288e8,MSB-00241,MSB-00241-01,Colorectal Carcinoma,10010029,Sigmoid Colon,no path consistent with colon,,,59.0,Female,,White,Not Hispanic or Latino,[Unknown],[],MSB-00241-01,Liver,Metastatic,Baseline (Fresh)
// MSB-00263-04-genomic-report-CTDCv1,drs://nci-crdc.datacommons.io/dg.4DFC/91CA34F9-A087-4733-8B77-562EFE566B2B,dg.4DFC/91CA34F9-A087-4733-8B77-562EFE566B2B,b8dc76622bdbba9a816746bb79d0bb5c,MSB-00263,MSB-00263-04,Melanoma,10053571,Skin,Malignant Melanoma,,Grade cannot be assessed,56.0,Male,Male,White,Not Hispanic or Latino,[Unknown],[],MSB-00263-04,Skin,Primary,Baseline (Fresh)
// MSB-00263-04-somatic-mutations-CTDCv1,drs://nci-crdc.datacommons.io/dg.4DFC/640C5DFC-B8A1-44AD-B950-467ABC123F45,dg.4DFC/640C5DFC-B8A1-44AD-B950-467ABC123F45,8cc2897159abd58130926e5aab1e0590,MSB-00263,MSB-00263-04,Melanoma,10053571,Skin,Malignant Melanoma,,Grade cannot be assessed,56.0,Male,Male,White,Not Hispanic or Latino,[Unknown],[],MSB-00263-04,Skin,Primary,Baseline (Fresh)
// MSB-00268-02-genomic-report-CTDCv1,drs://nci-crdc.datacommons.io/dg.4DFC/C1DFF7A7-D29D-4025-8B35-DF6F78712826,dg.4DFC/C1DFF7A7-D29D-4025-8B35-DF6F78712826,338f9fb55a18a2fdfc9b49977c62b27e,MSB-00268,MSB-00268-02,Plasma Cell Myeloma,10028566,BLOOD,Multiple Myeloma,,,56.0,Female,Female,Black or African American,Not Hispanic or Latino,[No],[],MSB-00268-02,Bone Marrow,,Baseline (Fresh)
// MSB-00268-02-somatic-mutations-CTDCv1,drs://nci-crdc.datacommons.io/dg.4DFC/C5C04D36-27E4-438C-B195-5A4F635C5BBF,dg.4DFC/C5C04D36-27E4-438C-B195-5A4F635C5BBF,f5741cf95e707ebde2a9566a54ee9e9e,MSB-00268,MSB-00268-02,Plasma Cell Myeloma,10028566,BLOOD,Multiple Myeloma,,,56.0,Female,Female,Black or African American,Not Hispanic or Latino,[No],[],MSB-00268-02,Bone Marrow,,Baseline (Fresh)
// MSB-00352-03-genomic-report-CTDCv1,drs://nci-crdc.datacommons.io/dg.4DFC/8D165BE2-FC3F-4D50-9B61-603419A3214C,dg.4DFC/8D165BE2-FC3F-4D50-9B61-603419A3214C,68266504279bf0a5934625f488d32c32,MSB-00352,MSB-00352-03,Colorectal Carcinoma,10010029,Rectosigmoid Colon,adenocarcinoma,Stage IIIB,Moderately Differentiated,58.0,Female,,White,Not Hispanic or Latino,[No],[Panitumumab],MSB-00352-03,Liver,Primary,Baseline (Fresh)
// MSB-00352-03-somatic-mutations-CTDCv1,drs://nci-crdc.datacommons.io/dg.4DFC/DC68EB76-D660-4CB1-ACC8-9B13A354CEF3,dg.4DFC/DC68EB76-D660-4CB1-ACC8-9B13A354CEF3,7624dc10eb18df55f816ee8dbc147088,MSB-00352,MSB-00352-03,Colorectal Carcinoma,10010029,Rectosigmoid Colon,adenocarcinoma,Stage IIIB,Moderately Differentiated,58.0,Female,,White,Not Hispanic or Latino,[No],[Panitumumab],MSB-00352-03,Liver,Primary,Baseline (Fresh)`

//   console.log(obj); 
  // const myJSON = JSON.stringify(obj);
  
  // let response = await uploadManifestToS3(req.params.manifest,obj);
  let response = await uploadManifestToS3(req.body);
  res.send({
    manifestSignedUrl: response
    });
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


    const manifestCsv = parameters.manifest
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
    await s3Client.send(uploadCommand);
 
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
