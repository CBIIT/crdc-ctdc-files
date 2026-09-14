jest.mock('../connectors', () => jest.fn(async (fileId) => ({
  status: 200,
  message: `default:${fileId}`,
})));

jest.mock('../connectors/connectorsFromSource.js', () => {
  const getURLFromSource = jest.fn(async (fileId, req, res, source) => ({
    status: 200,
    message: `source:${source}:${req.params.phs || 'N/A'}:${fileId}`,
  }));
  getURLFromSource.supportedSources = ['RAS', 'DCF'];
  return getURLFromSource;
});

jest.mock('../utils/session-user-info', () => ({
  getSessionIdFromCookie: jest.fn(() => 'test-session-id'),
  getUserInfoFromDatabase: jest.fn(async () => ({})),
}));

jest.mock('../logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  logNihCadrFields: jest.fn(),
}));

const getURL = require('../connectors');
const getURLFromSource = require('../connectors/connectorsFromSource.js');
const filesRouter = require('../routes/files');

describe('files route matching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function dispatch(path) {
    return new Promise((resolve, reject) => {
      const req = {
        method: 'GET',
        url: path,
        originalUrl: `/api/files${path}`,
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
      };
      const res = {
        statusCode: 200,
        getHeader: jest.fn(),
        setHeader: jest.fn(),
        status(code) {
          this.statusCode = code;
          return this;
        },
        send(body) {
          resolve({ status: this.statusCode, body });
        },
        json(body) {
          resolve({ status: this.statusCode, body });
        },
        end(body) {
          resolve({ status: this.statusCode, body });
        },
      };

      filesRouter.handle(req, res, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ status: 404, body: 'not found' });
      });
    });
  }

  it('routes a default GUID path to the default connector', async () => {
    await expect(dispatch('/dg.4DFC/file-uuid')).resolves.toMatchObject({
      status: 200,
      body: 'default:dg.4DFC/file-uuid',
    });

    expect(getURL).toHaveBeenCalledWith('dg.4DFC/file-uuid', expect.any(Object), expect.any(Object));
    expect(getURLFromSource).not.toHaveBeenCalled();
  });

  it('routes a source bare UUID path to the source connector', async () => {
    await expect(dispatch('/ras/file-uuid')).resolves.toMatchObject({
      status: 200,
      body: 'source:ras:N/A:file-uuid',
    });

    expect(getURLFromSource).toHaveBeenCalledWith('file-uuid', expect.any(Object), expect.any(Object), 'ras');
    expect(getURL).not.toHaveBeenCalled();
  });

  it('routes a source and study bare UUID path without treating the study as a GUID prefix', async () => {
    await expect(dispatch('/ras/phs000000/file-uuid')).resolves.toMatchObject({
      status: 200,
      body: 'source:ras:phs000000:file-uuid',
    });

    expect(getURLFromSource).toHaveBeenCalledWith('file-uuid', expect.any(Object), expect.any(Object), 'ras');
    expect(getURL).not.toHaveBeenCalled();
  });

  it('routes a source and study GUID path to the source connector', async () => {
    await expect(dispatch('/ras/phs000000/dg.4DFC/file-uuid')).resolves.toMatchObject({
      status: 200,
      body: 'source:ras:phs000000:dg.4DFC/file-uuid',
    });

    expect(getURLFromSource).toHaveBeenCalledWith('dg.4DFC/file-uuid', expect.any(Object), expect.any(Object), 'ras');
    expect(getURL).not.toHaveBeenCalled();
  });

  it('routes a source GUID path without study to the source connector', async () => {
    await expect(dispatch('/ras/dg.4DFC/file-uuid')).resolves.toMatchObject({
      status: 200,
      body: 'source:ras:N/A:dg.4DFC/file-uuid',
    });

    expect(getURLFromSource).toHaveBeenCalledWith('dg.4DFC/file-uuid', expect.any(Object), expect.any(Object), 'ras');
    expect(getURL).not.toHaveBeenCalled();
  });
});
