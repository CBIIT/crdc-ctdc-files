const config = require('../config');
const {isAuthorizedAccess} = require("../services/file-auth");
const {getFileACL} = require("../model");
const {strToArr} = require("./string-util");
const {isAdminUser, getApprovedUserAcls} = require("../services/user-auth");
const logger = require('../logger');

module.exports = function (exceptions) {
    return async function(req, res, next) {
        // Open if file authentication env variable disabled
        if (!config.authEnabled) return next();
        if (exceptions && exceptions.includes(req.path)) return next();

        const srcIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const sessionId = req.session && req.session.id;
        const userInfo = (req.session && req.session.userInfo) || null;

        try {
            if (req.session && req.session.userInfo) {
                // Pass if ACL authenticator not enabled
                if (!config.authorizationEnabled) return next();
                // Search file ACL from Bento-backend API
                const fileId = req.path.replace("/api/files/", "");
                const cookie = req.headers.cookie;
                const fileAcl = await getFileACL(fileId, cookie);
                const userAcl = getApprovedUserAcls(req.session.userInfo.acl);
                // Open all file access to Admin user
                if (isAdminUser(req.session.userInfo)) return next();
                // Inspect file accessibility
                if (isAuthorizedAccess(userAcl, strToArr(fileAcl))) return next();

                logger.warn({
                    event_type:         'authorization_failure',
                    status:             403,
                    url:                req.originalUrl,
                    src_ip:             srcIp,
                    session_id:         sessionId,
                    user_id:            userInfo && userInfo.userID,
                    user_email:         userInfo && userInfo.email,
                    user_id_provider:   userInfo && userInfo.IDP,
                    transaction_number: userInfo && userInfo.txn,
                    user_permission_group: userInfo && userInfo.role,
                    http_user_agent:    req.headers['user-agent'],
                    message:            'Access denied: user not authorized for requested file',
                });
                return res.status(403).send('Not authorized!');
            }

            logger.warn({
                event_type:      'authentication_failure',
                status:          401,
                url:             req.originalUrl,
                src_ip:          srcIp,
                session_id:      sessionId,
                http_user_agent: req.headers['user-agent'],
                message:         'Access denied: no authenticated session',
            });
            return res.status(401).send('Not authenticated!');
        } catch (e) {
            console.log(e);
            logger.error({
                event_type: 'auth_error',
                url:        req.originalUrl,
                src_ip:     srcIp,
                session_id: sessionId,
                message:    e.message || String(e),
            });
            return res.status(500).send(e);
        }
    }
}