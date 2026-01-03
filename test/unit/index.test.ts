/* eslint-disable max-len,max-lines */

import Validator from '@valkyriestudios/validator';
import {describe, it, beforeEach, afterEach, expect, vi} from 'vitest';
import DBMongo, {MongoOptions} from '../../lib';
import Query from '../../lib/Query';
import CONSTANTS from '../constants';
import MockFn from '../MockFn';
import MockClient from '../MockClient';
import {Db} from 'mongodb';
import {
    Protocols,
    ReadPreferences,
} from '../../lib/Types';
import MockDb from '../MockDb';
import MockCollection from '../MockCollection';

const FULL_VALID_OPTS:MongoOptions = {
    debug: true,
    pool_size: 5,
    host: '127.0.0.1:27017',
    user: 'root',
    pass: 'rootroot',
    db: 'main',
    auth_db: 'admin',
    replset: false,
    protocol: 'mongodb',
    read_preference: 'nearest',
    retry_reads: true,
    retry_writes: true,
    connect_timeout_ms: 10000,
    socket_timeout_ms: 0,
};

const FULL_VALID_CONNECT_EXPECTED_PAYLOAD = {
    opts: {
        compressors: ['zlib'],
        connectTimeoutMS: 10000,
        maxConnecting: 5,
        maxPoolSize: 5,
        minPoolSize: 1,
        readPreference: 'nearest',
        retryReads: true,
        retryWrites: true,
        socketTimeoutMS: 0,
        zlibCompressionLevel: 3,
    },
    uri: 'mongodb://root:rootroot@127.0.0.1:27017/admin',
};

const URI_WITHOUT_DB = 'mongodb://root:rootroot@127.0.0.1:27017/?retryWrites=false';

const FULL_VALID_URI_OPTS:MongoOptions = {
    debug: true,
    pool_size: 5,
    uri: 'mongodb://root:rootroot@127.0.0.1:27017/main?retryWrites=false',
    db: 'main',
    read_preference: 'nearest',
    retry_reads: false,
    connect_timeout_ms: 8000,
    socket_timeout_ms: 0,
};

const FULL_VALID_URI_CONNECT_EXPECTED_PAYLOAD = {
    opts: {
        compressors: ['zlib'],
        connectTimeoutMS: 8000,
        maxConnecting: 5,
        maxPoolSize: 5,
        minPoolSize: 1,
        readPreference: 'nearest',
        retryReads: false,
        retryWrites: false,
        socketTimeoutMS: 0,
        zlibCompressionLevel: 3,
    },
    uri: 'mongodb://root:rootroot@127.0.0.1:27017/main?retryWrites=false',
};

describe('Index', () => {
    const mockConsoleInfo = new MockFn();
    const mockConsoleError = new MockFn();

    beforeEach(() => {
        mockConsoleInfo.mock(console, 'info');
        mockConsoleError.mock(console, 'error');
        MockClient.mock();
    });

    afterEach(() => {
        mockConsoleInfo.restore();
        mockConsoleError.restore();
        MockClient.restore();
    });

    describe('ctor', () => {
        it('Should throw when not provided anything', () => {
            expect(
                /* @ts-ignore */
                () => new DBMongo()
            ).toThrowError(/Mongo@ctor: options should be an object/);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should throw when not passed an object or provided with an empty object', () => {
            for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                expect(
                    /* @ts-ignore */
                    () => new DBMongo(el)
                ).toThrowError(/Mongo@ctor: options should be an object/);
            }
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should not throw when provided with valid options', () => {
            expect(() => new DBMongo(FULL_VALID_OPTS)).not.toThrow();
            expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
            expect(MockClient.isEmpty).toBe(true);
        });

        describe('hostConnection', () => {
            describe('option: debug', () => {
                it('Should throw when passed as a non-boolean', () => {
                    for (const el of CONSTANTS.NOT_BOOLEAN) {
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_OPTS, ...{debug: el}})
                        ).toThrowError(/Mongo@ctor: options are invalid/);
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should not throw when not passed and not log by default', () => {
                    const opts:any = {...FULL_VALID_OPTS};
                    delete opts.debug;
                    expect(() => new DBMongo(opts)).not.toThrow();
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should not log if debug is passed as false', () => {
                    expect(() => new DBMongo({...FULL_VALID_OPTS, ...{debug: false}})).not.toThrow();
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should log if debug is enabled', () => {
                    expect(() => new DBMongo({...FULL_VALID_OPTS, ...{debug: true}})).not.toThrow();
                    expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                    expect(MockClient.isEmpty).toBe(true);
                });
            });

            describe('option: pool_size', () => {
                it('Should throw when passed as a non-integer', () => {
                    for (const el of CONSTANTS.NOT_INTEGER) {
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_OPTS, ...{pool_size: el}})
                        ).toThrowError(/Mongo@ctor: options are invalid/);
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should throw when passed as a number above 100', () => {
                    for (const el of [101, 1000, 99999]) {
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_OPTS, ...{pool_size: el}})
                        ).toThrowError(/Mongo@ctor: options are invalid/);
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should throw when passed as a number below 1', () => {
                    for (const el of [0, -1, -101, -1000, -99999]) {
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_OPTS, ...{pool_size: el}})
                        ).toThrowError(/Mongo@ctor: options are invalid/);
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should not throw when not passed', () => {
                    const opts:any = {...FULL_VALID_OPTS};
                    delete opts.pool_size;
                    expect(() => new DBMongo(opts)).not.toThrow();
                    expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                    expect(MockClient.isEmpty).toBe(true);
                });
            });

            describe('option: host', () => {
                it('Should throw when passed as a non-string or empty string', () => {
                    for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_OPTS, ...{host: el}})
                        ).toThrowError(/Mongo@ctor: options are invalid/);
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should not throw when not passed', () => {
                    const opts:any = {...FULL_VALID_OPTS};
                    delete opts.host;
                    expect(() => new DBMongo(opts)).not.toThrow();
                    expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                    expect(MockClient.isEmpty).toBe(true);
                });
            });

            describe('option: user', () => {
                it('Should throw when passed as a non-string or empty string', () => {
                    for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_OPTS, ...{user: el}})
                        ).toThrowError(/Mongo@ctor: options are invalid/);
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should throw when not passed', () => {
                    const opts:any = {...FULL_VALID_OPTS};
                    delete opts.user;
                    expect(
                        () => new DBMongo(opts)
                    ).toThrowError(/Mongo@ctor: options are invalid/);
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });
            });

            describe('option: pass', () => {
                it('Should throw when passed as a non-string or empty string', () => {
                    for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_OPTS, ...{pass: el}})
                        ).toThrowError(/Mongo@ctor: options are invalid/);
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should throw when not passed', () => {
                    const opts:any = {...FULL_VALID_OPTS};
                    delete opts.pass;
                    expect(
                        () => new DBMongo(opts)
                    ).toThrowError(/Mongo@ctor: options are invalid/);
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });
            });

            describe('option: db', () => {
                it('Should throw when passed as a non-string or empty string', () => {
                    for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_OPTS, ...{db: el}})
                        ).toThrowError(/Mongo@ctor: options are invalid/);
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should throw when not passed', () => {
                    const opts:any = {...FULL_VALID_OPTS};
                    delete opts.db;
                    expect(
                        () => new DBMongo(opts)
                    ).toThrowError(/Mongo@ctor: options are invalid/);
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });
            });

            describe('option: auth_db', () => {
                it('Should throw when passed as a non-string or empty string', () => {
                    for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_OPTS, ...{auth_db: el}})
                        ).toThrowError(/Mongo@ctor: options are invalid/);
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should not throw when not passed', () => {
                    const opts:any = {...FULL_VALID_OPTS};
                    delete opts.auth_db;
                    expect(() => new DBMongo(opts)).not.toThrow();
                    expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                    expect(MockClient.isEmpty).toBe(true);
                });
            });

            describe('option: replset', () => {
                it('Should throw when passed as a non-string, non-false or empty string', () => {
                    for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                        if (el === false) continue;
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_OPTS, ...{replset: el}})
                        ).toThrowError(/Mongo@ctor: options are invalid/);
                    }

                    expect(
                        /* @ts-ignore */
                        () => new DBMongo({...FULL_VALID_OPTS, ...{replset: true}})
                    ).toThrowError(/Mongo@ctor: options are invalid/);
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should not throw when not passed', () => {
                    const opts:any = {...FULL_VALID_OPTS};
                    delete opts.replset;
                    expect(() => new DBMongo(opts)).not.toThrow();
                    expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                    expect(MockClient.isEmpty).toBe(true);
                });
            });

            describe('option: protocol', () => {
                it('Should throw when passed as a non-string or empty string', () => {
                    for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_OPTS, ...{protocol: el}})
                        ).toThrowError(/Mongo@ctor: options are invalid/);
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should throw when passed as a random string that is not in the set of options', () => {
                    for (const el of ['foo', 'bar', 'hello world']) {
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_OPTS, ...{protocol: el}})
                        ).toThrowError(/Mongo@ctor: options are invalid/);
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should not throw when passed as a valid ReadPreference', () => {
                    for (const el of Object.values(Protocols)) {
                        expect(() => new DBMongo({...FULL_VALID_OPTS, protocol: el})).not.toThrow();
                        expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                        expect(MockClient.isEmpty).toBe(true);
                        mockConsoleInfo.reset();
                    }
                });

                it('Should not throw when not passed', () => {
                    const opts:any = {...FULL_VALID_OPTS};
                    delete opts.protocol;
                    expect(() => new DBMongo(opts)).not.toThrow();
                    expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                    expect(MockClient.isEmpty).toBe(true);
                });
            });

            describe('option: read_preference', () => {
                it('Should throw when passed as a non-string or empty string', () => {
                    for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_OPTS, ...{read_preference: el}})
                        ).toThrowError(/Mongo@ctor: options are invalid/);
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should throw when passed as a random string that is not in the set of options', () => {
                    for (const el of ['foo', 'bar', 'hello world']) {
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_OPTS, ...{read_preference: el}})
                        ).toThrowError(/Mongo@ctor: options are invalid/);
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should not throw when passed as a valid ReadPreference', () => {
                    for (const el of Object.values(ReadPreferences)) {
                        expect(() => new DBMongo({...FULL_VALID_OPTS, read_preference: el})).not.toThrow();
                        expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                        expect(MockClient.isEmpty).toBe(true);
                        mockConsoleInfo.reset();
                    }
                });

                it('Should not throw when not passed', () => {
                    const opts:any = {...FULL_VALID_OPTS};
                    delete opts.read_preference;
                    expect(() => new DBMongo(opts)).not.toThrow();
                    expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                    expect(MockClient.isEmpty).toBe(true);
                });
            });

            describe('option: retry_reads', () => {
                it('Should throw when passed as a non-boolean', () => {
                    for (const el of CONSTANTS.NOT_BOOLEAN) {
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_OPTS, ...{retry_reads: el}})
                        ).toThrowError(/Mongo@ctor: options are invalid/);
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should not throw when not passed', () => {
                    const opts:any = {...FULL_VALID_OPTS};
                    delete opts.retry_reads;
                    expect(() => new DBMongo(opts)).not.toThrow();
                    expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                    expect(MockClient.isEmpty).toBe(true);
                });
            });

            describe('option: retry_writes', () => {
                it('Should throw when passed as a non-boolean', () => {
                    for (const el of CONSTANTS.NOT_BOOLEAN) {
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_OPTS, ...{retry_writes: el}})
                        ).toThrowError(/Mongo@ctor: options are invalid/);
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should not throw when not passed', () => {
                    const opts:any = {...FULL_VALID_OPTS};
                    delete opts.retry_writes;
                    expect(() => new DBMongo(opts)).not.toThrow();
                    expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                    expect(MockClient.isEmpty).toBe(true);
                });
            });

            describe('option: connect_timeout_ms', () => {
                it('Should throw when passed as a non-integer', () => {
                    for (const el of CONSTANTS.NOT_INTEGER) {
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_OPTS, ...{connect_timeout_ms: el}})
                        ).toThrowError(/Mongo@ctor: options are invalid/);
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should not throw when not passed', () => {
                    const opts:any = {...FULL_VALID_OPTS};
                    delete opts.retry_writes;
                    expect(() => new DBMongo(opts)).not.toThrow();
                    expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                    expect(MockClient.isEmpty).toBe(true);
                });
            });

            describe('option: socket_timeout_ms', () => {
                it('Should throw when passed as a non-integer', () => {
                    for (const el of CONSTANTS.NOT_INTEGER) {
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_OPTS, ...{socket_timeout_ms: el}})
                        ).toThrowError(/Mongo@ctor: options are invalid/);
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should not throw when not passed', () => {
                    const opts:any = {...FULL_VALID_OPTS};
                    delete opts.retry_writes;
                    expect(() => new DBMongo(opts)).not.toThrow();
                    expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                    expect(MockClient.isEmpty).toBe(true);
                });
            });
        });

        describe('uriConnection', () => {
            describe('option: debug', () => {
                it('Should throw when passed as a non-boolean', () => {
                    for (const el of CONSTANTS.NOT_BOOLEAN) {
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_URI_OPTS, ...{debug: el}})
                        ).toThrowError(/Mongo@ctor: options are invalid/);
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should not throw when not passed and not log by default', () => {
                    const opts:any = {...FULL_VALID_URI_OPTS};
                    delete opts.debug;
                    expect(() => new DBMongo(opts)).not.toThrow();
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should not log if debug is passed as false', () => {
                    expect(() => new DBMongo({...FULL_VALID_URI_OPTS, ...{debug: false}})).not.toThrow();
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should log if debug is enabled', () => {
                    expect(() => new DBMongo({...FULL_VALID_URI_OPTS, ...{debug: true}})).not.toThrow();
                    expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                    expect(MockClient.isEmpty).toBe(true);
                });
            });

            describe('option: pool_size', () => {
                it('Should throw when passed as a non-integer', () => {
                    for (const el of CONSTANTS.NOT_INTEGER) {
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_URI_OPTS, ...{pool_size: el}})
                        ).toThrowError(/Mongo@ctor: options are invalid/);
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should throw when passed as a number above 100', () => {
                    for (const el of [101, 1000, 99999]) {
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_URI_OPTS, ...{pool_size: el}})
                        ).toThrowError(/Mongo@ctor: options are invalid/);
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should throw when passed as a number below 1', () => {
                    for (const el of [0, -1, -101, -1000, -99999]) {
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_URI_OPTS, ...{pool_size: el}})
                        ).toThrowError(/Mongo@ctor: options are invalid/);
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should not throw when not passed', () => {
                    const opts:any = {...FULL_VALID_URI_OPTS};
                    delete opts.pool_size;
                    expect(() => new DBMongo(opts)).not.toThrow();
                    expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                    expect(MockClient.isEmpty).toBe(true);
                });
            });

            describe('option: uri', () => {
                it('Should throw when passed as a non-string or empty string', () => {
                    for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                        if (el === undefined) continue;
                        expect(
                            () => new DBMongo({...FULL_VALID_URI_OPTS, uri: el})
                        ).toThrow();
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should throw when passed as an invalid uri', () => {
                    expect(
                        () => new DBMongo({...FULL_VALID_URI_OPTS, uri: 'https://myhappymongo.com'})
                    ).toThrow();

                    expect(
                        () => new DBMongo({...FULL_VALID_URI_OPTS, uri: 'peter+rootroot@myhappymongo.com'})
                    ).toThrow();

                    expect(
                        () => new DBMongo({...FULL_VALID_URI_OPTS, uri: 'peter+rootroot@myhappymongo.com/myDb'})
                    ).toThrow();
                });

                it('Should not throw when passed as a string with retryReads inside of it', () => {
                    expect(() => new DBMongo({
                        ...FULL_VALID_URI_OPTS,
                        uri: 'mongodb+srv://peter:rootroot@myhappymongo.com/myDb?retryReads=true',
                    })).not.toThrow();
                    expect(() => new DBMongo({
                        ...FULL_VALID_URI_OPTS,
                        uri: 'mongodb://peter:rootroot@myhappymongo.com/myDb?retryReads=false',
                    })).not.toThrow();
                });

                it('Should not throw when passed as a string with retryWrites inside of it', () => {
                    expect(() => new DBMongo({
                        ...FULL_VALID_URI_OPTS,
                        uri: 'mongodb+srv://peter:rootroot@myhappymongo.com/myDb?retryWrites=true',
                    })).not.toThrow();
                    expect(() => new DBMongo({
                        ...FULL_VALID_URI_OPTS,
                        uri: 'mongodb://peter:rootroot@myhappymongo.com/myDb?retryWrites=false',
                    })).not.toThrow();
                });

                it('Should not throw when passed as a string with socketTimeoutMS inside of it', () => {
                    expect(() => new DBMongo({
                        ...FULL_VALID_URI_OPTS,
                        uri: 'mongodb+srv://peter:rootroot@myhappymongo.com/myDb?socketTimeoutMS=9000',
                    })).not.toThrow();
                    expect(() => new DBMongo({
                        ...FULL_VALID_URI_OPTS,
                        uri: 'mongodb://peter:rootroot@myhappymongo.com/myDb?socketTimeoutMS=9000',
                    })).not.toThrow();
                });

                it('Should not throw when passed as a string with connectTimeoutMS inside of it', () => {
                    expect(() => new DBMongo({
                        ...FULL_VALID_URI_OPTS,
                        uri: 'mongodb+srv://peter:rootroot@myhappymongo.com/myDb?connectTimeoutMS=9000',
                    })).not.toThrow();
                    expect(() => new DBMongo({
                        ...FULL_VALID_URI_OPTS,
                        uri: 'mongodb://peter:rootroot@myhappymongo.com/myDb?connectTimeoutMS=9000',
                    })).not.toThrow();
                });

                it('Should not throw when passed as a string with readPreference inside of it', () => {
                    expect(() => new DBMongo({
                        ...FULL_VALID_URI_OPTS,
                        uri: 'mongodb+srv://peter:rootroot@myhappymongo.com/myDb?readPreference=nearest',
                    })).not.toThrow();
                    expect(() => new DBMongo({
                        ...FULL_VALID_URI_OPTS,
                        uri: 'mongodb://peter:rootroot@myhappymongo.com/myDb?readPreference=nearest',
                    })).not.toThrow();
                });
            });

            describe('option: db', () => {
                it('Should throw when passed as a non-string or empty string when uri does not contain db', () => {
                    for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                        if (el === undefined) continue;
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_URI_OPTS, uri: URI_WITHOUT_DB, ...{db: el}})
                        ).to.throw();
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should throw when not passed when uri does not contain db', () => {
                    const opts:any = {...FULL_VALID_URI_OPTS, uri: URI_WITHOUT_DB};
                    delete opts.db;
                    expect(
                        () => new DBMongo(opts)
                    ).toThrowError(/Mongo@ctor: db not in uri and not provided in config/);
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should not throw when not passed when uri does contain db', () => {
                    const opts:any = {...FULL_VALID_URI_OPTS};
                    delete opts.db;
                    expect(() => new DBMongo(opts)).not.toThrow();
                    expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should not throw when passed when uri does not contain db', () => {
                    const opts:any = {...FULL_VALID_URI_OPTS, uri: URI_WITHOUT_DB, db: 'hello'};
                    expect(() => new DBMongo(opts)).not.toThrow();
                    expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                    expect(MockClient.isEmpty).toBe(true);
                });
                it('Should not throw when passed when uri does contain db', () => {
                    const opts:any = {...FULL_VALID_URI_OPTS, db: 'hello'};
                    expect(() => new DBMongo(opts)).not.toThrow();
                    expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                    expect(MockClient.isEmpty).toBe(true);
                });
            });

            describe('option: read_preference', () => {
                it('Should throw when passed as a non-string or empty string', () => {
                    for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_URI_OPTS, ...{read_preference: el}})
                        ).toThrowError(/Mongo@ctor: options are invalid/);
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should throw when passed as a random string that is not in the set of options', () => {
                    for (const el of ['foo', 'bar', 'hello world']) {
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_URI_OPTS, ...{read_preference: el}})
                        ).toThrowError(/Mongo@ctor: options are invalid/);
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should not throw when passed as a valid ReadPreference', () => {
                    for (const el of Object.values(ReadPreferences)) {
                        expect(() => new DBMongo({...FULL_VALID_URI_OPTS, read_preference: el})).not.toThrow();
                        expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                        expect(MockClient.isEmpty).toBe(true);
                        mockConsoleInfo.reset();
                    }
                });

                it('Should not throw when not passed', () => {
                    const opts:any = {...FULL_VALID_URI_OPTS};
                    delete opts.read_preference;
                    expect(() => new DBMongo(opts)).not.toThrow();
                    expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                    expect(MockClient.isEmpty).toBe(true);
                });
            });

            describe('option: retry_reads', () => {
                it('Should throw when passed as a non-boolean', () => {
                    for (const el of CONSTANTS.NOT_BOOLEAN) {
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_URI_OPTS, ...{retry_reads: el}})
                        ).toThrowError(/Mongo@ctor: options are invalid/);
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should not throw when not passed', () => {
                    const opts:any = {...FULL_VALID_URI_OPTS};
                    delete opts.retry_reads;
                    expect(() => new DBMongo(opts)).not.toThrow();
                    expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                    expect(MockClient.isEmpty).toBe(true);
                });
            });

            describe('option: retry_writes', () => {
                it('Should throw when passed as a non-boolean', () => {
                    for (const el of CONSTANTS.NOT_BOOLEAN) {
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_URI_OPTS, ...{retry_writes: el}})
                        ).toThrowError(/Mongo@ctor: options are invalid/);
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should not throw when not passed', () => {
                    const opts:any = {...FULL_VALID_URI_OPTS};
                    delete opts.retry_writes;
                    expect(() => new DBMongo(opts)).not.toThrow();
                    expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                    expect(MockClient.isEmpty).toBe(true);
                });
            });

            describe('option: connect_timeout_ms', () => {
                it('Should throw when passed as a non-integer', () => {
                    for (const el of CONSTANTS.NOT_INTEGER) {
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_URI_OPTS, ...{connect_timeout_ms: el}})
                        ).toThrowError(/Mongo@ctor: options are invalid/);
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should not throw when not passed', () => {
                    const opts:any = {...FULL_VALID_URI_OPTS};
                    delete opts.retry_writes;
                    expect(() => new DBMongo(opts)).not.toThrow();
                    expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                    expect(MockClient.isEmpty).toBe(true);
                });
            });

            describe('option: socket_timeout_ms', () => {
                it('Should throw when passed as a non-integer', () => {
                    for (const el of CONSTANTS.NOT_INTEGER) {
                        expect(
                            /* @ts-ignore */
                            () => new DBMongo({...FULL_VALID_URI_OPTS, ...{socket_timeout_ms: el}})
                        ).toThrowError(/Mongo@ctor: options are invalid/);
                    }
                    expect(mockConsoleInfo.isEmpty).toBe(true);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                });

                it('Should not throw when not passed', () => {
                    const opts:any = {...FULL_VALID_URI_OPTS};
                    delete opts.retry_writes;
                    expect(() => new DBMongo(opts)).not.toThrow();
                    expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                    expect(MockClient.isEmpty).toBe(true);
                });
            });
        });
    });

    describe('GET uid', () => {
        it('Should exist', () => {
            const instance = new DBMongo({user: 'peter', pass: 'mysecretpassword', db: 'main'});
            expect(instance.uid).toBe('mongodb:2036634067');
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should be a getter', () => {
            const instance = new DBMongo({user: 'peter', pass: 'mysecret', db: 'main'});
            expect(instance.uid).toBe('mongodb:1156494214');
            /* @ts-ignore */
            expect(() => instance.uid = 'bla').toThrow();
            expect(instance.uid).toBe('mongodb:1156494214');
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should be the same every time', () => {
            for (let i = 0; i < 1000; i++) {
                const instance = new DBMongo({user: 'peter', pass: 'mysecretpassword', db: 'main'});
                expect(instance.uid).toBe('mongodb:2036634067');
                expect(mockConsoleInfo.isEmpty).toBe(true);
                expect(mockConsoleError.isEmpty).toBe(true);
                expect(MockClient.isEmpty).toBe(true);
                mockConsoleInfo.reset();
            }
        });

        it('Should be the same for different instances with the same configuration', () => {
            const instance = new DBMongo({user: 'peter', pass: 'mysecretpassword', db: 'main'});
            const instance2 = new DBMongo({user: 'peter', pass: 'mysecretpassword', db: 'main'});
            expect(instance.uid).toBe(instance2.uid);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should be different if host differs', () => {
            const instance = new DBMongo({host: '127.0.0.1:8083', user: 'peter', pass: 'thisistrulysecret', db: 'main'});
            const instance2 = new DBMongo({host: '127.0.0.1:8082', user: 'peter', pass: 'thisistrulysecret', db: 'main'});
            expect(instance.uid).toBe('mongodb:355260832');
            expect(instance.uid).not.toBe(instance2.uid);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should be different if user differs', () => {
            const instance = new DBMongo({host: '127.0.0.1:8082', user: 'peter', pass: 'thisistrulysecret', db: 'main'});
            const instance2 = new DBMongo({host: '127.0.0.1:8082', user: 'jake', pass: 'thisistrulysecret', db: 'main'});
            expect(instance.uid).toBe('mongodb:669723387');
            expect(instance.uid).not.toBe(instance2.uid);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should be different if pass differs', () => {
            const instance = new DBMongo({host: '127.0.0.1:8082', user: 'admin', pass: 'root', db: 'main'});
            const instance2 = new DBMongo({host: '127.0.0.1:8082', user: 'admin', pass: 'rot', db: 'main'});
            expect(instance.uid).toBe('mongodb:2773005600');
            expect(instance.uid).not.toBe(instance2.uid);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should be different if auth_db differs', () => {
            const instance = new DBMongo({host: '127.0.0.1:8082', user: 'admin', pass: 'root', auth_db: 'admin', db: 'main'});
            const instance2 = new DBMongo({host: '127.0.0.1:8082', user: 'admin', pass: 'root', auth_db: 'someother', db: 'main'});
            expect(instance.uid).toBe('mongodb:2773005600');
            expect(instance.uid).not.toBe(instance2.uid);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should be different if db differs', () => {
            const instance = new DBMongo({user: 'admin', pass: 'root', db: 'main'});
            const instance2 = new DBMongo({user: 'admin', pass: 'root', db: 'identity'});
            expect(instance.uid).toBe('mongodb:2283077747');
            expect(instance.uid).not.toBe(instance2.uid);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should be different if protocol differs', () => {
            const instance = new DBMongo({user: 'admin', pass: 'root', db: 'main', protocol: 'mongodb+srv'});
            const instance2 = new DBMongo({user: 'admin', pass: 'root', db: 'main', protocol: 'mongodb'});
            expect(instance.uid).toBe('mongodb:703732625');
            expect(instance.uid).not.toBe(instance2.uid);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should be different if the replset differs', () => {
            const instance = new DBMongo({user: 'admin', pass: 'root', replset: 'cluster1', db: 'main'});
            const instance2 = new DBMongo({user: 'admin', pass: 'root', replset: 'cluster2', db: 'main'});
            expect(instance.uid).toBe('mongodb:1638644854');
            expect(instance.uid).not.toBe(instance2.uid);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should be the same if debug differs but the rest is the same', () => {
            const instance = new DBMongo({user: 'admin', pass: 'root', db: 'main', debug: false});
            const instance2 = new DBMongo({user: 'admin', pass: 'root', db: 'main', debug: true});
            expect(instance.uid).toBe('mongodb:2283077747');
            expect(instance.uid).toBe(instance2.uid);
            expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should be the same if pool_size differs but the rest is the same', () => {
            const instance = new DBMongo({user: 'admin', pass: 'root', db: 'main', pool_size: 20});
            const instance2 = new DBMongo({user: 'admin', pass: 'root', db: 'main', pool_size: 25});
            expect(instance.uid).toBe('mongodb:2283077747');
            expect(instance.uid).toBe(instance2.uid);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should be the same if read_preference differs but the rest is the same', () => {
            const instance = new DBMongo({user: 'admin', pass: 'root', db: 'main', read_preference: 'nearest'});
            const instance2 = new DBMongo({user: 'admin', pass: 'root', db: 'main', read_preference: 'primary'});
            expect(instance.uid).toBe('mongodb:2283077747');
            expect(instance.uid).toBe(instance2.uid);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should be the same if retry_reads differs but the rest is the same', () => {
            const instance = new DBMongo({user: 'admin', pass: 'root', db: 'main', retry_reads: true});
            const instance2 = new DBMongo({user: 'admin', pass: 'root', db: 'main', retry_reads: false});
            expect(instance.uid).toBe('mongodb:2283077747');
            expect(instance.uid).toBe(instance2.uid);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should be the same if retry_writes differs but the rest is the same', () => {
            const instance = new DBMongo({user: 'admin', pass: 'root', db: 'main', retry_writes: true});
            const instance2 = new DBMongo({user: 'admin', pass: 'root', db: 'main', retry_writes: false});
            expect(instance.uid).toBe('mongodb:2283077747');
            expect(instance.uid).toBe(instance2.uid);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should be the same if all of debug,pool_size,read_preference,retry_reads,retry_writes differs but the rest is the same', () => {
            const instance = new DBMongo({
                host: '127.0.0.1:8082',
                user: 'admin',
                pass: 'root',
                auth_db: 'admin',
                replset: 'cluster1',
                db: 'main',
                protocol: 'mongodb',
                retry_writes: true,
                retry_reads: false,
                read_preference: 'nearest',
                debug: false,
            });
            const instance2 = new DBMongo({
                host: '127.0.0.1:8082',
                user: 'admin',
                pass: 'root',
                auth_db: 'admin',
                replset: 'cluster1',
                db: 'main',
                protocol: 'mongodb',
                retry_writes: false,
                retry_reads: true,
                read_preference: 'primary',
                debug: true,
            });
            expect(instance.uid).toBe('mongodb:595584381');
            expect(instance.uid).toBe(instance2.uid);
            expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
            expect(MockClient.isEmpty).toBe(true);
        });
    });

    describe('GET isConnected', () => {
        it('Should be a getter', () => {
            const app = new DBMongo({user: 'peter', pass: 'mysecret', db: 'main'});
            //  @ts-ignore
            expect(() => app.isDebugEnabled = 'bla').toThrow();
            expect(app.isConnected).toBe(false);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should by default be false', () => {
            const app = new DBMongo({user: 'peter', pass: 'mysecret', db: 'main'});
            expect(app.isConnected).toBe(false);
        });

        it('Should still be false if connect fails due to throwing', async () => {
            const app = new DBMongo({user: 'peter', pass: 'mysecret', db: 'main', debug: true});
            MockClient.setConnectMode('throw');
            let val:any = false;
            try {
                await app.connect();
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('MockClient@connect: Oh No!');
            expect(app.isConnected).toBe(false);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
            ]);
            expect(mockConsoleError.calls.length).toBe(1);
            expect(mockConsoleError.calls[0]![0] as string).toBe('[error] Mongo@connect: Failed to connect');
            expect(MockClient.calls.length).toBe(1);
        });

        it('Should still be false if connect fails due to not returning a valid client', async () => {
            const app = new DBMongo({user: 'peter', pass: 'mysecret', db: 'main', debug: true});
            MockClient.setConnectMode('wrongret');
            let val:any = false;
            try {
                await app.connect();
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('Mongo@connect: Failed to create client pool');
            expect(app.isConnected).toBe(false);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
            ]);
            expect(mockConsoleError.calls.length).toBe(1);
            expect(mockConsoleError.calls[0]![0] as string).toBe('[error] Mongo@connect: Failed to connect');
            expect(MockClient.calls.length).toBe(1);
        });

        it('Should be true if connected', async () => {
            const app = new DBMongo({
                pool_size: 42,
                host: 'bla.mongodb.com',
                protocol: 'mongodb+srv',
                user: 'joe',
                pass: 'blake',
                db: 'spiderman',
                auth_db: 'gods',
                read_preference: 'primary',
                retry_reads: false,
                retry_writes: false,
                replset: 'nonono',
            });
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            await app.connect();
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.calls.length).toBe(2);
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: {
                    opts: {
                        compressors: ['zlib'],
                        connectTimeoutMS: 10000,
                        maxConnecting: 42,
                        maxPoolSize: 42,
                        minPoolSize: 1,
                        readPreference: 'primary',
                        retryReads: false,
                        retryWrites: false,
                        socketTimeoutMS: 0,
                        zlibCompressionLevel: 3,
                    },
                    uri: 'mongodb+srv://joe:blake@bla.mongodb.com/gods?replicaSet=nonono',
                }},
                {key: 'db', params: {
                    name: 'spiderman',
                    opts: {readPreference: 'primary', retryWrites: false},
                }},
            ]);
            expect(app.isConnected).toBe(true);
        });
    });

    describe('GET isDebugEnabled', () => {
        it('Should be a getter', () => {
            const app = new DBMongo({user: 'peter', pass: 'mysecret', db: 'main'});
            //  @ts-ignore
            expect(() => app.isDebugEnabled = 'bla').toThrow();
            expect(app.isDebugEnabled).toBe(false);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should by default be false', () => {
            const app = new DBMongo({user: 'peter', pass: 'mysecret', db: 'main'});
            expect(app.isDebugEnabled).toBe(false);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should return the proper value when debug is configured as true via ctor', () => {
            const app = new DBMongo({user: 'peter', pass: 'mysecret', db: 'main', debug: true});
            expect(app.isDebugEnabled).toBe(true);
            expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should return the proper value when debug is configured as false via ctor, and not log', () => {
            const app = new DBMongo({user: 'peter', pass: 'mysecret', db: 'main', debug: false});
            expect(app.isDebugEnabled).toBe(false);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });
    });

    describe('bootstrap', () => {
        it('Should not be static', () => {
            /* @ts-ignore */
            expect(DBMongo.bootstrap).toBe(undefined);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should be an async function', () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            expect(Validator.rules.async_function(instance.bootstrap)).toBe(true);
            expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should throw when connect fails', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);

            const mockConnect = new MockFn();
            mockConnect.mock(instance, 'connect');
            mockConnect.reject = true;

            let val:string|boolean = false;
            try {
                await instance.bootstrap();
            } catch (err) {
                val = (err as Error).message;
            }

            expect(val).toBe('Oh No');
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@bootstrap: Connectivity check'],
            ]);
            expect(mockConsoleError.calls.length).toBe(1);
            expect(mockConsoleError.calls[0]![0] as string).toBe('[error] Mongo@bootstrap: Connectivity failure');
            expect(MockClient.isEmpty).toBe(true);

            mockConnect.restore();
        });

        it('Should throw when close fails', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');

            const mockClose = new MockFn();
            mockClose.mock(instance, 'close');
            mockClose.reject = true;

            let val:string|boolean = false;
            try {
                await instance.bootstrap();
            } catch (err) {
                val = (err as Error).message;
            }

            expect(val).toBe('Oh No');
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@bootstrap: Connectivity check'],
                ['[info] Mongo@connect: Establishing connection'],
                ['[info] Mongo@connect: Connection established'],
            ]);
            expect(mockConsoleError.calls.length).toBe(1);
            expect(mockConsoleError.calls[0]![0] as string).toBe('[error] Mongo@bootstrap: Connectivity failure');
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {name: 'main', opts: {readPreference: 'nearest', retryWrites: true}}},
            ]);

            mockClose.restore();
        });

        it('Should succeed when connectivity succeeds', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockClient.setCloseMode('success');
            await instance.bootstrap();
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@bootstrap: Connectivity check'],
                ['[info] Mongo@connect: Establishing connection'],
                ['[info] Mongo@connect: Connection established'],
                ['[info] Mongo@close: Closing connection'],
                ['[info] Mongo@close: Connection Terminated'],
                ['[info] Mongo@bootstrap: Connectivity success'],
            ]);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {name: 'main', opts: {readPreference: 'nearest', retryWrites: true}}},
                {key: 'close', params: {}},
            ]);
        });

        it('Should succeed when connectivity succeeds with uri options', async () => {
            const instance = new DBMongo(FULL_VALID_URI_OPTS);
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockClient.setCloseMode('success');
            await instance.bootstrap();
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@bootstrap: Connectivity check'],
                ['[info] Mongo@connect: Establishing connection'],
                ['[info] Mongo@connect: Connection established'],
                ['[info] Mongo@close: Closing connection'],
                ['[info] Mongo@close: Connection Terminated'],
                ['[info] Mongo@bootstrap: Connectivity success'],
            ]);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_URI_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {name: 'main', opts: {readPreference: 'nearest', retryWrites: false}}},
                {key: 'close', params: {}},
            ]);
        });

        describe('structure', async () => {
            it('Should throw if provided a structure with non-objects or empty objects', async () => {
                const instance = new DBMongo(FULL_VALID_OPTS);
                for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                    let val:string|boolean = false;
                    try {
                        await instance.bootstrap([el]);
                    } catch (err) {
                        val = (err as Error).message;
                    }
                    expect(val).toBe('Mongo@bootstrap: All collection objects need to be valid');
                    expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                }
            });

            it('Should throw if provided a structure with collection objects not containing a valid name', async () => {
                const instance = new DBMongo(FULL_VALID_OPTS);
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    let val:string|boolean = false;
                    try {
                        await instance.bootstrap([{name: el}]);
                    } catch (err) {
                        val = (err as Error).message;
                    }
                    expect(val).toBe('Mongo@bootstrap: All collection objects need to be valid');
                    expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                }
            });

            it('Should throw if provided a structure with collection objects and indexes but indexes are non-objects', async () => {
                const instance = new DBMongo(FULL_VALID_OPTS);
                for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                    let val:string|boolean = false;
                    try {
                        await instance.bootstrap([{name: 'firstcollection'}, {name: 'mycollection', idx: [el]}]);
                    } catch (err) {
                        val = (err as Error).message;
                    }
                    expect(val).toBe('Mongo@bootstrap: All collection objects need to be valid');
                    expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                }
            });

            it('Should throw if provided a structure with collection objects and indexes but indexes dont contain valid name', async () => {
                const instance = new DBMongo(FULL_VALID_OPTS);
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    let val:string|boolean = false;
                    try {
                        await instance.bootstrap([{name: 'firstcollection'}, {name: 'mycollection', idx: [{name: el, spec: {date: 1}}]}]);
                    } catch (err) {
                        val = (err as Error).message;
                    }
                    expect(val).toBe('Mongo@bootstrap: All collection objects need to be valid');
                    expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                }
            });

            it('Should throw if provided a structure with collection and indexes but indexes dont contain object spec', async () => {
                const instance = new DBMongo(FULL_VALID_OPTS);
                for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                    let val:string|boolean = false;
                    try {
                        await instance.bootstrap([{name: 'firstcollection'}, {name: 'mycollection', idx: [{name: 'idx1', spec: el}]}]);
                    } catch (err) {
                        val = (err as Error).message;
                    }
                    expect(val).toBe('Mongo@bootstrap: All collection objects need to be valid');
                    expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                }
            });

            it('Should throw if provided a structure with collection and indexes but index spec is invalid', async () => {
                const instance = new DBMongo(FULL_VALID_OPTS);
                for (const el of [false, null, 0, 999, 100, 1.1]) {
                    let val:string|boolean = false;
                    try {
                        await instance.bootstrap([
                            {name: 'firstcollection'},
                            {name: 'mycollection', idx: [{name: 'idx1', spec: {uid: el}}]},
                        ]);
                    } catch (err) {
                        val = (err as Error).message;
                    }
                    expect(val).toBe('Mongo@bootstrap: All collection objects need to be valid');
                    expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                }
            });

            it('Should throw if provided a structure with collection objects and indexes but index.options is not an object', async () => {
                const instance = new DBMongo(FULL_VALID_OPTS);
                for (const el of CONSTANTS.NOT_OBJECT) {
                    if (el === undefined) continue;
                    let val:string|boolean = false;
                    try {
                        await instance.bootstrap([
                            {name: 'firstcollection'},
                            {name: 'mycollection', idx: [{name: 'idx1', spec: {date: 1}, options: el}]},
                        ]);
                    } catch (err) {
                        val = (err as Error).message;
                    }
                    expect(val).toBe('Mongo@bootstrap: All collection objects need to be valid');
                    expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                    expect(mockConsoleError.isEmpty).toBe(true);
                    expect(MockClient.isEmpty).toBe(true);
                }
            });

            it('Should throw if provided a structure with collection and indexes but index names are not unique', async () => {
                const instance = new DBMongo(FULL_VALID_OPTS);
                let val:string|boolean = false;
                try {
                    await instance.bootstrap([
                        {name: 'firstcollection'},
                        {name: 'mycollection', idx: [
                            {name: 'idx1', spec: {uid: 1}},
                            {name: 'idx1', spec: {uid: -1}},
                        ]},
                    ]);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('Mongo@bootstrap: Ensure all indexes have a unique name');
                expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                expect(mockConsoleError.isEmpty).toBe(true);
                expect(MockClient.isEmpty).toBe(true);
            });

            it('Should create structure', async () => {
                const instance = new DBMongo(FULL_VALID_OPTS);
                MockDb.setDbColExistsMode('emptyret');
                MockDb.setDbColIdxExistsMode('wrongret');
                await instance.bootstrap([
                    {
                        name: 'collection_1',
                    },
                    {
                        name: 'collection_2',
                        idx: [
                            {name: 'uid_asc', spec: {uid: 1}},
                        ],
                    },
                    {
                        name: 'collection_3',
                        idx: [
                            {name: 'uid_asc', spec: {uid: 1}},
                            {name: 'uid_asc_date_desc', spec: {uid: 1, date: -1}},
                        ],
                    },
                    {
                        name: 'collection_4',
                        idx: [
                            {name: 'uid_asc', spec: {uid: 1}},
                            {name: 'uid_asc_date_desc', spec: {uid: 1, date: -1}, options: {expireAfterSeconds: 90}},
                        ],
                    },
                ]);
                expect(mockConsoleInfo.calls).toEqual([
                    ['[info] Mongo@ctor: Instantiated'],
                    ['[info] Mongo@bootstrap: Connectivity check'],
                    ['[info] Mongo@connect: Establishing connection'],
                    ['[info] Mongo@connect: Connection established'],
                    ['[info] Mongo@bootstrap: Ensuring structure'],
                    ['[info] Mongo@hasCollection: Collection does not exist', {collection: 'collection_1'}],
                    ['[info] Mongo@createCollection: Creating collection', {collection: 'collection_1'}],
                    ['[info] Mongo@createCollection: Collection created', {collection: 'collection_1'}],
                    ['[info] Mongo@hasCollection: Collection does not exist', {collection: 'collection_2'}],
                    ['[info] Mongo@createCollection: Creating collection', {collection: 'collection_2'}],
                    ['[info] Mongo@createCollection: Collection created', {collection: 'collection_2'}],
                    ['[info] Mongo@hasIndex: Index does not exist', {collection: 'collection_2', name: 'uid_asc'}],
                    ['[info] Mongo@createIndex: Creating index', {collection: 'collection_2', name: 'uid_asc', options: {background: true}, spec: {uid: 1}}],
                    ['[info] Mongo@createIndex: Index created', {collection: 'collection_2', name: 'uid_asc', options: {background: true}, spec: {uid: 1}}],
                    ['[info] Mongo@hasCollection: Collection does not exist', {collection: 'collection_3'}],
                    ['[info] Mongo@createCollection: Creating collection', {collection: 'collection_3'}],
                    ['[info] Mongo@createCollection: Collection created', {collection: 'collection_3'}],
                    ['[info] Mongo@hasIndex: Index does not exist', {collection: 'collection_3', name: 'uid_asc'}],
                    ['[info] Mongo@createIndex: Creating index', {collection: 'collection_3', name: 'uid_asc', options: {background: true}, spec: {uid: 1}}],
                    ['[info] Mongo@createIndex: Index created', {collection: 'collection_3', name: 'uid_asc', options: {background: true}, spec: {uid: 1}}],
                    ['[info] Mongo@hasIndex: Index does not exist', {collection: 'collection_3', name: 'uid_asc_date_desc'}],
                    ['[info] Mongo@createIndex: Creating index', {collection: 'collection_3', name: 'uid_asc_date_desc', options: {background: true}, spec: {uid: 1, date: -1}}],
                    ['[info] Mongo@createIndex: Index created', {collection: 'collection_3', name: 'uid_asc_date_desc', options: {background: true}, spec: {uid: 1, date: -1}}],
                    ['[info] Mongo@hasCollection: Collection does not exist', {collection: 'collection_4'}],
                    ['[info] Mongo@createCollection: Creating collection', {collection: 'collection_4'}],
                    ['[info] Mongo@createCollection: Collection created', {collection: 'collection_4'}],
                    ['[info] Mongo@hasIndex: Index does not exist', {collection: 'collection_4', name: 'uid_asc'}],
                    ['[info] Mongo@createIndex: Creating index', {collection: 'collection_4', name: 'uid_asc', options: {background: true}, spec: {uid: 1}}],
                    ['[info] Mongo@createIndex: Index created', {collection: 'collection_4', name: 'uid_asc', options: {background: true}, spec: {uid: 1}}],
                    ['[info] Mongo@hasIndex: Index does not exist', {collection: 'collection_4', name: 'uid_asc_date_desc'}],
                    ['[info] Mongo@createIndex: Creating index', {collection: 'collection_4', name: 'uid_asc_date_desc', options: {background: true, expireAfterSeconds: 90}, spec: {uid: 1, date: -1}}],
                    ['[info] Mongo@createIndex: Index created', {collection: 'collection_4', name: 'uid_asc_date_desc', options: {background: true, expireAfterSeconds: 90}, spec: {uid: 1, date: -1}}],
                    ['[info] Mongo@bootstrap: Structure ensured'],
                    ['[info] Mongo@close: Closing connection'],
                    ['[info] Mongo@close: Connection Terminated'],
                    ['[info] Mongo@bootstrap: Connectivity success'],
                ]);
                expect(mockConsoleError.isEmpty).toBe(true);
                expect(MockClient.calls).toEqual([
                    {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                    {key: 'db', params: {name: 'main', opts: {readPreference: 'nearest', retryWrites: true}}},
                    {key: 'close', params: {}},
                ]);
                expect(MockDb.calls).toEqual([
                    {
                        key: 'listCollections',
                        params: {opts: {name: 'collection_1'}},
                    },
                    {
                        key: 'createCollection',
                        params: {name: 'collection_1'},
                    },
                    {
                        key: 'listCollections',
                        params: {opts: {name: 'collection_2'}},
                    },
                    {
                        key: 'createCollection',
                        params: {name: 'collection_2'},
                    },
                    {
                        key: 'collection',
                        params: {name: 'collection_2'},
                    },
                    {
                        key: 'indexExists',
                        params: {name: 'uid_asc'},
                    },
                    {
                        key: 'collection',
                        params: {name: 'collection_2'},
                    },
                    {
                        key: 'createIndex',
                        params: {indexSpec: {uid: 1}, options: {background: true, name: 'uid_asc'}},
                    },
                    {
                        key: 'listCollections',
                        params: {opts: {name: 'collection_3'}},
                    },
                    {
                        key: 'createCollection',
                        params: {name: 'collection_3'},
                    },
                    {
                        key: 'collection',
                        params: {name: 'collection_3'},
                    },
                    {
                        key: 'indexExists',
                        params: {name: 'uid_asc'},
                    },
                    {
                        key: 'collection',
                        params: {name: 'collection_3'},
                    },
                    {
                        key: 'createIndex',
                        params: {indexSpec: {uid: 1}, options: {background: true, name: 'uid_asc'}},
                    },
                    {
                        key: 'collection',
                        params: {name: 'collection_3'},
                    },
                    {
                        key: 'indexExists',
                        params: {name: 'uid_asc_date_desc'},
                    },
                    {
                        key: 'collection',
                        params: {name: 'collection_3'},
                    },
                    {
                        key: 'createIndex',
                        params: {indexSpec: {uid: 1, date: -1}, options: {background: true, name: 'uid_asc_date_desc'}},
                    },
                    {
                        key: 'listCollections',
                        params: {opts: {name: 'collection_4'}},
                    },
                    {
                        key: 'createCollection',
                        params: {name: 'collection_4'},
                    },
                    {
                        key: 'collection',
                        params: {name: 'collection_4'},
                    },
                    {
                        key: 'indexExists',
                        params: {name: 'uid_asc'},
                    },
                    {
                        key: 'collection',
                        params: {name: 'collection_4'},
                    },
                    {
                        key: 'createIndex',
                        params: {indexSpec: {uid: 1}, options: {background: true, name: 'uid_asc'}},
                    },
                    {
                        key: 'collection',
                        params: {name: 'collection_4'},
                    },
                    {
                        key: 'indexExists',
                        params: {name: 'uid_asc_date_desc'},
                    },
                    {
                        key: 'collection',
                        params: {name: 'collection_4'},
                    },
                    {
                        key: 'createIndex',
                        params: {
                            indexSpec: {uid: 1, date: -1},
                            options: {background: true, name: 'uid_asc_date_desc', expireAfterSeconds: 90},
                        },
                    },
                ]);
            });

            it('Should not run creation calls if indexes and collections exist for structure', async () => {
                const instance = new DBMongo(FULL_VALID_OPTS);
                MockDb.setDbColExistsMode('success');
                MockDb.setDbColIdxExistsMode('success');
                await instance.bootstrap([
                    {
                        name: 'collection_1',
                    },
                    {
                        name: 'collection_2',
                        idx: [
                            {name: 'uid_asc', spec: {uid: 1}},
                        ],
                    },
                    {
                        name: 'collection_3',
                        idx: [
                            {name: 'uid_asc', spec: {uid: 1}},
                            {name: 'uid_asc_date_desc', spec: {uid: 1, date: -1}},
                        ],
                    },
                    {
                        name: 'collection_4',
                        idx: [
                            {name: 'uid_asc', spec: {uid: 1}},
                            {name: 'uid_asc_date_desc', spec: {uid: 1, date: -1}, options: {expireAfterSeconds: 90}},
                        ],
                    },
                ]);
                expect(mockConsoleInfo.calls).toEqual([
                    ['[info] Mongo@ctor: Instantiated'],
                    ['[info] Mongo@bootstrap: Connectivity check'],
                    ['[info] Mongo@connect: Establishing connection'],
                    ['[info] Mongo@connect: Connection established'],
                    ['[info] Mongo@bootstrap: Ensuring structure'],
                    ['[info] Mongo@hasCollection: Collection exists', {collection: 'collection_1'}],
                    ['[info] Mongo@hasCollection: Collection exists', {collection: 'collection_2'}],
                    ['[info] Mongo@hasIndex: Index exists', {collection: 'collection_2', name: 'uid_asc'}],
                    ['[info] Mongo@hasCollection: Collection exists', {collection: 'collection_3'}],
                    ['[info] Mongo@hasIndex: Index exists', {collection: 'collection_3', name: 'uid_asc'}],
                    ['[info] Mongo@hasIndex: Index exists', {collection: 'collection_3', name: 'uid_asc_date_desc'}],
                    ['[info] Mongo@hasCollection: Collection exists', {collection: 'collection_4'}],
                    ['[info] Mongo@hasIndex: Index exists', {collection: 'collection_4', name: 'uid_asc'}],
                    ['[info] Mongo@hasIndex: Index exists', {collection: 'collection_4', name: 'uid_asc_date_desc'}],
                    ['[info] Mongo@bootstrap: Structure ensured'],
                    ['[info] Mongo@close: Closing connection'],
                    ['[info] Mongo@close: Connection Terminated'],
                    ['[info] Mongo@bootstrap: Connectivity success'],
                ]);
                expect(MockClient.calls).toEqual([
                    {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                    {key: 'db', params: {name: 'main', opts: {readPreference: 'nearest', retryWrites: true}}},
                    {key: 'close', params: {}},
                ]);
                expect(MockDb.calls).toEqual([
                    {
                        key: 'listCollections',
                        params: {opts: {name: 'collection_1'}},
                    },
                    {
                        key: 'listCollections',
                        params: {opts: {name: 'collection_2'}},
                    },
                    {
                        key: 'collection',
                        params: {name: 'collection_2'},
                    },
                    {
                        key: 'indexExists',
                        params: {name: 'uid_asc'},
                    },
                    {
                        key: 'listCollections',
                        params: {opts: {name: 'collection_3'}},
                    },
                    {
                        key: 'collection',
                        params: {name: 'collection_3'},
                    },
                    {
                        key: 'indexExists',
                        params: {name: 'uid_asc'},
                    },
                    {
                        key: 'collection',
                        params: {name: 'collection_3'},
                    },
                    {
                        key: 'indexExists',
                        params: {name: 'uid_asc_date_desc'},
                    },
                    {
                        key: 'listCollections',
                        params: {opts: {name: 'collection_4'}},
                    },
                    {
                        key: 'collection',
                        params: {name: 'collection_4'},
                    },
                    {
                        key: 'indexExists',
                        params: {name: 'uid_asc'},
                    },
                    {
                        key: 'collection',
                        params: {name: 'collection_4'},
                    },
                    {
                        key: 'indexExists',
                        params: {name: 'uid_asc_date_desc'},
                    },
                ]);
            });
        });
    });

    describe('connect', () => {
        it('Should not be static', () => {
            /* @ts-ignore */
            expect(DBMongo.connect).toBe(undefined);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should be an async function', () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            expect(Validator.rules.async_function(instance.connect)).toBe(true);
            expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should throw if connect fails due to mongo internals throwing', async () => {
            const app = new DBMongo({user: 'peter', pass: 'mysecret', db: 'main', debug: true});
            MockClient.setConnectMode('throw');
            let val:any = false;
            try {
                await app.connect();
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('MockClient@connect: Oh No!');
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
            ]);
            expect(mockConsoleError.calls.length).toBe(1);
            expect(mockConsoleError.calls[0]![0] as string).toBe('[error] Mongo@connect: Failed to connect');
            expect(MockClient.calls.length).toBe(1);
        });

        it('Should throw if connect fails due to not returning a valid client', async () => {
            const app = new DBMongo({user: 'peter', pass: 'mysecret', db: 'main', debug: true});
            MockClient.setConnectMode('wrongret');
            let val:any = false;
            try {
                await app.connect();
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('Mongo@connect: Failed to create client pool');
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
            ]);
            expect(mockConsoleError.calls.length).toBe(1);
            expect(mockConsoleError.calls[0]![0] as string).toBe('[error] Mongo@connect: Failed to connect');
            expect(MockClient.calls.length).toBe(1);
        });

        it('Should throw if connect fails due to call to db failing for mongo internals', async () => {
            const app = new DBMongo({user: 'peter', pass: 'mysecret', db: 'main', debug: true});
            MockClient.setConnectMode('success');
            MockClient.setDbMode('throw');
            let val:any = false;
            try {
                await app.connect();
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('MockClient@db: Oh No!');
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
            ]);
            expect(mockConsoleError.calls.length).toBe(1);
            expect(mockConsoleError.calls[0]![0] as string).toBe('[error] Mongo@connect: Failed to connect');
            expect(MockClient.calls.length).toBe(2);
        });

        it('Should throw if connect fails due to call to db not returning a proper value for mongo internals', async () => {
            const app = new DBMongo({user: 'peter', pass: 'mysecret', db: 'main', debug: false});
            MockClient.setConnectMode('success');
            MockClient.setDbMode('wrongret');
            let val:any = false;
            try {
                await app.connect();
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('Mongo@connect: Failed to create database instance');
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.calls.length).toBe(2);
        });

        it('Should return db instance if connect succeeds and pass proper values', async () => {
            const app = new DBMongo({user: 'peter', pass: 'mysecret', db: 'main'});
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            const db = await app.connect();
            expect(db instanceof Db).toBe(true);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.calls.length).toBe(2);
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: {
                    opts: {
                        compressors: ['zlib'],
                        connectTimeoutMS: 10000,
                        maxConnecting: 5,
                        maxPoolSize: 5,
                        minPoolSize: 1,
                        readPreference: 'nearest',
                        retryReads: true,
                        retryWrites: true,
                        socketTimeoutMS: 0,
                        zlibCompressionLevel: 3,
                    },
                    uri: 'mongodb://peter:mysecret@127.0.0.1:27017/admin',
                }},
                {key: 'db', params: {
                    name: 'main',
                    opts: {readPreference: 'nearest', retryWrites: true},
                }},
            ]);
        });

        it('Should return db instance if connect succeeds and pass proper values when passing full custom options', async () => {
            const app = new DBMongo({
                pool_size: 42,
                host: 'bla.mongodb.com',
                protocol: 'mongodb+srv',
                user: 'joe',
                pass: 'blake',
                db: 'spiderman',
                auth_db: 'gods',
                debug: false,
                read_preference: 'primary',
                retry_reads: false,
                retry_writes: false,
                replset: 'nonono',
            });
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            const db = await app.connect();
            expect(db instanceof Db).toBe(true);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.calls.length).toBe(2);
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: {
                    opts: {
                        compressors: ['zlib'],
                        connectTimeoutMS: 10000,
                        maxConnecting: 42,
                        maxPoolSize: 42,
                        minPoolSize: 1,
                        readPreference: 'primary',
                        retryReads: false,
                        retryWrites: false,
                        socketTimeoutMS: 0,
                        zlibCompressionLevel: 3,
                    },
                    uri: 'mongodb+srv://joe:blake@bla.mongodb.com/gods?replicaSet=nonono',
                }},
                {key: 'db', params: {
                    name: 'spiderman',
                    opts: {readPreference: 'primary', retryWrites: false},
                }},
            ]);
        });

        it('Should return db instance if connect succeeds and not run connect multiple times', async () => {
            const app = new DBMongo({
                pool_size: 42,
                host: 'bla.mongodb.com',
                protocol: 'mongodb+srv',
                user: 'joe',
                pass: 'blake',
                db: 'spiderman',
                auth_db: 'gods',
                debug: false,
                read_preference: 'primary',
                retry_reads: false,
                retry_writes: false,
                replset: 'nonono',
            });
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            let db;
            for (let i = 0; i < 100; i++) db = await app.connect();
            expect(db instanceof Db).toBe(true);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.calls.length).toBe(2);
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: {
                    opts: {
                        compressors: ['zlib'],
                        connectTimeoutMS: 10000,
                        maxConnecting: 42,
                        maxPoolSize: 42,
                        minPoolSize: 1,
                        readPreference: 'primary',
                        retryReads: false,
                        retryWrites: false,
                        socketTimeoutMS: 0,
                        zlibCompressionLevel: 3,
                    },
                    uri: 'mongodb+srv://joe:blake@bla.mongodb.com/gods?replicaSet=nonono',
                }},
                {key: 'db', params: {
                    name: 'spiderman',
                    opts: {readPreference: 'primary', retryWrites: false},
                }},
            ]);
        });

        it('Should pass provided auth mechanism properties to connect', async () => {
            const app = new DBMongo({
                debug: false,
                pool_size: 42,
                uri: 'mongodb://root:rootroot@127.0.0.1:27017/spiderman?retryWrites=false',
                db: 'spiderman',
                read_preference: 'nearest',
                retry_reads: false,
                connect_timeout_ms: 8000,
                socket_timeout_ms: 0,
                auth_mechanism_properties: {
                    SERVICE_NAME: 'PetersService',
                    ALLOWED_HOSTS: ['peter.com', 'peter2.com'],
                },
            });
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            let db;
            for (let i = 0; i < 100; i++) db = await app.connect();
            expect(db instanceof Db).toBe(true);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.calls.length).toBe(2);
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: {
                    opts: {
                        compressors: ['zlib'],
                        connectTimeoutMS: 8000,
                        maxConnecting: 42,
                        maxPoolSize: 42,
                        minPoolSize: 1,
                        readPreference: 'nearest',
                        retryReads: false,
                        retryWrites: false,
                        socketTimeoutMS: 0,
                        zlibCompressionLevel: 3,
                        authMechanismProperties: {
                            SERVICE_NAME: 'PetersService',
                            ALLOWED_HOSTS: ['peter.com', 'peter2.com'],
                        },
                    },
                    uri: 'mongodb://root:rootroot@127.0.0.1:27017/spiderman?retryWrites=false',
                }},
                {key: 'db', params: {
                    name: 'spiderman',
                    opts: {readPreference: 'nearest', retryWrites: false},
                }},
            ]);
        });

        it('Should not pass provided auth mechanism properties to connect if empty', async () => {
            const app = new DBMongo({
                debug: false,
                pool_size: 5,
                uri: 'mongodb://root:rootroot@127.0.0.1:27017/spiderman?retryWrites=false',
                db: 'spiderman',
                read_preference: 'nearest',
                retry_reads: false,
                connect_timeout_ms: 8000,
                socket_timeout_ms: 0,
                auth_mechanism_properties: {},
            });
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            let db;
            for (let i = 0; i < 100; i++) db = await app.connect();
            expect(db instanceof Db).toBe(true);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.calls.length).toBe(2);
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: {
                    opts: {
                        compressors: ['zlib'],
                        connectTimeoutMS: 8000,
                        maxConnecting: 5,
                        maxPoolSize: 5,
                        minPoolSize: 1,
                        readPreference: 'nearest',
                        retryReads: false,
                        retryWrites: false,
                        socketTimeoutMS: 0,
                        zlibCompressionLevel: 3,
                    },
                    uri: 'mongodb://root:rootroot@127.0.0.1:27017/spiderman?retryWrites=false',
                }},
                {key: 'db', params: {
                    name: 'spiderman',
                    opts: {readPreference: 'nearest', retryWrites: false},
                }},
            ]);
        });
    });

    describe('hasCollection', () => {
        it('Should not be static', () => {
            /* @ts-ignore */
            expect(DBMongo.hasCollection).toBe(undefined);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should be an async function', () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            expect(Validator.rules.async_function(instance.hasCollection)).toBe(true);
            expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
            expect(MockClient.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
        });

        it('Should throw if not passed a string or passed an empty string collection name', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                let val:any = false;
                try {
                    await instance.hasCollection(el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('Mongo@hasCollection: Collection should be a non-empty string');
                expect(MockClient.isEmpty).toBe(true);
                expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                expect(mockConsoleError.isEmpty).toBe(true);
            }
        });

        it('Should throw if passed valid payload but connect fails due to throwing', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('throw');
            const instance = new DBMongo(FULL_VALID_OPTS);

            let val:string|boolean = false;
            try {
                await instance.hasCollection('mycollection');
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('MockClient@db: Oh No!');
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
            ]);
            expect(mockConsoleError.calls.length).toBe(1);
            expect(mockConsoleError.calls[0]![0] as string).toBe('[error] Mongo@connect: Failed to connect');
        });

        it('Should throw if passed valid payload but connect does not return DB instance', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);

            const mockConnect = new MockFn();
            mockConnect.mock(instance, 'connect');

            let val:string|boolean = false;
            try {
                await instance.hasCollection('mycollection');
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('Mongo@hasCollection: Failed to connect');
            expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
            expect(mockConsoleError.isEmpty).toBe(true);
            mockConnect.restore();
        });

        it('Should throw if passed valid payload but connect does not return DB instance', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);

            const mockConnect = new MockFn();
            mockConnect.mock(instance, 'connect');

            let val:string|boolean = false;
            try {
                await instance.hasCollection('mycollection');
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('Mongo@hasCollection: Failed to connect');
            expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
            expect(mockConsoleError.isEmpty).toBe(true);
            mockConnect.restore();
        });

        it('Should throw if passed valid payload and connecting, but listCollections throws', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColExistsMode('throw');

            const instance = new DBMongo(FULL_VALID_OPTS);
            let val:string|boolean = false;
            try {
                await instance.hasCollection('mycollection    ');
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('MockDb@listCollections: Oh No!');
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(MockDb.calls).toEqual([
                {key: 'listCollections', params: {opts: {name: 'mycollection'}}},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
                ['[info] Mongo@connect: Connection established'],
            ]);
            expect(mockConsoleError.isEmpty).toBe(true);
        });

        it('Should throw if passed valid payload and connecting, but listCollections returns a wrong value', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColExistsMode('wrongret');

            const instance = new DBMongo(FULL_VALID_OPTS);
            let val:string|boolean = false;
            try {
                await instance.hasCollection('   mycollection    ');
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('Mongo@hasCollection: Unexpected result');
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(MockDb.calls).toEqual([
                {key: 'listCollections', params: {opts: {name: 'mycollection'}}},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
                ['[info] Mongo@connect: Connection established'],
            ]);
            expect(mockConsoleError.isEmpty).toBe(true);
        });

        it('Should return false if valid payload, connecting, but listCollections returns an empty set', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColExistsMode('emptyret');

            const instance = new DBMongo(FULL_VALID_OPTS);
            const out = await instance.hasCollection('mycollection');
            expect(out).toBe(false);
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(MockDb.calls).toEqual([
                {key: 'listCollections', params: {opts: {name: 'mycollection'}}},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
                ['[info] Mongo@connect: Connection established'],
                ['[info] Mongo@hasCollection: Collection does not exist', {collection: 'mycollection'}],
            ]);
            expect(mockConsoleError.isEmpty).toBe(true);
        });

        it('Should return true if valid payload, connecting, and hasCollection returns true', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColExistsMode('success');

            const instance = new DBMongo(FULL_VALID_OPTS);
            const out = await instance.hasCollection('mycollection');
            expect(out).toBe(true);
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(MockDb.calls).toEqual([
                {key: 'listCollections', params: {opts: {name: 'mycollection'}}},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
                ['[info] Mongo@connect: Connection established'],
                ['[info] Mongo@hasCollection: Collection exists', {collection: 'mycollection'}],
            ]);
            expect(mockConsoleError.isEmpty).toBe(true);
        });

        it('Should return true if valid payload, connecting and hasCollection returns true and not log if debug is off', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColExistsMode('success');

            const instance = new DBMongo({...FULL_VALID_OPTS, debug: false});
            const out = await instance.hasCollection('mycollection');
            expect(out).toBe(true);
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(MockDb.calls).toEqual([
                {key: 'listCollections', params: {opts: {name: 'mycollection'}}},
            ]);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
        });
    });

    describe('createCollection', () => {
        it('Should not be static', () => {
            /* @ts-ignore */
            expect(DBMongo.createCollection).toBe(undefined);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should be an async function', () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            expect(Validator.rules.async_function(instance.createCollection)).toBe(true);
            expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
            expect(MockClient.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
        });

        it('Should throw if not passed a string or passed an empty string collection name', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                let val:any = false;
                try {
                    await instance.createCollection(el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('Mongo@createCollection: Collection should be a non-empty string');
                expect(MockClient.isEmpty).toBe(true);
                expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                expect(mockConsoleError.isEmpty).toBe(true);
            }
        });

        it('Should throw if passed valid payload but connect fails due to throwing', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('throw');
            const instance = new DBMongo(FULL_VALID_OPTS);

            let val:string|boolean = false;
            try {
                await instance.createCollection('mycollection');
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('MockClient@db: Oh No!');
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
            ]);
            expect(mockConsoleError.calls.length).toBe(1);
            expect(mockConsoleError.calls[0]![0] as string).toBe('[error] Mongo@connect: Failed to connect');
        });

        it('Should throw if passed valid payload but connect does not return DB instance', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);

            const mockConnect = new MockFn();
            mockConnect.mock(instance, 'connect');

            let val:string|boolean = false;
            try {
                await instance.createCollection('mycollection');
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('Mongo@createCollection: Failed to connect');
            expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
            expect(mockConsoleError.isEmpty).toBe(true);
            mockConnect.restore();
        });

        it('Should throw if passed valid payload and connecting, but createCollection throws', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColCreateMode('throw');

            const instance = new DBMongo(FULL_VALID_OPTS);
            let val:string|boolean = false;
            try {
                await instance.createCollection('mycollection    ');
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('MockDb@createCollection: Oh No!');
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(MockDb.calls).toEqual([
                {key: 'createCollection', params: {name: 'mycollection'}},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
                ['[info] Mongo@connect: Connection established'],
                ['[info] Mongo@createCollection: Creating collection', {collection: 'mycollection'}],
            ]);
            expect(mockConsoleError.isEmpty).toBe(true);
        });

        it('Should not throw and return false if passed valid payload and connecting, but createCollection fails', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColCreateMode('wrongret');

            const instance = new DBMongo(FULL_VALID_OPTS);
            const out = await instance.createCollection('mycollection    ');
            expect(out).toBe(false);
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(MockDb.calls).toEqual([
                {key: 'createCollection', params: {name: 'mycollection'}},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
                ['[info] Mongo@connect: Connection established'],
                ['[info] Mongo@createCollection: Creating collection', {collection: 'mycollection'}],
            ]);
            expect(mockConsoleError.calls.length).toBe(1);
            expect(mockConsoleError.calls[0]![0] as string).toBe('[error] Mongo@createCollection: Did not create collection');
        });

        it('Should not throw and return true if passed valid payload and connecting, and createCollection succeeds', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColCreateMode('success');

            const instance = new DBMongo(FULL_VALID_OPTS);
            const out = await instance.createCollection('   foobar    ');
            expect(out).toBe(true);
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(MockDb.calls).toEqual([
                {key: 'createCollection', params: {name: 'foobar'}},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
                ['[info] Mongo@connect: Connection established'],
                ['[info] Mongo@createCollection: Creating collection', {collection: 'foobar'}],
                ['[info] Mongo@createCollection: Collection created', {collection: 'foobar'}],
            ]);
        });
    });

    describe('dropCollection', () => {
        it('Should not be static', () => {
            /* @ts-ignore */
            expect(DBMongo.dropCollection).toBe(undefined);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should be an async function', () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            expect(Validator.rules.async_function(instance.dropCollection)).toBe(true);
            expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
            expect(MockClient.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
        });

        it('Should throw if not passed a string or passed an empty string collection name', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                let val:any = false;
                try {
                    await instance.dropCollection(el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('Mongo@dropCollection: Collection should be a non-empty string');
                expect(MockClient.isEmpty).toBe(true);
                expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                expect(mockConsoleError.isEmpty).toBe(true);
            }
        });

        it('Should throw if passed valid payload but connect fails due to throwing', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('throw');
            const instance = new DBMongo(FULL_VALID_OPTS);

            let val:string|boolean = false;
            try {
                await instance.dropCollection('mycollection');
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('MockClient@db: Oh No!');
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
            ]);
            expect(mockConsoleError.calls.length).toBe(1);
            expect(mockConsoleError.calls[0]![0] as string).toBe('[error] Mongo@connect: Failed to connect');
        });

        it('Should throw if passed valid payload but connect does not return DB instance', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);

            const mockConnect = new MockFn();
            mockConnect.mock(instance, 'connect');

            let val:string|boolean = false;
            try {
                await instance.dropCollection('mycollection');
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('Mongo@dropCollection: Failed to connect');
            expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
            expect(mockConsoleError.isEmpty).toBe(true);
            mockConnect.restore();
        });

        it('Should throw if passed valid payload and connecting, but dropCollection throws', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColDropMode('throw');

            const instance = new DBMongo(FULL_VALID_OPTS);
            let val:string|boolean = false;
            try {
                await instance.dropCollection('mycollection    ');
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('MockDb@dropCollection: Oh No!');
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(MockDb.calls).toEqual([
                {key: 'dropCollection', params: {name: 'mycollection'}},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
                ['[info] Mongo@connect: Connection established'],
                ['[warn] Mongo@dropCollection: Dropping collection', {collection: 'mycollection'}],
            ]);
            expect(mockConsoleError.isEmpty).toBe(true);
        });

        it('Should not throw and return false if passed valid payload and connecting, but dropCollection fails', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColDropMode('wrongret');

            const instance = new DBMongo(FULL_VALID_OPTS);
            const out = await instance.dropCollection('mycollection    ');
            expect(out).toBe(false);
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(MockDb.calls).toEqual([
                {key: 'dropCollection', params: {name: 'mycollection'}},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
                ['[info] Mongo@connect: Connection established'],
                ['[warn] Mongo@dropCollection: Dropping collection', {collection: 'mycollection'}],
                ['[warn] Mongo@dropCollection: Did not drop collection', {collection: 'mycollection'}],
            ]);
            expect(mockConsoleError.isEmpty).toBe(true);
        });

        it('Should not throw and return true if passed valid payload and connecting, and dropCollection succeeds', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColDropMode('success');

            const instance = new DBMongo(FULL_VALID_OPTS);
            const out = await instance.dropCollection('   foobar    ');
            expect(out).toBe(true);
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(MockDb.calls).toEqual([
                {key: 'dropCollection', params: {name: 'foobar'}},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
                ['[info] Mongo@connect: Connection established'],
                ['[warn] Mongo@dropCollection: Dropping collection', {collection: 'foobar'}],
                ['[warn] Mongo@dropCollection: Collection dropped', {collection: 'foobar'}],
            ]);
            expect(mockConsoleError.isEmpty).toBe(true);
        });
    });

    describe('hasIndex', () => {
        it('Should not be static', () => {
            /* @ts-ignore */
            expect(DBMongo.hasIndex).toBe(undefined);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should be an async function', () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            expect(Validator.rules.async_function(instance.hasIndex)).toBe(true);
            expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
            expect(MockClient.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
        });

        it('Should throw if not passed a string or passed an empty string collection name', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                let val:any = false;
                try {
                    await instance.hasIndex(el, 'myindex');
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('Mongo@hasIndex: Collection should be a non-empty string');
                expect(MockClient.isEmpty).toBe(true);
                expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                expect(mockConsoleError.isEmpty).toBe(true);
            }
        });

        it('Should throw if not passed a string or passed an empty string index name', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                let val:any = false;
                try {
                    await instance.hasIndex('mycollection', el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('Mongo@hasIndex: Index Name should be a non-empty string');
                expect(MockClient.isEmpty).toBe(true);
                expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                expect(mockConsoleError.isEmpty).toBe(true);
            }
        });

        it('Should throw if passed valid payload but connect fails due to throwing', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('throw');
            const instance = new DBMongo(FULL_VALID_OPTS);

            let val:string|boolean = false;
            try {
                await instance.hasIndex('mycollection', 'myindex');
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('MockClient@db: Oh No!');
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
            ]);
            expect(mockConsoleError.calls.length).toBe(1);
            expect(mockConsoleError.calls[0]![0] as string).toBe('[error] Mongo@connect: Failed to connect');
        });

        it('Should throw if passed valid payload but connect does not return DB instance', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);

            const mockConnect = new MockFn();
            mockConnect.mock(instance, 'connect');

            let val:string|boolean = false;
            try {
                await instance.hasIndex('mycollection', 'myindex');
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('Mongo@hasIndex: Failed to connect');
            expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
            expect(mockConsoleError.isEmpty).toBe(true);
            mockConnect.restore();
        });

        it('Should throw if passed valid payload and connecting, but collection throws', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColMode('throw');

            const instance = new DBMongo(FULL_VALID_OPTS);
            let val:string|boolean = false;
            try {
                await instance.hasIndex('mycollection    ', '  myindex  ');
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('MockDb@collection: Oh No!');
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(MockDb.calls).toEqual([
                {key: 'collection', params: {name: 'mycollection'}},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
                ['[info] Mongo@connect: Connection established'],
            ]);
            expect(mockConsoleError.isEmpty).toBe(true);
        });

        it('Should throw if passed valid payload and connecting, but indexExists throws', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColMode('success');
            MockDb.setDbColIdxExistsMode('throw');

            const instance = new DBMongo(FULL_VALID_OPTS);
            let val:string|boolean = false;
            try {
                await instance.hasIndex('mycollection    ', '  myindex  ');
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('MockDb@indexExists: Oh No!');
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(MockDb.calls).toEqual([
                {key: 'collection', params: {name: 'mycollection'}},
                {key: 'indexExists', params: {name: 'myindex'}},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
                ['[info] Mongo@connect: Connection established'],
            ]);
            expect(mockConsoleError.isEmpty).toBe(true);
        });

        it('Should return false if passed valid payload and connecting, but index does not exist', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColMode('success');
            MockDb.setDbColIdxExistsMode('wrongret');

            const instance = new DBMongo(FULL_VALID_OPTS);
            const out = await instance.hasIndex('mycollection    ', '  myindex  ');
            expect(out).toBe(false);
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(MockDb.calls).toEqual([
                {key: 'collection', params: {name: 'mycollection'}},
                {key: 'indexExists', params: {name: 'myindex'}},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
                ['[info] Mongo@connect: Connection established'],
                ['[info] Mongo@hasIndex: Index does not exist', {collection: 'mycollection', name: 'myindex'}],
            ]);
            expect(mockConsoleError.isEmpty).toBe(true);
        });

        it('Should return true if passed valid payload and connecting, and index exists', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColMode('success');
            MockDb.setDbColIdxExistsMode('success');

            const instance = new DBMongo(FULL_VALID_OPTS);
            const out = await instance.hasIndex('mycollection    ', '  myindex  ');
            expect(out).toBe(true);
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(MockDb.calls).toEqual([
                {key: 'collection', params: {name: 'mycollection'}},
                {key: 'indexExists', params: {name: 'myindex'}},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
                ['[info] Mongo@connect: Connection established'],
                ['[info] Mongo@hasIndex: Index exists', {collection: 'mycollection', name: 'myindex'}],
            ]);
            expect(mockConsoleError.isEmpty).toBe(true);
        });

        it('Should return true if passed valid payload and connecting, and index exists, and not log if debug off', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColMode('success');
            MockDb.setDbColIdxExistsMode('success');

            const instance = new DBMongo({...FULL_VALID_OPTS, debug: false});
            const out = await instance.hasIndex('mycollection    ', '  myindex  ');
            expect(out).toBe(true);
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(MockDb.calls).toEqual([
                {key: 'collection', params: {name: 'mycollection'}},
                {key: 'indexExists', params: {name: 'myindex'}},
            ]);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
        });
    });

    describe('createIndex', () => {
        it('Should not be static', () => {
            /* @ts-ignore */
            expect(DBMongo.createIndex).toBe(undefined);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should be an async function', () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            expect(Validator.rules.async_function(instance.createIndex)).toBe(true);
            expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
            expect(MockClient.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
        });

        it('Should throw if not passed a string or passed an empty string collection name', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                let val:any = false;
                try {
                    await instance.createIndex(el, 'myindex', {uid: 1});
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('Mongo@createIndex: Collection should be a non-empty string');
                expect(MockClient.isEmpty).toBe(true);
                expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                expect(mockConsoleError.isEmpty).toBe(true);
            }
        });

        it('Should throw if not passed a string or passed an empty string index name', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                let val:any = false;
                try {
                    await instance.createIndex('mycollection', el, {uid: 1});
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('Mongo@createIndex: Index Name should be a non-empty string');
                expect(MockClient.isEmpty).toBe(true);
                expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                expect(mockConsoleError.isEmpty).toBe(true);
            }
        });

        it('Should throw if not passed a spec or passed an empty spec object', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                let val:any = false;
                try {
                    await instance.createIndex('mycollection', 'uid_asc', el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('Mongo@createIndex: Invalid spec passed');
                expect(MockClient.isEmpty).toBe(true);
                expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                expect(mockConsoleError.isEmpty).toBe(true);
            }
        });

        it('Should throw if passed a spec with invalid types (boolean/null)', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of [true, false, null, undefined]) {
                let val:any = false;
                try {
                    // @ts-ignore testing invalid runtime input
                    await instance.createIndex('mycollection', 'uid_asc', {uid: el});
                } catch (err) {
                    val = err.message;
                }
                expect(val).toBe('Mongo@createIndex: Invalid spec passed');
            }
        });

        it('Should throw if passed a partially valid spec', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of [0, false, -10000, 10000]) {
                let val:any = false;
                try {
                    await instance.createIndex('mycollection', 'uid_asc', {uid: 1, name: el as any});
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('Mongo@createIndex: Invalid spec passed');
                expect(MockClient.isEmpty).toBe(true);
                expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                expect(mockConsoleError.isEmpty).toBe(true);
            }
        });

        it('Should throw if passed options that are not an object', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === undefined) continue;
                let val:any = false;
                try {
                    await instance.createIndex('mycollection', 'uid_asc', {uid: 1, name: 1}, el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('Mongo@createIndex: Options should be an object');
                expect(MockClient.isEmpty).toBe(true);
                expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                expect(mockConsoleError.isEmpty).toBe(true);
            }
        });

        it('Should throw if passed valid payload but connect fails due to throwing', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('throw');
            const instance = new DBMongo(FULL_VALID_OPTS);

            let val:string|boolean = false;
            try {
                await instance.createIndex('mycollection', 'uid_asc', {uid: 1, name: 1}, {expireAfterSeconds: 90});
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('MockClient@db: Oh No!');
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
            ]);
            expect(mockConsoleError.calls.length).toBe(1);
            expect(mockConsoleError.calls[0]![0] as string).toBe('[error] Mongo@connect: Failed to connect');
        });

        it('Should throw if passed valid payload but connect does not return DB instance', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);

            const mockConnect = new MockFn();
            mockConnect.mock(instance, 'connect');

            let val:string|boolean = false;
            try {
                await instance.createIndex('mycollection', 'uid_asc', {uid: 1, name: 1}, {expireAfterSeconds: 90});
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('Mongo@createIndex: Failed to connect');
            expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
            mockConnect.restore();
            expect(mockConsoleError.isEmpty).toBe(true);
        });

        it('Should throw if passed valid payload and connecting, but collection throws', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColMode('throw');

            const instance = new DBMongo(FULL_VALID_OPTS);
            let val:string|boolean = false;
            try {
                await instance.createIndex('mycollection', 'uid_asc', {uid: 1, name: 1}, {expireAfterSeconds: 90});
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('MockDb@collection: Oh No!');
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(MockDb.calls).toEqual([
                {key: 'collection', params: {name: 'mycollection'}},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
                ['[info] Mongo@connect: Connection established'],
                ['[info] Mongo@createIndex: Creating index', {
                    collection: 'mycollection',
                    name: 'uid_asc',
                    options: {expireAfterSeconds: 90},
                    spec: {uid: 1, name: 1},
                }],
            ]);
            expect(mockConsoleError.isEmpty).toBe(true);
        });

        it('Should throw if passed valid payload and connecting, but createIndex throws', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColMode('success');
            MockDb.setDbColIdxCreateMode('throw');

            const instance = new DBMongo(FULL_VALID_OPTS);
            let val:string|boolean = false;
            try {
                await instance.createIndex('mycollection', 'uid_asc', {uid: 1, name: 1}, {expireAfterSeconds: 90});
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('MockDb@createIndex: Oh No!');
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(MockDb.calls).toEqual([
                {key: 'collection', params: {name: 'mycollection'}},
                {key: 'createIndex', params: {indexSpec: {name: 1, uid: 1}, options: {name: 'uid_asc', expireAfterSeconds: 90}}},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
                ['[info] Mongo@connect: Connection established'],
                ['[info] Mongo@createIndex: Creating index', {
                    collection: 'mycollection',
                    name: 'uid_asc',
                    options: {expireAfterSeconds: 90},
                    spec: {uid: 1, name: 1},
                }],
            ]);
            expect(mockConsoleError.isEmpty).toBe(true);
        });

        it('Should return false if passed valid payload and connecting, but index does not exist', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColMode('success');
            MockDb.setDbColIdxCreateMode('wrongret');

            const instance = new DBMongo(FULL_VALID_OPTS);
            const out = await instance.createIndex('   mycollection  ', 'uid_asc   ', {uid: 1, name: 1}, {expireAfterSeconds: 90});
            expect(out).toBe(false);
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(MockDb.calls).toEqual([
                {key: 'collection', params: {name: 'mycollection'}},
                {key: 'createIndex', params: {indexSpec: {name: 1, uid: 1}, options: {name: 'uid_asc', expireAfterSeconds: 90}}},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
                ['[info] Mongo@connect: Connection established'],
                ['[info] Mongo@createIndex: Creating index', {
                    collection: 'mycollection',
                    name: 'uid_asc',
                    options: {expireAfterSeconds: 90},
                    spec: {uid: 1, name: 1},
                }],
            ]);
            expect(mockConsoleError.calls.length).toBe(1);
            expect(mockConsoleError.calls[0]![0] as string).toBe('[error] Mongo@createIndex: Failed to create index');
        });

        it('Should return true if passed valid payload and connecting, and index exists', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColMode('success');
            MockDb.setDbColIdxCreateMode('success');

            const instance = new DBMongo(FULL_VALID_OPTS);
            const out = await instance.createIndex(' mycollection ', '  uid_asc', {uid: 1, name: 1});
            expect(out).toBe(true);
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(MockDb.calls).toEqual([
                {key: 'collection', params: {name: 'mycollection'}},
                {key: 'createIndex', params: {indexSpec: {name: 1, uid: 1}, options: {name: 'uid_asc'}}},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
                ['[info] Mongo@connect: Connection established'],
                ['[info] Mongo@createIndex: Creating index', {
                    collection: 'mycollection',
                    name: 'uid_asc',
                    options: {},
                    spec: {uid: 1, name: 1},
                }],
                ['[info] Mongo@createIndex: Index created', {
                    collection: 'mycollection',
                    name: 'uid_asc',
                    options: {},
                    spec: {uid: 1, name: 1},
                }],
            ]);
            expect(mockConsoleError.isEmpty).toBe(true);
        });

        it('Should accept special index types (text, 2dsphere) and pass them to DB', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColMode('success');
            MockDb.setDbColIdxCreateMode('success');

            const instance = new DBMongo(FULL_VALID_OPTS);

            const res = await instance.createIndex('mycollection', 'geo_text_idx', {
                description: 'text',
                location: '2dsphere',
            });

            expect(res).toBe(true);

            // Verify call reached MockDb
            expect(MockDb.calls).toContainEqual({
                key: 'createIndex',
                params: {
                    indexSpec: {description: 'text', location: '2dsphere'},
                    options: {name: 'geo_text_idx'},
                },
            });
        });
    });

    describe('dropIndex', () => {
        it('Should not be static', () => {
            /* @ts-ignore */
            expect(DBMongo.dropIndex).toBe(undefined);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should be an async function', () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            expect(Validator.rules.async_function(instance.dropIndex)).toBe(true);
            expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
            expect(MockClient.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
        });

        it('Should throw if not passed a string or passed an empty string collection name', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                let val:any = false;
                try {
                    await instance.dropIndex(el, 'myindex');
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('Mongo@dropIndex: Collection should be a non-empty string');
                expect(MockClient.isEmpty).toBe(true);
                expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                expect(mockConsoleError.isEmpty).toBe(true);
            }
        });

        it('Should throw if not passed a string or passed an empty string index name', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                let val:any = false;
                try {
                    await instance.dropIndex('mycollection', el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('Mongo@dropIndex: Index Name should be a non-empty string');
                expect(MockClient.isEmpty).toBe(true);
                expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                expect(mockConsoleError.isEmpty).toBe(true);
            }
        });

        it('Should throw if passed valid payload but connect fails due to throwing', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('throw');
            const instance = new DBMongo(FULL_VALID_OPTS);

            let val:string|boolean = false;
            try {
                await instance.dropIndex('mycollection', 'myindex');
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('MockClient@db: Oh No!');
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
            ]);

            expect(mockConsoleError.calls.length).toBe(1);
            expect(mockConsoleError.calls[0]![0] as string).toBe('[error] Mongo@connect: Failed to connect');
        });

        it('Should throw if passed valid payload but connect does not return DB instance', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);

            const mockConnect = new MockFn();
            mockConnect.mock(instance, 'connect');

            let val:string|boolean = false;
            try {
                await instance.dropIndex('mycollection', 'myindex');
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('Mongo@dropIndex: Failed to connect');
            expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
            mockConnect.restore();
            expect(mockConsoleError.isEmpty).toBe(true);
        });

        it('Should return false if passed valid payload and connecting, but collection throws', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColMode('throw');

            const instance = new DBMongo(FULL_VALID_OPTS);
            const out = await instance.dropIndex('mycollection    ', '  myindex  ');
            expect(out).toBe(false);
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(MockDb.calls).toEqual([
                {key: 'collection', params: {name: 'mycollection'}},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
                ['[info] Mongo@connect: Connection established'],
                ['[info] Mongo@dropIndex: Dropping index', {collection: 'mycollection', name: 'myindex'}],
            ]);
            expect(mockConsoleError.calls.length).toBe(1);
            expect(mockConsoleError.calls[0]![0] as string).toBe('[error] Mongo@dropIndex: Failed to drop index');
        });

        it('Should return false if passed valid payload and connecting, but dropIndex throws', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColMode('success');
            MockDb.setDbColIdxDropMode('throw');

            const instance = new DBMongo(FULL_VALID_OPTS);
            const out = await instance.dropIndex('mycollection    ', '  myindex  ');
            expect(out).toBe(false);
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(MockDb.calls).toEqual([
                {key: 'collection', params: {name: 'mycollection'}},
                {key: 'dropIndex', params: {name: 'myindex'}},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
                ['[info] Mongo@connect: Connection established'],
                ['[info] Mongo@dropIndex: Dropping index', {collection: 'mycollection', name: 'myindex'}],
            ]);
            expect(mockConsoleError.calls.length).toBe(1);
            expect(mockConsoleError.calls[0]![0] as string).toBe('[error] Mongo@dropIndex: Failed to drop index');
        });

        it('Should return true if passed valid payload and connecting, and dropIndex succeeds', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColMode('success');
            MockDb.setDbColIdxDropMode('success');

            const instance = new DBMongo(FULL_VALID_OPTS);
            const out = await instance.dropIndex('mycollection    ', '  myindex  ');
            expect(out).toBe(true);
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(MockDb.calls).toEqual([
                {key: 'collection', params: {name: 'mycollection'}},
                {key: 'dropIndex', params: {name: 'myindex'}},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
                ['[info] Mongo@connect: Connection established'],
                ['[info] Mongo@dropIndex: Dropping index', {collection: 'mycollection', name: 'myindex'}],
                ['[info] Mongo@dropIndex: Index dropped', {collection: 'mycollection', name: 'myindex'}],
            ]);
            expect(mockConsoleError.isEmpty).toBe(true);
        });
    });

    describe('query', () => {
        it('Should not be static', () => {
            /* @ts-ignore */
            expect(DBMongo.query).toBe(undefined);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should not be an async function', () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            expect(Validator.rules.function(instance.query)).toBe(true);
            expect(Validator.rules.async_function(instance.query)).toBe(false);
            expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
            expect(MockClient.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
        });

        it('Should throw if not passed a string or passed an empty string collection name', () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                let val:string|boolean = false;
                try {
                    instance.query(el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('Mongo@query: Collection should be a non-empty string');
                expect(MockClient.isEmpty).toBe(true);
                expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
                expect(mockConsoleError.isEmpty).toBe(true);
            }
        });

        it('Should return an instance of Query when passed a valid collection name', () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            const q = instance.query('  mycollection   ');
            expect(q instanceof Query).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
        });

        it('Should pass the correct data to Query', async () => {
            MockClient.setDbMode('success');
            MockClient.setConnectMode('success');
            MockDb.setDbColMode('mock');
            const mock_col = new MockCollection('mycollection');
            mock_col.setColAggregate('success');
            MockDb.setMockCol(mock_col);

            const instance = new DBMongo(FULL_VALID_OPTS);
            const out = await instance.query('  mycollection  ').aggregate([{$match: {hello: 'world'}}]);
            expect(out).toEqual([{bla: 'bla'}]);
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {name: 'main', opts: {readPreference: 'nearest', retryWrites: true}}},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
                ['[info] Mongo@connect: Connection established'],
            ]);
            expect(MockDb.calls).toEqual([
                {key: 'collection', params: {name: 'mycollection'}},
            ]);
            expect(mock_col.calls).toEqual([
                {key: 'aggregate', params: {options: {}, pipeline: [{$match: {hello: 'world'}}]}},
            ]);
            expect(mockConsoleError.isEmpty).toBe(true);
        });
    });

    describe('aggregate', () => {
        it('Should not be static', () => {
            /* @ts-ignore */
            expect(DBMongo.aggregate).toBe(undefined);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should not be an async function', () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            expect(Validator.rules.function(instance.aggregate)).toBe(true);
            expect(Validator.rules.async_function(instance.aggregate)).toBe(true);
            expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
            expect(MockClient.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
        });

        it('Should throw if not passed a string or passed an empty string collection name', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                let val:string|boolean = false;
                try {
                    /* @ts-ignore */
                    await instance.aggregate(el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('Mongo@aggregate: Collection should be a non-empty string');
                expect(MockClient.isEmpty).toBe(true);
                expect(mockConsoleError.isEmpty).toBe(true);
                expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
            }
        });

        it('Should throw if not passed a pipeline array or passed an empty pipeline array', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of CONSTANTS.NOT_ARRAY_WITH_EMPTY) {
                let val:string|boolean = false;
                try {
                    await instance.aggregate('test', el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('Mongo@aggregate: Pipeline should be a non-empty array');
                expect(MockClient.isEmpty).toBe(true);
                expect(mockConsoleError.isEmpty).toBe(true);
                expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
            }
        });

        it('Should throw if passed a pipeline array consisting solely of non/empty objects', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            let val:string|boolean = false;
            try {
                await instance.aggregate('test', CONSTANTS.NOT_OBJECT_WITH_EMPTY);
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('Mongo@aggregate: Pipeline empty after sanitization');
            expect(MockClient.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
        });

        it('Should not throw and return query aggregate if passed a pipeline array consisting of some non/empty objects', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColMode('mock');
            const mock_col = new MockCollection('mycollection');
            mock_col.setColAggregate('success');
            MockDb.setMockCol(mock_col);

            const instance = new DBMongo(FULL_VALID_OPTS);
            await instance.aggregate('mycollection', [
                {$match: {name: {$eq: 'peter'}}},
                ...CONSTANTS.NOT_OBJECT_WITH_EMPTY,
                {$count: 'tally'},
            ]);
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
                ['[info] Mongo@connect: Connection established'],
            ]);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockDb.calls).toEqual([
                {key: 'collection', params: {name: 'mycollection'}},
            ]);
            expect(mock_col.calls).toEqual([
                {key: 'aggregate', params: {options: {}, pipeline: [{$match: {name: {$eq: 'peter'}}}, {$count: 'tally'}]}},
            ]);
        });
    });

    describe('close', () => {
        it('Should not be static', () => {
            /* @ts-ignore */
            expect(DBMongo.close).toBe(undefined);
            expect(mockConsoleInfo.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(MockClient.isEmpty).toBe(true);
        });

        it('Should be an async function', () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            expect(Validator.rules.async_function(instance.close)).toBe(true);
            expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
            expect(MockClient.isEmpty).toBe(true);
            expect(mockConsoleError.isEmpty).toBe(true);
        });

        it('Should not do anything and be successful if client is not connected', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            let val:string|boolean = false;
            try {
                await instance.close();
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe(false);
            expect(MockClient.isEmpty).toBe(true);
            expect(mockConsoleInfo.calls).toEqual([['[info] Mongo@ctor: Instantiated']]);
            expect(mockConsoleError.isEmpty).toBe(true);
        });

        it('Should throw and not de disconnected if calling client close throws', async () => {
            MockClient.setCloseMode('throw');
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            const instance = new DBMongo(FULL_VALID_OPTS);

            expect(instance.isConnected).toBe(false);

            await instance.connect();

            expect(instance.isConnected).toBe(true);

            let val:string|boolean = false;
            try {
                await instance.close();
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe(false);
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
                {key: 'close', params: {}},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
                ['[info] Mongo@connect: Connection established'],
                ['[info] Mongo@close: Closing connection'],
            ]);

            expect(mockConsoleError.calls.length).toBe(1);
            expect(mockConsoleError.calls[0]![0] as string).toBe('[error] Mongo@close: Failed to terminate');
            expect(instance.isConnected).toBe(true);
        });

        it('Should not throw and de disconnected if calling client closes successfully', async () => {
            MockClient.setCloseMode('success');
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            const instance = new DBMongo(FULL_VALID_OPTS);

            expect(instance.isConnected).toBe(false);

            await instance.connect();

            expect(instance.isConnected).toBe(true);

            let val:string|boolean = false;
            try {
                await instance.close();
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe(false);
            expect(MockClient.calls).toEqual([
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
                {key: 'close', params: {}},
            ]);
            expect(mockConsoleInfo.calls).toEqual([
                ['[info] Mongo@ctor: Instantiated'],
                ['[info] Mongo@connect: Establishing connection'],
                ['[info] Mongo@connect: Connection established'],
                ['[info] Mongo@close: Closing connection'],
                ['[info] Mongo@close: Connection Terminated'],
            ]);
            expect(mockConsoleError.isEmpty).toBe(true);
            expect(instance.isConnected).toBe(false);
        });
    });

    describe('withTransaction', () => {
        it('Should not be static', () => {
            /* @ts-ignore */
            expect(DBMongo.withTransaction).toBe(undefined);
        });

        it('Should throw if not connected (client unavailable)', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            MockClient.setConnectMode('wrongret');

            let val;
            try {
                await instance.withTransaction(async () => {});
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('Mongo@connect: Failed to create client pool');
        });

        it('Should start a session, execute callback, and end session', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');

            const result = await instance.withTransaction(async session => {
                expect(session).toBeDefined();
                return 'txn_success';
            });

            expect(result).toBe('txn_success');
            const calls = MockClient.calls;

            const hasStart = calls.some((c:any) => c.key === 'startSession');
            const hasTxn = calls.some((c:any) => c.key === 'withTransaction');
            const hasEnd = calls.some((c:any) => c.key === 'endSession');

            expect(hasStart).toBe(true);
            expect(hasTxn).toBe(true);
            expect(hasEnd).toBe(true);
        });

        it('Should throw/bubble error if transaction fails', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            MockClient.setConnectMode('success');
            MockClient.setTxnMode('throw'); // Simulate withTransaction failure in driver

            let val;
            try {
                await instance.withTransaction(async () => 'should fail');
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('MockClient@withTransaction: Aborted');

            // Should still attempt to end session (MockClient implementation simply pushes calls)
            const hasEnd = MockClient.calls.some((c:any) => c.key === 'endSession');
            expect(hasEnd).toBe(true);
        });
    });
});
