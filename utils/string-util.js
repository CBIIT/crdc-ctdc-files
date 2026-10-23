const logger = require('../logger');

const isCaseInsensitiveEqual = (source, target) => {
    if (!target || !source) return false;
    return source.toLowerCase() === target.toLowerCase();
}

const strToArr = (str) => {
    try {
        let arr = str.replace(/'/g, '"');
        arr = JSON.parse(arr);
        return Array.isArray(arr) ? arr : [];
    } catch (e) {
        logger.error({ event_type: 'invalid_string_array' });
    }
    return [];
}

module.exports = {
    strToArr,
    isCaseInsensitiveEqual
}