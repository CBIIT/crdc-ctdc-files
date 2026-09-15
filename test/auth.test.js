jest.mock('../model', () => ({
  getFileACL: jest.fn(),
}));

jest.mock('../logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
}));

const config = require('../config');
const {getFileACL} = require('../model');
const auth = require('../utils/auth');

describe('auth middleware file authorization', () => {
  const originalAuthEnabled = config.authEnabled;
  const originalAuthorizationEnabled = config.authorizationEnabled;

  beforeEach(() => {
    config.authEnabled = true;
    config.authorizationEnabled = true;
    getFileACL.mockResolvedValue("['Open']");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    config.authEnabled = originalAuthEnabled;
    config.authorizationEnabled = originalAuthorizationEnabled;
  });

  function createRequest(path) {
    return {
      path,
      originalUrl: path,
      headers: {
        cookie: 'connect.sid=s%3Atest-session.signature',
      },
      socket: {
        remoteAddress: '127.0.0.1',
      },
      sessionID: 'test-session',
      session: {
        userInfo: {
          acl: [],
          role: 'user',
          userStatus: 'active',
        },
      },
    };
  }

  function createResponse() {
    return {
      status: jest.fn(function status() {
        return this;
      }),
      send: jest.fn(),
    };
  }

  it('uses the canonical bare file ID for RAS study authorization', async () => {
    const req = createRequest('/api/files/ras/phs000000/file-uuid');
    const res = createResponse();
    const next = jest.fn();

    await auth([])(req, res, next);

    expect(getFileACL).toHaveBeenCalledWith('file-uuid', req.headers.cookie);
    expect(next).toHaveBeenCalled();
  });

  it('uses the canonical prefixed file ID for RAS study authorization', async () => {
    const req = createRequest('/api/files/ras/phs000000/dg.4DFC/file-uuid');
    const res = createResponse();
    const next = jest.fn();

    await auth([])(req, res, next);

    expect(getFileACL).toHaveBeenCalledWith('dg.4DFC/file-uuid', req.headers.cookie);
    expect(next).toHaveBeenCalled();
  });
});
