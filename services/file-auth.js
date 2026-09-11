const {isCaseInsensitiveEqual} = require("../utils/string-util");
const logger = require('../logger');

const getFileField = (data, callBack)=> {
    if (data && data.file && data.file.length > 0) {
        return callBack(data);
    } else {
        logger.error({ event_type: 'file_auth_file_not_found' });
        return null;
    }
}

/* File ACL Authentication */
// Return true or false
// compares user acl array with file acl array
// If a user has at least one acl value in a file acl array, it returns true
const OPEN = 'open';
function isAuthorizedAccess(userAclArr, fileAclArr) {
    if (!fileAclArr || !userAclArr) return false;
    const aclSet = new Set();
    for (let fileAcl of fileAclArr) {
        // if a file has “open” in ACL, any authenticated user can access this file
        if (isCaseInsensitiveEqual(fileAcl, OPEN)) return true;
        aclSet.add(fileAcl);
    }
    for (let acl of userAclArr) {
        if (aclSet.has(acl)) return true;
    }
    return false;
}

module.exports = {
    getFileField,
    isAuthorizedAccess
};