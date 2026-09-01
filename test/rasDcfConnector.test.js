// Ensure required env vars exist before loading config
process.env.DCF_FILE_URL = process.env.DCF_FILE_URL || 'https://example.org/user/data/download/';
process.env.DCF_FILE_URL_RAS = process.env.DCF_FILE_URL_RAS || 'https://example.org/ga4gh/drs/v1/objects/';
process.env.RAS_PASSPORT_VALIDATION_URL = process.env.RAS_PASSPORT_VALIDATION_URL || 'https://stsstg.nih.gov/passport/validate';

const nodeFetch = require('node-fetch');
jest.mock('node-fetch');
const path = require('path');

describe('rasDcfConnector internals', () => {
  beforeEach(() => {
    nodeFetch.mockReset();
  });

  test('validatePassport returns true on "Valid" text', async () => {
    const config = require('../config');
    config.res_passport_validation_url = process.env.RAS_PASSPORT_VALIDATION_URL;

    // mock node-fetch to return plain text 'Valid'
    nodeFetch.mockImplementation(async (url, opts) => {
      return {
        ok: true,
        status: 200,
        text: async () => 'Valid'
      };
    });

    const connector = require('../connectors/rasDcfConnector');
    const result = await connector._internals.isValidatePassport('visa-token');
    expect(result).toBe(true);
  });

  test('validatePassport returns false on non-Valid text', async () => {
    const config = require('../config');
    config.res_passport_validation_url = process.env.RAS_PASSPORT_VALIDATION_URL;

    nodeFetch.mockImplementation(async (url, opts) => {
      return {
        ok: true,
        status: 200,
        text: async () => 'Invalid'
      };
    });

    const connector = require('../connectors/rasDcfConnector');
    const result = await connector._internals.isValidatePassport('visa-token');
    expect(result).toBe(false);
  });

  test('fetchDCFFile returns signed url when access returns url', async () => {
    const config = require('../config');
    config.DCF_FILE_URL_RAS = 'https://example.org/ga4gh/drs/v1/objects';

    // Mock POST to access/s3 to return { url }
    nodeFetch.mockImplementation(async (url, opts) => {
      if (url.endsWith('/access/s3')) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ url: 'https://signed-url.example/file' })
        };
      }
      // default
      return { ok: false, status: 404, text: async () => '' };
    });

    const connector = require('../connectors/rasDcfConnector');
    const res = await connector._internals.fetchDCFFile('GUID123', 'passport-token');
    expect(res.status).toBe(200);
    expect(res.message).toBe('https://signed-url.example/file');
  });

  test('getPassportFromDatabase reads passport from session rows', async () => {
    const connector = require('../connectors/rasDcfConnector');

    // fake req with cookie (format similar to express-session: 's:...signature')
    const fakeReq = { headers: { cookie: 'connect.sid=s:ABCD12345.signature;' } };

    // fake pool and connection
    const fakeConnection = {
      query: (sql, values, cb) => {
        const row = { data: JSON.stringify({ userInfo: { passport_jwt_v11: 'the-passport' } }) };
        cb(null, [row]);
      },
      release: () => {}
    };
    const fakePool = {
      getConnection: (cb) => cb(null, fakeConnection)
    };

    const passport = await connector._internals.getPassportFromDatabase(fakeReq, fakePool);
    expect(passport).toBe('the-passport');
  });
});
