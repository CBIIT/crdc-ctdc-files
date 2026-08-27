const mockPool = {
  query: jest.fn(),
};

jest.mock('mysql2', () => ({
  createPool: jest.fn(() => mockPool),
}));

const {
  getSessionIdFromCookie,
  getUserInfoFromDatabase,
} = require('../utils/session-user-info');

describe('session user info utilities', () => {
  beforeEach(() => {
    mockPool.query.mockReset();
  });

  test('extracts the session ID from the connect.sid cookie', () => {
    const req = {
      headers: {
        cookie: 'other=value; connect.sid=s:session-123.signature',
      },
    };

    expect(getSessionIdFromCookie(req)).toBe('session-123');
  });

  test('extracts the session ID from an encoded connect.sid cookie', () => {
    const req = {
      headers: {
        cookie: 'connect.sid=s%3Asession-123.signature',
      },
    };

    expect(getSessionIdFromCookie(req)).toBe('session-123');
  });

  test('loads userInfo from the serialized session database row', async () => {
    const userInfo = {
      email: 'user@example.org',
      IDP: 'RAS',
      firstName: 'Test',
    };
    mockPool.query.mockImplementation((query, values, callback) => {
      callback(null, [{data: JSON.stringify({userInfo})}]);
    });

    const result = await getUserInfoFromDatabase({
      headers: {cookie: 'connect.sid=s:session-123.signature'},
    });

    expect(result).toEqual(userInfo);
    expect(mockPool.query).toHaveBeenCalledWith(
      'SELECT data FROM ctdc.sessions WHERE session_id = ?',
      ['session-123'],
      expect.any(Function)
    );
  });

  test('returns an empty object when no session cookie is provided', async () => {
    const result = await getUserInfoFromDatabase({headers: {}});

    expect(result).toEqual({});
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  test('returns an empty object when the session row is unavailable', async () => {
    mockPool.query.mockImplementation((query, values, callback) => {
      callback(null, []);
    });

    const result = await getUserInfoFromDatabase({
      headers: {cookie: 'connect.sid=s:session-123.signature'},
    });

    expect(result).toEqual({});
  });
});
