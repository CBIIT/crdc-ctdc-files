const logger = require('../logger');

module.exports = async function (file_id) {
  logger.info({ event_type: 'dummy_file_request', file_id });
  return `http://www.africau.edu/images/default/sample.pdf`;
  // return `https://fake_domain.com/fake_path/${file_id}`;
}
