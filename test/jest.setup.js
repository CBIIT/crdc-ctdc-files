// Provide minimal env vars required by config.js for tests
process.env.DCF_FILE_URL = process.env.DCF_FILE_URL || 'https://example.org/user/data/download/';
process.env.DCF_FILE_URL_RAS = process.env.DCF_FILE_URL_RAS || 'https://example.org/ga4gh/drs/v1/objects/';
process.env.RAS_PASSPORT_VALIDATION_URL = process.env.RAS_PASSPORT_VALIDATION_URL || 'https://stsstg.nih.gov/passport/validate';
