const {
  getCanonicalFileIdFromFilesPath,
  getCanonicalFileIdFromRouteParams,
} = require('../utils/file-route');

describe('file route helpers', () => {
  test.each([
    ['/api/files/file-uuid', 'file-uuid'],
    ['/api/files/dg.4DFC/file-uuid', 'dg.4DFC/file-uuid'],
    ['/api/files/ras/file-uuid', 'file-uuid'],
    ['/api/files/ras/phs000000/file-uuid', 'file-uuid'],
    ['/api/files/ras/dg.4DFC/file-uuid', 'dg.4DFC/file-uuid'],
    ['/api/files/ras/phs000000/dg.4DFC/file-uuid', 'dg.4DFC/file-uuid'],
  ])('returns canonical file ID for %s', (path, expectedFileId) => {
    expect(getCanonicalFileIdFromFilesPath(path)).toBe(expectedFileId);
  });

  it('returns prefixed file ID from route params when a GUID prefix is present', () => {
    expect(getCanonicalFileIdFromRouteParams({
      idp: 'ras',
      phs: 'phs000000',
      prefix: 'dg.4DFC',
      fileId: 'file-uuid',
    })).toBe('dg.4DFC/file-uuid');
  });

  it('returns bare file ID from route params when no GUID prefix is present', () => {
    expect(getCanonicalFileIdFromRouteParams({
      idp: 'ras',
      phs: 'phs000000',
      fileId: 'file-uuid',
    })).toBe('file-uuid');
  });
});
