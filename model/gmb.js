const logger = require('../logger');

module.exports = {
    query: `query file($file_id: String){  
        fILE (UUID: $file_id)
        {
            FILE_LOCATION
        }
    }`,
    getLocation: data => {
        if (data && data.fILE && data.fILE.length > 0) {
            return data.fILE[0].FILE_LOCATION;
        } else {
            logger.error({ event_type: 'gmb_file_not_found' });
            return null;
        }
    }
};
