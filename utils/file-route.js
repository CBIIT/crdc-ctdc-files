// Shared File service route parsing helpers.
// Keep auth ACL lookup and download connector lookup aligned on the same
// canonical file ID.

const getURLFromSource = require('../connectors/connectorsFromSource.js');

const GUID_PREFIXES = new Set(['dg.4dfc']);

/**
 * Checks whether a path segment is a known GUID prefix.
 * Example: isGuidPrefix('dg.4DFC') returns true; isGuidPrefix('phs000000') returns false.
 */
function isGuidPrefix(prefix) {
  return GUID_PREFIXES.has(String(prefix || '').trim().toLowerCase());
}

/**
 * Checks whether a path segment is a supported File service source.
 * Example: isSupportedSource('ras') returns true; isSupportedSource('dg.4DFC') returns false.
 */
function isSupportedSource(source) {
  const sourceName = String(source || '').trim().toUpperCase();
  return Array.isArray(getURLFromSource.supportedSources)
    && getURLFromSource.supportedSources.includes(sourceName);
}

/**
 * Rebuilds a prefixed file ID before sending it to a connector.
 * Example: buildPrefixedFileId('dg.4DFC', 'file-uuid') returns 'dg.4DFC/file-uuid'.
 */
function buildPrefixedFileId(prefix, fileId) {
  return `${prefix}/${fileId}`;
}

/**
 * Converts a File service request path into path segments.
 * Example: '/api/files/ras/phs000000/dg.4DFC/file-uuid?x=1'
 * returns ['ras', 'phs000000', 'dg.4DFC', 'file-uuid'].
 */
function getFilesPathSegments(path) {
  return String(path || '')
    .split('?')[0]
    .replace(/^\/api\/files\/?/i, '')
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean);
}

/**
 * Resolves File service path parts to the canonical file ID.
 * Example: ['ras', 'phs000000', 'file-uuid'] returns 'file-uuid'.
 * Example: ['ras', 'phs000000', 'dg.4DFC', 'file-uuid'] returns 'dg.4DFC/file-uuid'.
 */
function getCanonicalFileIdFromPathParts(pathParts) {
  const parts = (pathParts || []).filter(Boolean);

  if (parts.length === 0) {
    return '';
  }

  const [first, second, third] = parts;

  if (isSupportedSource(first)) {
    if (parts.length >= 4 && isGuidPrefix(third)) {
      return buildPrefixedFileId(third, parts.slice(3).join('/'));
    }

    if (parts.length >= 3 && isGuidPrefix(second)) {
      return buildPrefixedFileId(second, parts.slice(2).join('/'));
    }

    if (parts.length >= 3) {
      return parts.slice(2).join('/');
    }

    return parts.slice(1).join('/');
  }

  if (parts.length >= 2 && isGuidPrefix(first)) {
    return buildPrefixedFileId(first, parts.slice(1).join('/'));
  }

  return parts.join('/');
}

/**
 * Resolves a File service request path to the canonical file ID.
 * Example: getCanonicalFileIdFromFilesPath('/api/files/ras/phs000000/file-uuid')
 * returns 'file-uuid'.
 */
function getCanonicalFileIdFromFilesPath(path) {
  return getCanonicalFileIdFromPathParts(getFilesPathSegments(path));
}

/**
 * Resolves Express route params to the canonical file ID.
 * Example: { prefix: 'dg.4DFC', fileId: 'file-uuid' } returns 'dg.4DFC/file-uuid'.
 * Example: { idp: 'ras', phs: 'phs000000', fileId: 'file-uuid' } returns 'file-uuid'.
 */
function getCanonicalFileIdFromRouteParams(params = {}) {
  if (isGuidPrefix(params.prefix)) {
    return buildPrefixedFileId(params.prefix, params.fileId);
  }

  return params.fileId || '';
}

module.exports = {
  buildPrefixedFileId,
  getCanonicalFileIdFromFilesPath,
  getCanonicalFileIdFromPathParts,
  getCanonicalFileIdFromRouteParams,
  isGuidPrefix,
  isSupportedSource,
};
