const logger = require('../logger');
const { extractRequestContext, getTxnFromAccessToken, logNihCadrFields } = logger;

describe('extractRequestContext', () => {
    test('uses the request hostname as the destination host', () => {
        expect(extractRequestContext({
            hostname: 'files.example.org',
            protocol: 'https',
            originalUrl: '/api/files/ras/file-id',
            headers: { host: 'files.example.org' },
            socket: { localPort: 4000 },
        })).toMatchObject({
            dest_ip: 'files.example.org',
            url: 'https://files.example.org/api/files/ras/file-id',
        });
    });
});

describe('getTxnFromAccessToken', () => {
    test('extracts txn from a JWT payload', () => {
        const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
        const payload = Buffer.from(JSON.stringify({ txn: 'transaction-123' })).toString('base64url');
        const token = `${header}.${payload}.signature`;

        expect(getTxnFromAccessToken(token)).toEqual({
            txn: 'transaction-123',
            status: 'decoded',
        });
    });

    test('returns invalid for a non-JWT value', () => {
        expect(getTxnFromAccessToken('not-a-jwt')).toEqual({ txn: 'N/A', status: 'invalid' });
    });
});

describe('logNihCadrFields', () => {
    test('does not log an audit event for a non-RAS identity provider', () => {
        const logSpy = jest.spyOn(logger, 'log');

        logNihCadrFields('file_download', { idp: 'DCF' });

        expect(logSpy).not.toHaveBeenCalled();
        logSpy.mockRestore();
    });
});