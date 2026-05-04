const config = require("../config");
const { getSignedUrl } = require("@aws-sdk/cloudfront-signer");

const DEFAULT_EXPIRATION_SECONDS = 60 * 60 * 24; // 24 hours

const { getFileLocation } = require("../model");

function getExpiration() {
  const expiresInSeconds =
    config.urlExpiresInSeconds || DEFAULT_EXPIRATION_SECONDS;
  return Math.floor(new Date().getTime() / 1000) + expiresInSeconds; //Current Time in UTC + expiresInSeconds
}

function transformToCloudFrontUrl(file_location) {
  if (!file_location || file_location.length === 0) {
    console.error("File location retrieved from database is empty!");
  }

  const url = new URL(file_location);
  const newUrl = new URL(url.pathname, config.cfUrl);
  return newUrl.toString();
}

async function getSignedURL(file_location) {
  if (config.fake) {
    return file_location;
  }
  const signedUrl = getSignedUrl({
    url: transformToCloudFrontUrl(file_location),
    keyPairId: config.cfKeyPairId,
    privateKey: config.cfPrivateKey,
    dateLessThan: new Date(getExpiration() * 1000).toISOString(),
  });
  return signedUrl;
}

module.exports = async function (file_id, cookie) {
  const location = await getFileLocation(file_id, cookie);
  return await getSignedURL(location);
};
