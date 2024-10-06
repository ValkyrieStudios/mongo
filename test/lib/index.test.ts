/* eslint-disable max-lines */

import Validator                                from '@valkyriestudios/validator';
import {describe, it, beforeEach, afterEach}    from 'node:test';
import * as assert                              from 'node:assert/strict';
import DBMongo, {MongoOptions}                  from '../../lib';
import Query                                    from '../../lib/Query';
import CONSTANTS                                from '../constants';
import MockFn                                   from '../MockFn';
import MockClient                               from '../MockClient';
import {Db}                                     from 'mongodb';
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

describe('Index', () => {
    const mockConsoleInfo = new MockFn();

    beforeEach(() => {
        mockConsoleInfo.mock(console, 'info');
        MockClient.mock();
    });

    afterEach(() => {
        mockConsoleInfo.restore();
        MockClient.restore();
    });

    describe('ctor', () => {
        it('Should throw when not provided anything', () => {
            assert.throws(
                /* @ts-ignore */
                () => new DBMongo(),
                new Error('Mongo@ctor: options should be an object')
            );
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should throw when not passed an object or provided with an empty object', () => {
            for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                assert.throws(
                    /* @ts-ignore */
                    () => new DBMongo(el),
                    new Error('Mongo@ctor: options should be an object')
                );
            }
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should not throw when provided with valid options', () => {
            assert.doesNotThrow(() => new DBMongo(FULL_VALID_OPTS));
            assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            assert.deepEqual(MockClient.calls, []);
        });

        describe('option: debug', () => {
            it('Should throw when passed as a non-boolean', () => {
                for (const el of CONSTANTS.NOT_BOOLEAN) {
                    assert.throws(
                        /* @ts-ignore */
                        () => new DBMongo({...FULL_VALID_OPTS, ...{debug: el}}),
                        new Error('Mongo@ctor: options are invalid')
                    );
                }
                assert.deepEqual(mockConsoleInfo.calls, []);
                assert.deepEqual(MockClient.calls, []);
            });

            it('Should not throw when not passed and not log by default', () => {
                const opts:any = {...FULL_VALID_OPTS};
                delete opts.debug;
                assert.doesNotThrow(() => new DBMongo(opts));
                assert.deepEqual(mockConsoleInfo.calls, []);
                assert.deepEqual(MockClient.calls, []);
            });

            it('Should not log if debug is passed as false', () => {
                assert.doesNotThrow(() => new DBMongo({...FULL_VALID_OPTS, ...{debug: false}}));
                assert.deepEqual(mockConsoleInfo.calls, []);
                assert.deepEqual(MockClient.calls, []);
            });

            it('Should log if debug is enabled', () => {
                assert.doesNotThrow(() => new DBMongo({...FULL_VALID_OPTS, ...{debug: true}}));
                assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
                assert.deepEqual(MockClient.calls, []);
            });
        });

        describe('option: pool_size', () => {
            it('Should throw when passed as a non-integer', () => {
                for (const el of CONSTANTS.NOT_INTEGER) {
                    assert.throws(
                        /* @ts-ignore */
                        () => new DBMongo({...FULL_VALID_OPTS, ...{pool_size: el}}),
                        new Error('Mongo@ctor: options are invalid')
                    );
                }
                assert.deepEqual(mockConsoleInfo.calls, []);
                assert.deepEqual(MockClient.calls, []);
            });

            it('Should throw when passed as a number above 100', () => {
                for (const el of [101, 1000, 99999]) {
                    assert.throws(
                        /* @ts-ignore */
                        () => new DBMongo({...FULL_VALID_OPTS, ...{pool_size: el}}),
                        new Error('Mongo@ctor: options are invalid')
                    );
                }
                assert.deepEqual(mockConsoleInfo.calls, []);
                assert.deepEqual(MockClient.calls, []);
            });

            it('Should throw when passed as a number below 1', () => {
                for (const el of [0, -1, -101, -1000, -99999]) {
                    assert.throws(
                        /* @ts-ignore */
                        () => new DBMongo({...FULL_VALID_OPTS, ...{pool_size: el}}),
                        new Error('Mongo@ctor: options are invalid')
                    );
                }
                assert.deepEqual(mockConsoleInfo.calls, []);
                assert.deepEqual(MockClient.calls, []);
            });

            it('Should not throw when not passed', () => {
                const opts:any = {...FULL_VALID_OPTS};
                delete opts.pool_size;
                assert.doesNotThrow(() => new DBMongo(opts));
                assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
                assert.deepEqual(MockClient.calls, []);
            });
        });

        describe('option: host', () => {
            it('Should throw when passed as a non-string or empty string', () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    assert.throws(
                        /* @ts-ignore */
                        () => new DBMongo({...FULL_VALID_OPTS, ...{host: el}}),
                        new Error('Mongo@ctor: options are invalid')
                    );
                }
                assert.deepEqual(mockConsoleInfo.calls, []);
                assert.deepEqual(MockClient.calls, []);
            });

            it('Should not throw when not passed', () => {
                const opts:any = {...FULL_VALID_OPTS};
                delete opts.host;
                assert.doesNotThrow(() => new DBMongo(opts));
                assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
                assert.deepEqual(MockClient.calls, []);
            });
        });

        describe('option: user', () => {
            it('Should throw when passed as a non-string or empty string', () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    assert.throws(
                        /* @ts-ignore */
                        () => new DBMongo({...FULL_VALID_OPTS, ...{user: el}}),
                        new Error('Mongo@ctor: options are invalid')
                    );
                }
                assert.deepEqual(mockConsoleInfo.calls, []);
                assert.deepEqual(MockClient.calls, []);
            });

            it('Should throw when not passed', () => {
                const opts:any = {...FULL_VALID_OPTS};
                delete opts.user;
                assert.throws(
                    () => new DBMongo(opts),
                    new Error('Mongo@ctor: options are invalid')
                );
                assert.deepEqual(mockConsoleInfo.calls, []);
                assert.deepEqual(MockClient.calls, []);
            });
        });

        describe('option: pass', () => {
            it('Should throw when passed as a non-string or empty string', () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    assert.throws(
                        /* @ts-ignore */
                        () => new DBMongo({...FULL_VALID_OPTS, ...{pass: el}}),
                        new Error('Mongo@ctor: options are invalid')
                    );
                }
                assert.deepEqual(mockConsoleInfo.calls, []);
                assert.deepEqual(MockClient.calls, []);
            });

            it('Should throw when not passed', () => {
                const opts:any = {...FULL_VALID_OPTS};
                delete opts.pass;
                assert.throws(
                    () => new DBMongo(opts),
                    new Error('Mongo@ctor: options are invalid')
                );
                assert.deepEqual(mockConsoleInfo.calls, []);
                assert.deepEqual(MockClient.calls, []);
            });
        });

        describe('option: db', () => {
            it('Should throw when passed as a non-string or empty string', () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    assert.throws(
                        /* @ts-ignore */
                        () => new DBMongo({...FULL_VALID_OPTS, ...{db: el}}),
                        new Error('Mongo@ctor: options are invalid')
                    );
                }
                assert.deepEqual(mockConsoleInfo.calls, []);
                assert.deepEqual(MockClient.calls, []);
            });

            it('Should throw when not passed', () => {
                const opts:any = {...FULL_VALID_OPTS};
                delete opts.db;
                assert.throws(
                    () => new DBMongo(opts),
                    new Error('Mongo@ctor: options are invalid')
                );
                assert.deepEqual(mockConsoleInfo.calls, []);
                assert.deepEqual(MockClient.calls, []);
            });
        });

        describe('option: auth_db', () => {
            it('Should throw when passed as a non-string or empty string', () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    assert.throws(
                        /* @ts-ignore */
                        () => new DBMongo({...FULL_VALID_OPTS, ...{auth_db: el}}),
                        new Error('Mongo@ctor: options are invalid')
                    );
                }
                assert.deepEqual(mockConsoleInfo.calls, []);
                assert.deepEqual(MockClient.calls, []);
            });

            it('Should not throw when not passed', () => {
                const opts:any = {...FULL_VALID_OPTS};
                delete opts.auth_db;
                assert.doesNotThrow(() => new DBMongo(opts));
                assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
                assert.deepEqual(MockClient.calls, []);
            });
        });

        describe('option: replset', () => {
            it('Should throw when passed as a non-string, non-false or empty string', () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    if (el === false) continue;
                    assert.throws(
                        /* @ts-ignore */
                        () => new DBMongo({...FULL_VALID_OPTS, ...{replset: el}}),
                        new Error('Mongo@ctor: options are invalid')
                    );
                }

                assert.throws(
                    /* @ts-ignore */
                    () => new DBMongo({...FULL_VALID_OPTS, ...{replset: true}}),
                    new Error('Mongo@ctor: options are invalid')
                );
                assert.deepEqual(mockConsoleInfo.calls, []);
                assert.deepEqual(MockClient.calls, []);
            });

            it('Should not throw when not passed', () => {
                const opts:any = {...FULL_VALID_OPTS};
                delete opts.replset;
                assert.doesNotThrow(() => new DBMongo(opts));
                assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
                assert.deepEqual(MockClient.calls, []);
            });
        });

        describe('option: protocol', () => {
            it('Should throw when passed as a non-string or empty string', () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    assert.throws(
                        /* @ts-ignore */
                        () => new DBMongo({...FULL_VALID_OPTS, ...{protocol: el}}),
                        new Error('Mongo@ctor: options are invalid')
                    );
                }
                assert.deepEqual(mockConsoleInfo.calls, []);
                assert.deepEqual(MockClient.calls, []);
            });

            it('Should throw when passed as a random string that is not in the set of options', () => {
                for (const el of ['foo', 'bar', 'hello world']) {
                    assert.throws(
                        /* @ts-ignore */
                        () => new DBMongo({...FULL_VALID_OPTS, ...{protocol: el}}),
                        new Error('Mongo@ctor: options are invalid')
                    );
                }
                assert.deepEqual(mockConsoleInfo.calls, []);
                assert.deepEqual(MockClient.calls, []);
            });

            it('Should not throw when passed as a valid ReadPreference', () => {
                for (const el of Object.values(Protocols)) {
                    assert.doesNotThrow(() => new DBMongo({...FULL_VALID_OPTS, protocol: el}));
                    assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
                    assert.deepEqual(MockClient.calls, []);
                    mockConsoleInfo.reset();
                }
            });

            it('Should not throw when not passed', () => {
                const opts:any = {...FULL_VALID_OPTS};
                delete opts.protocol;
                assert.doesNotThrow(() => new DBMongo(opts));
                assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
                assert.deepEqual(MockClient.calls, []);
            });
        });

        describe('option: read_preference', () => {
            it('Should throw when passed as a non-string or empty string', () => {
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    assert.throws(
                        /* @ts-ignore */
                        () => new DBMongo({...FULL_VALID_OPTS, ...{read_preference: el}}),
                        new Error('Mongo@ctor: options are invalid')
                    );
                }
                assert.deepEqual(mockConsoleInfo.calls, []);
                assert.deepEqual(MockClient.calls, []);
            });

            it('Should throw when passed as a random string that is not in the set of options', () => {
                for (const el of ['foo', 'bar', 'hello world']) {
                    assert.throws(
                        /* @ts-ignore */
                        () => new DBMongo({...FULL_VALID_OPTS, ...{read_preference: el}}),
                        new Error('Mongo@ctor: options are invalid')
                    );
                }
                assert.deepEqual(mockConsoleInfo.calls, []);
                assert.deepEqual(MockClient.calls, []);
            });

            it('Should not throw when passed as a valid ReadPreference', () => {
                for (const el of Object.values(ReadPreferences)) {
                    assert.doesNotThrow(() => new DBMongo({...FULL_VALID_OPTS, read_preference: el}));
                    assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
                    assert.deepEqual(MockClient.calls, []);
                    mockConsoleInfo.reset();
                }
            });

            it('Should not throw when not passed', () => {
                const opts:any = {...FULL_VALID_OPTS};
                delete opts.read_preference;
                assert.doesNotThrow(() => new DBMongo(opts));
                assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
                assert.deepEqual(MockClient.calls, []);
            });
        });

        describe('option: retry_reads', () => {
            it('Should throw when passed as a non-boolean', () => {
                for (const el of CONSTANTS.NOT_BOOLEAN) {
                    assert.throws(
                        /* @ts-ignore */
                        () => new DBMongo({...FULL_VALID_OPTS, ...{retry_reads: el}}),
                        new Error('Mongo@ctor: options are invalid')
                    );
                }
                assert.deepEqual(mockConsoleInfo.calls, []);
                assert.deepEqual(MockClient.calls, []);
            });

            it('Should not throw when not passed', () => {
                const opts:any = {...FULL_VALID_OPTS};
                delete opts.retry_reads;
                assert.doesNotThrow(() => new DBMongo(opts));
                assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
                assert.deepEqual(MockClient.calls, []);
            });
        });

        describe('option: retry_writes', () => {
            it('Should throw when passed as a non-boolean', () => {
                for (const el of CONSTANTS.NOT_BOOLEAN) {
                    assert.throws(
                        /* @ts-ignore */
                        () => new DBMongo({...FULL_VALID_OPTS, ...{retry_writes: el}}),
                        new Error('Mongo@ctor: options are invalid')
                    );
                }
                assert.deepEqual(mockConsoleInfo.calls, []);
                assert.deepEqual(MockClient.calls, []);
            });

            it('Should not throw when not passed', () => {
                const opts:any = {...FULL_VALID_OPTS};
                delete opts.retry_writes;
                assert.doesNotThrow(() => new DBMongo(opts));
                assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
                assert.deepEqual(MockClient.calls, []);
            });
        });
    });

    describe('GET uid', () => {
        it('Should exist', () => {
            const instance = new DBMongo({user: 'peter', pass: 'mysecretpassword', db: 'main'});
            assert.equal(instance.uid, 'mongodb:2036634067');
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should be a getter', () => {
            const instance = new DBMongo({user: 'peter', pass: 'mysecret', db: 'main'});
            assert.equal(instance.uid, 'mongodb:1156494214');
            /* @ts-ignore */
            instance.uid = 'bla';
            assert.equal(instance.uid, 'mongodb:1156494214');
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should be the same every time', () => {
            for (let i = 0; i < 1000; i++) {
                const instance = new DBMongo({user: 'peter', pass: 'mysecretpassword', db: 'main'});
                assert.equal(instance.uid, 'mongodb:2036634067');
                assert.deepEqual(mockConsoleInfo.calls, []);
                assert.deepEqual(MockClient.calls, []);
                mockConsoleInfo.reset();
            }
        });

        it('Should be the same for different instances with the same configuration', () => {
            const instance = new DBMongo({user: 'peter', pass: 'mysecretpassword', db: 'main'});
            const instance2 = new DBMongo({user: 'peter', pass: 'mysecretpassword', db: 'main'});
            assert.equal(instance.uid, instance2.uid);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should be different if host differs', () => {
            const instance = new DBMongo({host: '127.0.0.1:8083', user: 'peter', pass: 'thisistrulysecret', db: 'main'});
            const instance2 = new DBMongo({host: '127.0.0.1:8082', user: 'peter', pass: 'thisistrulysecret', db: 'main'});
            assert.equal(instance.uid, 'mongodb:355260832');
            assert.notEqual(instance.uid, instance2.uid);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should be different if user differs', () => {
            const instance = new DBMongo({host: '127.0.0.1:8082', user: 'peter', pass: 'thisistrulysecret', db: 'main'});
            const instance2 = new DBMongo({host: '127.0.0.1:8082', user: 'jake', pass: 'thisistrulysecret', db: 'main'});
            assert.equal(instance.uid, 'mongodb:669723387');
            assert.notEqual(instance.uid, instance2.uid);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should be different if pass differs', () => {
            const instance = new DBMongo({host: '127.0.0.1:8082', user: 'admin', pass: 'root', db: 'main'});
            const instance2 = new DBMongo({host: '127.0.0.1:8082', user: 'admin', pass: 'rot', db: 'main'});
            assert.equal(instance.uid, 'mongodb:2773005600');
            assert.notEqual(instance.uid, instance2.uid);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should be different if auth_db differs', () => {
            const instance = new DBMongo({host: '127.0.0.1:8082', user: 'admin', pass: 'root', auth_db: 'admin', db: 'main'});
            const instance2 = new DBMongo({host: '127.0.0.1:8082', user: 'admin', pass: 'root', auth_db: 'someother', db: 'main'});
            assert.equal(instance.uid, 'mongodb:2773005600');
            assert.notEqual(instance.uid, instance2.uid);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should be different if db differs', () => {
            const instance = new DBMongo({user: 'admin', pass: 'root', db: 'main'});
            const instance2 = new DBMongo({user: 'admin', pass: 'root', db: 'identity'});
            assert.equal(instance.uid, 'mongodb:2283077747');
            assert.notEqual(instance.uid, instance2.uid);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should be different if protocol differs', () => {
            const instance = new DBMongo({user: 'admin', pass: 'root', db: 'main', protocol: 'mongodb+srv'});
            const instance2 = new DBMongo({user: 'admin', pass: 'root', db: 'main', protocol: 'mongodb'});
            assert.equal(instance.uid, 'mongodb:703732625');
            assert.notEqual(instance.uid, instance2.uid);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should be different if the replset differs', () => {
            const instance = new DBMongo({user: 'admin', pass: 'root', replset: 'cluster1', db: 'main'});
            const instance2 = new DBMongo({user: 'admin', pass: 'root', replset: 'cluster2', db: 'main'});
            assert.equal(instance.uid, 'mongodb:1638644854');
            assert.notEqual(instance.uid, instance2.uid);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should be the same if debug differs but the rest is the same', () => {
            const instance = new DBMongo({user: 'admin', pass: 'root', db: 'main', debug: false});
            const instance2 = new DBMongo({user: 'admin', pass: 'root', db: 'main', debug: true});
            assert.equal(instance.uid, 'mongodb:2283077747');
            assert.equal(instance.uid, instance2.uid);
            assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should be the same if pool_size differs but the rest is the same', () => {
            const instance = new DBMongo({user: 'admin', pass: 'root', db: 'main', pool_size: 20});
            const instance2 = new DBMongo({user: 'admin', pass: 'root', db: 'main', pool_size: 25});
            assert.equal(instance.uid, 'mongodb:2283077747');
            assert.equal(instance.uid, instance2.uid);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should be the same if read_preference differs but the rest is the same', () => {
            const instance = new DBMongo({user: 'admin', pass: 'root', db: 'main', read_preference: 'nearest'});
            const instance2 = new DBMongo({user: 'admin', pass: 'root', db: 'main', read_preference: 'primary'});
            assert.equal(instance.uid, 'mongodb:2283077747');
            assert.equal(instance.uid, instance2.uid);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should be the same if retry_reads differs but the rest is the same', () => {
            const instance = new DBMongo({user: 'admin', pass: 'root', db: 'main', retry_reads: true});
            const instance2 = new DBMongo({user: 'admin', pass: 'root', db: 'main', retry_reads: false});
            assert.equal(instance.uid, 'mongodb:2283077747');
            assert.equal(instance.uid, instance2.uid);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should be the same if retry_writes differs but the rest is the same', () => {
            const instance = new DBMongo({user: 'admin', pass: 'root', db: 'main', retry_writes: true});
            const instance2 = new DBMongo({user: 'admin', pass: 'root', db: 'main', retry_writes: false});
            assert.equal(instance.uid, 'mongodb:2283077747');
            assert.equal(instance.uid, instance2.uid);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
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
            assert.equal(instance.uid, 'mongodb:595584381');
            assert.equal(instance.uid, instance2.uid);
            assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            assert.deepEqual(MockClient.calls, []);
        });
    });

    describe('GET isConnected', () => {
        it('Should be a getter', () => {
            const app = new DBMongo({user: 'peter', pass: 'mysecret', db: 'main'});
            //  @ts-ignore
            app.isDebugEnabled = 'bla';
            assert.equal(app.isConnected, false);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should by default be false', () => {
            const app = new DBMongo({user: 'peter', pass: 'mysecret', db: 'main'});
            assert.equal(app.isConnected, false);
        });

        it('Should still be false if connect fails due to throwing', async () => {
            const app = new DBMongo({user: 'peter', pass: 'mysecret', db: 'main', debug: true});
            MockClient.setConnectMode('throw');
            let val:any = false;
            try {
                await app.connect();
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MockClient@connect: Oh No!');
            assert.equal(app.isConnected, false);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Failed to connect', {err: 'MockClient@connect: Oh No!'}],
            ]);
            assert.deepEqual(MockClient.calls.length, 1);
        });

        it('Should still be false if connect fails due to not returning a valid client', async () => {
            const app = new DBMongo({user: 'peter', pass: 'mysecret', db: 'main', debug: true});
            MockClient.setConnectMode('wrongret');
            let val:any = false;
            try {
                await app.connect();
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'Mongo@connect: Failed to create client pool');
            assert.equal(app.isConnected, false);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Failed to connect', {err: 'Mongo@connect: Failed to create client pool'}],
            ]);
            assert.deepEqual(MockClient.calls.length, 1);
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
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls.length, 2);
            assert.deepEqual(MockClient.calls, [
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
            assert.equal(app.isConnected, true);
        });
    });

    describe('GET isDebugEnabled', () => {
        it('Should be a getter', () => {
            const app = new DBMongo({user: 'peter', pass: 'mysecret', db: 'main'});
            //  @ts-ignore
            app.isDebugEnabled = 'bla';
            assert.equal(app.isDebugEnabled, false);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should by default be false', () => {
            const app = new DBMongo({user: 'peter', pass: 'mysecret', db: 'main'});
            assert.equal(app.isDebugEnabled, false);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should return the proper value when debug is configured as true via ctor', () => {
            const app = new DBMongo({user: 'peter', pass: 'mysecret', db: 'main', debug: true});
            assert.equal(app.isDebugEnabled, true);
            assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should return the proper value when debug is configured as false via ctor, and not log', () => {
            const app = new DBMongo({user: 'peter', pass: 'mysecret', db: 'main', debug: false});
            assert.equal(app.isDebugEnabled, false);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });
    });

    describe('bootstrap', () => {
        it('Should not be static', () => {
            /* @ts-ignore */
            assert.ok(DBMongo.bootstrap === undefined);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should be an async function', () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            assert.ok(Validator.rules.async_function(instance.bootstrap));
            assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should throw when connect fails', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);

            const mockConnect = new MockFn();
            mockConnect.mock(instance, 'connect');
            mockConnect.reject = true;

            let val = false;
            try {
                await instance.bootstrap();
            } catch (err) {
                val = err.message;
            }

            assert.equal(val, 'Oh No');
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@bootstrap: ------ Connectivity check'],
                ['Mongo@bootstrap: ------ Connectivity failure'],
            ]);
            assert.deepEqual(MockClient.calls, []);

            mockConnect.restore();
        });

        it('Should throw when close fails', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');

            const mockClose = new MockFn();
            mockClose.mock(instance, 'close');
            mockClose.reject = true;

            let val = false;
            try {
                await instance.bootstrap();
            } catch (err) {
                val = err.message;
            }

            assert.equal(val, 'Oh No');
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@bootstrap: ------ Connectivity check'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Connection established'],
                ['Mongo@bootstrap: ------ Connectivity failure'],
            ]);
            assert.deepEqual(MockClient.calls, [
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
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@bootstrap: ------ Connectivity check'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Connection established'],
                ['Mongo@close: Closing connection'],
                ['Mongo@close: Connection terminated'],
                ['Mongo@bootstrap: ------ Connectivity success'],
            ]);
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {name: 'main', opts: {readPreference: 'nearest', retryWrites: true}}},
                {key: 'close', params: {}},
            ]);
        });

        describe('structure', async () => {
            it('Should throw if provided a structure with non-objects or empty objects', async () => {
                const instance = new DBMongo(FULL_VALID_OPTS);
                for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                    let val = false;
                    try {
                        await instance.bootstrap([el]);
                    } catch (err) {
                        val = err.message;
                    }
                    assert.equal(val, 'Mongo@bootstrap: All collection objects need to be valid');
                    assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
                    assert.deepEqual(MockClient.calls, []);
                }
            });

            it('Should throw if provided a structure with collection objects not containing a valid name', async () => {
                const instance = new DBMongo(FULL_VALID_OPTS);
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    let val = false;
                    try {
                        await instance.bootstrap([{name: el}]);
                    } catch (err) {
                        val = err.message;
                    }
                    assert.equal(val, 'Mongo@bootstrap: All collection objects need to be valid');
                    assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
                    assert.deepEqual(MockClient.calls, []);
                }
            });

            it('Should throw if provided a structure with collection objects and indexes but indexes are non-objects', async () => {
                const instance = new DBMongo(FULL_VALID_OPTS);
                for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                    let val = false;
                    try {
                        await instance.bootstrap([{name: 'firstcollection'}, {name: 'mycollection', idx: [el]}]);
                    } catch (err) {
                        val = err.message;
                    }
                    assert.equal(val, 'Mongo@bootstrap: All collection objects need to be valid');
                    assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
                    assert.deepEqual(MockClient.calls, []);
                }
            });

            it('Should throw if provided a structure with collection objects and indexes but indexes dont contain valid name', async () => {
                const instance = new DBMongo(FULL_VALID_OPTS);
                for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                    let val = false;
                    try {
                        await instance.bootstrap([{name: 'firstcollection'}, {name: 'mycollection', idx: [{name: el, spec: {date: 1}}]}]);
                    } catch (err) {
                        val = err.message;
                    }
                    assert.equal(val, 'Mongo@bootstrap: All collection objects need to be valid');
                    assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
                    assert.deepEqual(MockClient.calls, []);
                }
            });

            it('Should throw if provided a structure with collection and indexes but indexes dont contain object spec', async () => {
                const instance = new DBMongo(FULL_VALID_OPTS);
                for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                    let val = false;
                    try {
                        await instance.bootstrap([{name: 'firstcollection'}, {name: 'mycollection', idx: [{name: 'idx1', spec: el}]}]);
                    } catch (err) {
                        val = err.message;
                    }
                    assert.equal(val, 'Mongo@bootstrap: All collection objects need to be valid');
                    assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
                    assert.deepEqual(MockClient.calls, []);
                }
            });

            it('Should throw if provided a structure with collection and indexes but index spec is invalid', async () => {
                const instance = new DBMongo(FULL_VALID_OPTS);
                for (const el of [...CONSTANTS.NOT_INTEGER, 0, 999, 100, 1.1]) {
                    let val = false;
                    try {
                        await instance.bootstrap([
                            {name: 'firstcollection'},
                            {name: 'mycollection', idx: [{name: 'idx1', spec: {uid: el}}]},
                        ]);
                    } catch (err) {
                        val = err.message;
                    }
                    assert.equal(val, 'Mongo@bootstrap: All collection objects need to be valid');
                    assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
                    assert.deepEqual(MockClient.calls, []);
                }
            });

            it('Should throw if provided a structure with collection objects and indexes but index.options is not an object', async () => {
                const instance = new DBMongo(FULL_VALID_OPTS);
                for (const el of CONSTANTS.NOT_OBJECT) {
                    if (el === undefined) continue;
                    let val = false;
                    try {
                        await instance.bootstrap([
                            {name: 'firstcollection'},
                            {name: 'mycollection', idx: [{name: 'idx1', spec: {date: 1}, options: el}]},
                        ]);
                    } catch (err) {
                        val = err.message;
                    }
                    assert.equal(val, 'Mongo@bootstrap: All collection objects need to be valid');
                    assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
                    assert.deepEqual(MockClient.calls, []);
                }
            });

            it('Should throw if provided a structure with collection and indexes but index names are not unique', async () => {
                const instance = new DBMongo(FULL_VALID_OPTS);
                let val = false;
                try {
                    await instance.bootstrap([
                        {name: 'firstcollection'},
                        {name: 'mycollection', idx: [
                            {name: 'idx1', spec: {uid: 1}},
                            {name: 'idx1', spec: {uid: -1}},
                        ]},
                    ]);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'Mongo@bootstrap: Ensure all indexes have a unique name');
                assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
                assert.deepEqual(MockClient.calls, []);
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
                assert.deepEqual(mockConsoleInfo.calls, [
                    ['Mongo: Instantiated'],
                    ['Mongo@bootstrap: ------ Connectivity check'],
                    ['Mongo@connect: Establishing connection'],
                    ['Mongo@connect: Connection established'],
                    ['Mongo@bootstrap: ------ Ensuring structure'],
                    ['Mongo@hasCollection: collection_1 - does not exist'],
                    ['Mongo@createCollection: Creating collection - collection_1'],
                    ['Mongo@hasCollection: collection_2 - does not exist'],
                    ['Mongo@createCollection: Creating collection - collection_2'],
                    ['Mongo@hasIndex: collection_2 ix:uid_asc - does not exist'],
                    ['Mongo@createIndex: Creating index uid_asc on collection_2'],
                    ['Mongo@hasCollection: collection_3 - does not exist'],
                    ['Mongo@createCollection: Creating collection - collection_3'],
                    ['Mongo@hasIndex: collection_3 ix:uid_asc - does not exist'],
                    ['Mongo@createIndex: Creating index uid_asc on collection_3'],
                    ['Mongo@hasIndex: collection_3 ix:uid_asc_date_desc - does not exist'],
                    ['Mongo@createIndex: Creating index uid_asc_date_desc on collection_3'],
                    ['Mongo@hasCollection: collection_4 - does not exist'],
                    ['Mongo@createCollection: Creating collection - collection_4'],
                    ['Mongo@hasIndex: collection_4 ix:uid_asc - does not exist'],
                    ['Mongo@createIndex: Creating index uid_asc on collection_4'],
                    ['Mongo@hasIndex: collection_4 ix:uid_asc_date_desc - does not exist'],
                    ['Mongo@createIndex: Creating index uid_asc_date_desc on collection_4'],
                    ['Mongo@bootstrap: ------ Structure ensured'],
                    ['Mongo@close: Closing connection'],
                    ['Mongo@close: Connection terminated'],
                    ['Mongo@bootstrap: ------ Connectivity success'],
                ]);
                assert.deepEqual(MockClient.calls, [
                    {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                    {key: 'db', params: {name: 'main', opts: {readPreference: 'nearest', retryWrites: true}}},
                    {key: 'close', params: {}},
                ]);
                assert.deepEqual(MockDb.calls, [
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
                assert.deepEqual(mockConsoleInfo.calls, [
                    ['Mongo: Instantiated'],
                    ['Mongo@bootstrap: ------ Connectivity check'],
                    ['Mongo@connect: Establishing connection'],
                    ['Mongo@connect: Connection established'],
                    ['Mongo@bootstrap: ------ Ensuring structure'],
                    ['Mongo@hasCollection: collection_1 - exists'],
                    ['Mongo@hasCollection: collection_2 - exists'],
                    ['Mongo@hasIndex: collection_2 ix:uid_asc - exists'],
                    ['Mongo@hasCollection: collection_3 - exists'],
                    ['Mongo@hasIndex: collection_3 ix:uid_asc - exists'],
                    ['Mongo@hasIndex: collection_3 ix:uid_asc_date_desc - exists'],
                    ['Mongo@hasCollection: collection_4 - exists'],
                    ['Mongo@hasIndex: collection_4 ix:uid_asc - exists'],
                    ['Mongo@hasIndex: collection_4 ix:uid_asc_date_desc - exists'],
                    ['Mongo@bootstrap: ------ Structure ensured'],
                    ['Mongo@close: Closing connection'],
                    ['Mongo@close: Connection terminated'],
                    ['Mongo@bootstrap: ------ Connectivity success'],
                ]);
                assert.deepEqual(MockClient.calls, [
                    {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                    {key: 'db', params: {name: 'main', opts: {readPreference: 'nearest', retryWrites: true}}},
                    {key: 'close', params: {}},
                ]);
                assert.deepEqual(MockDb.calls, [
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
            assert.ok(DBMongo.connect === undefined);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should be an async function', () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            assert.ok(Validator.rules.async_function(instance.connect));
            assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should throw if connect fails due to mongo internals throwing', async () => {
            const app = new DBMongo({user: 'peter', pass: 'mysecret', db: 'main', debug: true});
            MockClient.setConnectMode('throw');
            let val:any = false;
            try {
                await app.connect();
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MockClient@connect: Oh No!');
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Failed to connect', {err: 'MockClient@connect: Oh No!'}],
            ]);
            assert.deepEqual(MockClient.calls.length, 1);
        });

        it('Should throw if connect fails due to not returning a valid client', async () => {
            const app = new DBMongo({user: 'peter', pass: 'mysecret', db: 'main', debug: true});
            MockClient.setConnectMode('wrongret');
            let val:any = false;
            try {
                await app.connect();
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'Mongo@connect: Failed to create client pool');
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Failed to connect', {err: 'Mongo@connect: Failed to create client pool'}],
            ]);
            assert.deepEqual(MockClient.calls.length, 1);
        });

        it('Should throw if connect fails due to call to db failing for mongo internals', async () => {
            const app = new DBMongo({user: 'peter', pass: 'mysecret', db: 'main', debug: true});
            MockClient.setConnectMode('success');
            MockClient.setDbMode('throw');
            let val:any = false;
            try {
                await app.connect();
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MockClient@db: Oh No!');
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Failed to connect', {err: 'MockClient@db: Oh No!'}],
            ]);
            assert.deepEqual(MockClient.calls.length, 2);
        });

        it('Should throw if connect fails due to call to db not returning a proper value for mongo internals', async () => {
            const app = new DBMongo({user: 'peter', pass: 'mysecret', db: 'main', debug: false});
            MockClient.setConnectMode('success');
            MockClient.setDbMode('wrongret');
            let val:any = false;
            try {
                await app.connect();
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'Mongo@connect: Failed to create database instance');
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls.length, 2);
        });

        it('Should return db instance if connect succeeds and pass proper values', async () => {
            const app = new DBMongo({user: 'peter', pass: 'mysecret', db: 'main'});
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            const db = await app.connect();
            assert.ok(db instanceof Db);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls.length, 2);
            assert.deepEqual(MockClient.calls, [
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
            assert.ok(db instanceof Db);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls.length, 2);
            assert.deepEqual(MockClient.calls, [
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
            assert.ok(db instanceof Db);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls.length, 2);
            assert.deepEqual(MockClient.calls, [
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
    });

    describe('hasCollection', () => {
        it('Should not be static', () => {
            /* @ts-ignore */
            assert.ok(DBMongo.hasCollection === undefined);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should be an async function', () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            assert.ok(Validator.rules.async_function(instance.hasCollection));
            assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should throw if not passed a string or passed an empty string collection name', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                let val:any = false;
                try {
                    await instance.hasCollection(el);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'Mongo@hasCollection: Collection should be a non-empty string');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            }
        });

        it('Should throw if passed valid payload but connect fails due to throwing', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('throw');
            const instance = new DBMongo(FULL_VALID_OPTS);

            let val = false;
            try {
                await instance.hasCollection('mycollection');
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MockClient@db: Oh No!');
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Failed to connect', {err: 'MockClient@db: Oh No!'}],
            ]);
        });

        it('Should throw if passed valid payload but connect does not return DB instance', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);

            const mockConnect = new MockFn();
            mockConnect.mock(instance, 'connect');

            let val = false;
            try {
                await instance.hasCollection('mycollection');
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'Mongo@hasCollection: Failed to connect');
            assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            mockConnect.restore();
        });

        it('Should throw if passed valid payload but connect does not return DB instance', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);

            const mockConnect = new MockFn();
            mockConnect.mock(instance, 'connect');

            let val = false;
            try {
                await instance.hasCollection('mycollection');
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'Mongo@hasCollection: Failed to connect');
            assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            mockConnect.restore();
        });

        it('Should throw if passed valid payload and connecting, but listCollections throws', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColExistsMode('throw');

            const instance = new DBMongo(FULL_VALID_OPTS);
            let val = false;
            try {
                await instance.hasCollection('mycollection    ');
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MockDb@listCollections: Oh No!');
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(MockDb.calls, [
                {key: 'listCollections', params: {opts: {name: 'mycollection'}}},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Connection established'],
            ]);
        });

        it('Should throw if passed valid payload and connecting, but listCollections returns a wrong value', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColExistsMode('wrongret');

            const instance = new DBMongo(FULL_VALID_OPTS);
            let val = false;
            try {
                await instance.hasCollection('   mycollection    ');
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'Mongo@hasCollection: Unexpected result');
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(MockDb.calls, [
                {key: 'listCollections', params: {opts: {name: 'mycollection'}}},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Connection established'],
            ]);
        });

        it('Should return false if valid payload, connecting, but listCollections returns an empty set', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColExistsMode('emptyret');

            const instance = new DBMongo(FULL_VALID_OPTS);
            const out = await instance.hasCollection('mycollection');
            assert.equal(out, false);
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(MockDb.calls, [
                {key: 'listCollections', params: {opts: {name: 'mycollection'}}},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Connection established'],
                ['Mongo@hasCollection: mycollection - does not exist'],
            ]);
        });

        it('Should return true if valid payload, connecting, and hasCollection returns true', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColExistsMode('success');

            const instance = new DBMongo(FULL_VALID_OPTS);
            const out = await instance.hasCollection('mycollection');
            assert.equal(out, true);
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(MockDb.calls, [
                {key: 'listCollections', params: {opts: {name: 'mycollection'}}},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Connection established'],
                ['Mongo@hasCollection: mycollection - exists'],
            ]);
        });

        it('Should return true if valid payload, connecting and hasCollection returns true and not log if debug is off', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColExistsMode('success');

            const instance = new DBMongo({...FULL_VALID_OPTS, debug: false});
            const out = await instance.hasCollection('mycollection');
            assert.equal(out, true);
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(MockDb.calls, [
                {key: 'listCollections', params: {opts: {name: 'mycollection'}}},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, []);
        });
    });

    describe('createCollection', () => {
        it('Should not be static', () => {
            /* @ts-ignore */
            assert.ok(DBMongo.createCollection === undefined);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should be an async function', () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            assert.ok(Validator.rules.async_function(instance.createCollection));
            assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should throw if not passed a string or passed an empty string collection name', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                let val:any = false;
                try {
                    await instance.createCollection(el);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'Mongo@createCollection: Collection should be a non-empty string');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            }
        });

        it('Should throw if passed valid payload but connect fails due to throwing', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('throw');
            const instance = new DBMongo(FULL_VALID_OPTS);

            let val = false;
            try {
                await instance.createCollection('mycollection');
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MockClient@db: Oh No!');
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Failed to connect', {err: 'MockClient@db: Oh No!'}],
            ]);
        });

        it('Should throw if passed valid payload but connect does not return DB instance', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);

            const mockConnect = new MockFn();
            mockConnect.mock(instance, 'connect');

            let val = false;
            try {
                await instance.createCollection('mycollection');
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'Mongo@createCollection: Failed to connect');
            assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            mockConnect.restore();
        });

        it('Should throw if passed valid payload and connecting, but createCollection throws', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColCreateMode('throw');

            const instance = new DBMongo(FULL_VALID_OPTS);
            let val = false;
            try {
                await instance.createCollection('mycollection    ');
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MockDb@createCollection: Oh No!');
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(MockDb.calls, [
                {key: 'createCollection', params: {name: 'mycollection'}},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Connection established'],
                ['Mongo@createCollection: Creating collection - mycollection'],
            ]);
        });

        it('Should not throw and return false if passed valid payload and connecting, but createCollection fails', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColCreateMode('wrongret');

            const instance = new DBMongo(FULL_VALID_OPTS);
            const out = await instance.createCollection('mycollection    ');
            assert.equal(out, false);
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(MockDb.calls, [
                {key: 'createCollection', params: {name: 'mycollection'}},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Connection established'],
                ['Mongo@createCollection: Creating collection - mycollection'],
            ]);
        });

        it('Should not throw and return true if passed valid payload and connecting, and createCollection succeeds', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColCreateMode('success');

            const instance = new DBMongo(FULL_VALID_OPTS);
            const out = await instance.createCollection('   foobar    ');
            assert.equal(out, true);
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(MockDb.calls, [
                {key: 'createCollection', params: {name: 'foobar'}},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Connection established'],
                ['Mongo@createCollection: Creating collection - foobar'],
            ]);
        });
    });

    describe('dropCollection', () => {
        it('Should not be static', () => {
            /* @ts-ignore */
            assert.ok(DBMongo.dropCollection === undefined);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should be an async function', () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            assert.ok(Validator.rules.async_function(instance.dropCollection));
            assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should throw if not passed a string or passed an empty string collection name', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                let val:any = false;
                try {
                    await instance.dropCollection(el);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'Mongo@dropCollection: Collection should be a non-empty string');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            }
        });

        it('Should throw if passed valid payload but connect fails due to throwing', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('throw');
            const instance = new DBMongo(FULL_VALID_OPTS);

            let val = false;
            try {
                await instance.dropCollection('mycollection');
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MockClient@db: Oh No!');
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Failed to connect', {err: 'MockClient@db: Oh No!'}],
            ]);
        });

        it('Should throw if passed valid payload but connect does not return DB instance', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);

            const mockConnect = new MockFn();
            mockConnect.mock(instance, 'connect');

            let val = false;
            try {
                await instance.dropCollection('mycollection');
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'Mongo@dropCollection: Failed to connect');
            assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            mockConnect.restore();
        });

        it('Should throw if passed valid payload and connecting, but dropCollection throws', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColDropMode('throw');

            const instance = new DBMongo(FULL_VALID_OPTS);
            let val = false;
            try {
                await instance.dropCollection('mycollection    ');
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MockDb@dropCollection: Oh No!');
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(MockDb.calls, [
                {key: 'dropCollection', params: {name: 'mycollection'}},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Connection established'],
                ['Mongo@dropCollection: Dropping collection - mycollection'],
            ]);
        });

        it('Should not throw and return false if passed valid payload and connecting, but dropCollection fails', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColDropMode('wrongret');

            const instance = new DBMongo(FULL_VALID_OPTS);
            const out = await instance.dropCollection('mycollection    ');
            assert.equal(out, false);
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(MockDb.calls, [
                {key: 'dropCollection', params: {name: 'mycollection'}},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Connection established'],
                ['Mongo@dropCollection: Dropping collection - mycollection'],
            ]);
        });

        it('Should not throw and return true if passed valid payload and connecting, and dropCollection succeeds', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColDropMode('success');

            const instance = new DBMongo(FULL_VALID_OPTS);
            const out = await instance.dropCollection('   foobar    ');
            assert.equal(out, true);
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(MockDb.calls, [
                {key: 'dropCollection', params: {name: 'foobar'}},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Connection established'],
                ['Mongo@dropCollection: Dropping collection - foobar'],
            ]);
        });
    });

    describe('hasIndex', () => {
        it('Should not be static', () => {
            /* @ts-ignore */
            assert.ok(DBMongo.hasIndex === undefined);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should be an async function', () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            assert.ok(Validator.rules.async_function(instance.hasIndex));
            assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should throw if not passed a string or passed an empty string collection name', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                let val:any = false;
                try {
                    await instance.hasIndex(el, 'myindex');
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'Mongo@hasIndex: Collection should be a non-empty string');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            }
        });

        it('Should throw if not passed a string or passed an empty string index name', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                let val:any = false;
                try {
                    await instance.hasIndex('mycollection', el);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'Mongo@hasIndex: Index Name should be a non-empty string');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            }
        });

        it('Should throw if passed valid payload but connect fails due to throwing', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('throw');
            const instance = new DBMongo(FULL_VALID_OPTS);

            let val = false;
            try {
                await instance.hasIndex('mycollection', 'myindex');
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MockClient@db: Oh No!');
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Failed to connect', {err: 'MockClient@db: Oh No!'}],
            ]);
        });

        it('Should throw if passed valid payload but connect does not return DB instance', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);

            const mockConnect = new MockFn();
            mockConnect.mock(instance, 'connect');

            let val = false;
            try {
                await instance.hasIndex('mycollection', 'myindex');
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'Mongo@hasIndex: Failed to connect');
            assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            mockConnect.restore();
        });

        it('Should throw if passed valid payload and connecting, but collection throws', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColMode('throw');

            const instance = new DBMongo(FULL_VALID_OPTS);
            let val = false;
            try {
                await instance.hasIndex('mycollection    ', '  myindex  ');
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MockDb@collection: Oh No!');
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(MockDb.calls, [
                {key: 'collection', params: {name: 'mycollection'}},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Connection established'],
            ]);
        });

        it('Should throw if passed valid payload and connecting, but indexExists throws', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColMode('success');
            MockDb.setDbColIdxExistsMode('throw');

            const instance = new DBMongo(FULL_VALID_OPTS);
            let val = false;
            try {
                await instance.hasIndex('mycollection    ', '  myindex  ');
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MockDb@indexExists: Oh No!');
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(MockDb.calls, [
                {key: 'collection', params: {name: 'mycollection'}},
                {key: 'indexExists', params: {name: 'myindex'}},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Connection established'],
            ]);
        });

        it('Should return false if passed valid payload and connecting, but index does not exist', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColMode('success');
            MockDb.setDbColIdxExistsMode('wrongret');

            const instance = new DBMongo(FULL_VALID_OPTS);
            const out = await instance.hasIndex('mycollection    ', '  myindex  ');
            assert.equal(out, false);
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(MockDb.calls, [
                {key: 'collection', params: {name: 'mycollection'}},
                {key: 'indexExists', params: {name: 'myindex'}},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Connection established'],
                ['Mongo@hasIndex: mycollection ix:myindex - does not exist'],
            ]);
        });

        it('Should return true if passed valid payload and connecting, and index exists', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColMode('success');
            MockDb.setDbColIdxExistsMode('success');

            const instance = new DBMongo(FULL_VALID_OPTS);
            const out = await instance.hasIndex('mycollection    ', '  myindex  ');
            assert.equal(out, true);
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(MockDb.calls, [
                {key: 'collection', params: {name: 'mycollection'}},
                {key: 'indexExists', params: {name: 'myindex'}},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Connection established'],
                ['Mongo@hasIndex: mycollection ix:myindex - exists'],
            ]);
        });

        it('Should return true if passed valid payload and connecting, and index exists, and not log if debug off', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColMode('success');
            MockDb.setDbColIdxExistsMode('success');

            const instance = new DBMongo({...FULL_VALID_OPTS, debug: false});
            const out = await instance.hasIndex('mycollection    ', '  myindex  ');
            assert.equal(out, true);
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(MockDb.calls, [
                {key: 'collection', params: {name: 'mycollection'}},
                {key: 'indexExists', params: {name: 'myindex'}},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, []);
        });
    });

    describe('createIndex', () => {
        it('Should not be static', () => {
            /* @ts-ignore */
            assert.ok(DBMongo.createIndex === undefined);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should be an async function', () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            assert.ok(Validator.rules.async_function(instance.createIndex));
            assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should throw if not passed a string or passed an empty string collection name', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                let val:any = false;
                try {
                    await instance.createIndex(el, 'myindex', {uid: 1});
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'Mongo@createIndex: Collection should be a non-empty string');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            }
        });

        it('Should throw if not passed a string or passed an empty string index name', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                let val:any = false;
                try {
                    await instance.createIndex('mycollection', el, {uid: 1});
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'Mongo@createIndex: Index Name should be a non-empty string');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            }
        });

        it('Should throw if not passed a spec or passed an empty spec object', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                let val:any = false;
                try {
                    await instance.createIndex('mycollection', 'uid_asc', el);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'Mongo@createIndex: Invalid spec passed');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            }
        });

        it('Should throw if not passed a valid spec', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of [...CONSTANTS.NOT_INTEGER, 0, 'bla', -10000, 10000]) {
                let val:any = false;
                try {
                    await instance.createIndex('mycollection', 'uid_asc', {uid: el});
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'Mongo@createIndex: Invalid spec passed');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            }
        });

        it('Should throw if passed a partially valid spec', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of [...CONSTANTS.NOT_INTEGER, 0, 'bla', -10000, 10000]) {
                let val:any = false;
                try {
                    await instance.createIndex('mycollection', 'uid_asc', {uid: 1, name: el});
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'Mongo@createIndex: Invalid spec passed');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
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
                    val = err.message;
                }
                assert.equal(val, 'Mongo@createIndex: Options should be an object');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            }
        });

        it('Should throw if passed valid payload but connect fails due to throwing', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('throw');
            const instance = new DBMongo(FULL_VALID_OPTS);

            let val = false;
            try {
                await instance.createIndex('mycollection', 'uid_asc', {uid: 1, name: 1}, {expireAfterSeconds: 90});
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MockClient@db: Oh No!');
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Failed to connect', {err: 'MockClient@db: Oh No!'}],
            ]);
        });

        it('Should throw if passed valid payload but connect does not return DB instance', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);

            const mockConnect = new MockFn();
            mockConnect.mock(instance, 'connect');

            let val = false;
            try {
                await instance.createIndex('mycollection', 'uid_asc', {uid: 1, name: 1}, {expireAfterSeconds: 90});
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'Mongo@createIndex: Failed to connect');
            assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            mockConnect.restore();
        });

        it('Should throw if passed valid payload and connecting, but collection throws', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColMode('throw');

            const instance = new DBMongo(FULL_VALID_OPTS);
            let val = false;
            try {
                await instance.createIndex('mycollection', 'uid_asc', {uid: 1, name: 1}, {expireAfterSeconds: 90});
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MockDb@collection: Oh No!');
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(MockDb.calls, [
                {key: 'collection', params: {name: 'mycollection'}},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Connection established'],
                ['Mongo@createIndex: Creating index uid_asc on mycollection'],
            ]);
        });

        it('Should throw if passed valid payload and connecting, but createIndex throws', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColMode('success');
            MockDb.setDbColIdxCreateMode('throw');

            const instance = new DBMongo(FULL_VALID_OPTS);
            let val = false;
            try {
                await instance.createIndex('mycollection', 'uid_asc', {uid: 1, name: 1}, {expireAfterSeconds: 90});
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MockDb@createIndex: Oh No!');
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(MockDb.calls, [
                {key: 'collection', params: {name: 'mycollection'}},
                {key: 'createIndex', params: {indexSpec: {name: 1, uid: 1}, options: {name: 'uid_asc', expireAfterSeconds: 90}}},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Connection established'],
                ['Mongo@createIndex: Creating index uid_asc on mycollection'],
            ]);
        });

        it('Should return false if passed valid payload and connecting, but index does not exist', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColMode('success');
            MockDb.setDbColIdxCreateMode('wrongret');

            const instance = new DBMongo(FULL_VALID_OPTS);
            const out = await instance.createIndex('   mycollection  ', 'uid_asc   ', {uid: 1, name: 1}, {expireAfterSeconds: 90});
            assert.equal(out, false);
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(MockDb.calls, [
                {key: 'collection', params: {name: 'mycollection'}},
                {key: 'createIndex', params: {indexSpec: {name: 1, uid: 1}, options: {name: 'uid_asc', expireAfterSeconds: 90}}},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Connection established'],
                ['Mongo@createIndex: Creating index uid_asc on mycollection'],
            ]);
        });

        it('Should return true if passed valid payload and connecting, and index exists', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColMode('success');
            MockDb.setDbColIdxCreateMode('success');

            const instance = new DBMongo(FULL_VALID_OPTS);
            const out = await instance.createIndex(' mycollection ', '  uid_asc', {uid: 1, name: 1});
            assert.equal(out, true);
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(MockDb.calls, [
                {key: 'collection', params: {name: 'mycollection'}},
                {key: 'createIndex', params: {indexSpec: {name: 1, uid: 1}, options: {name: 'uid_asc'}}},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Connection established'],
                ['Mongo@createIndex: Creating index uid_asc on mycollection'],
            ]);
        });
    });

    describe('dropIndex', () => {
        it('Should not be static', () => {
            /* @ts-ignore */
            assert.ok(DBMongo.dropIndex === undefined);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should be an async function', () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            assert.ok(Validator.rules.async_function(instance.dropIndex));
            assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should throw if not passed a string or passed an empty string collection name', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                let val:any = false;
                try {
                    await instance.dropIndex(el, 'myindex');
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'Mongo@dropIndex: Collection should be a non-empty string');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            }
        });

        it('Should throw if not passed a string or passed an empty string index name', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                let val:any = false;
                try {
                    await instance.dropIndex('mycollection', el);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'Mongo@dropIndex: Index Name should be a non-empty string');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            }
        });

        it('Should throw if passed valid payload but connect fails due to throwing', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('throw');
            const instance = new DBMongo(FULL_VALID_OPTS);

            let val = false;
            try {
                await instance.dropIndex('mycollection', 'myindex');
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MockClient@db: Oh No!');
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Failed to connect', {err: 'MockClient@db: Oh No!'}],
            ]);
        });

        it('Should throw if passed valid payload but connect does not return DB instance', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);

            const mockConnect = new MockFn();
            mockConnect.mock(instance, 'connect');

            let val = false;
            try {
                await instance.dropIndex('mycollection', 'myindex');
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'Mongo@dropIndex: Failed to connect');
            assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            mockConnect.restore();
        });

        it('Should return false if passed valid payload and connecting, but collection throws', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColMode('throw');

            const instance = new DBMongo(FULL_VALID_OPTS);
            const out = await instance.dropIndex('mycollection    ', '  myindex  ');
            assert.equal(out, false);
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(MockDb.calls, [
                {key: 'collection', params: {name: 'mycollection'}},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Connection established'],
                ['Mongo@dropIndex: Dropping index myindex on mycollection'],
            ]);
        });

        it('Should return false if passed valid payload and connecting, but dropIndex throws', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColMode('success');
            MockDb.setDbColIdxDropMode('throw');

            const instance = new DBMongo(FULL_VALID_OPTS);
            const out = await instance.dropIndex('mycollection    ', '  myindex  ');
            assert.equal(out, false);
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(MockDb.calls, [
                {key: 'collection', params: {name: 'mycollection'}},
                {key: 'dropIndex', params: {name: 'myindex'}},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Connection established'],
                ['Mongo@dropIndex: Dropping index myindex on mycollection'],
            ]);
        });

        it('Should return true if passed valid payload and connecting, and dropIndex succeeds', async () => {
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            MockDb.setDbColMode('success');
            MockDb.setDbColIdxDropMode('success');

            const instance = new DBMongo(FULL_VALID_OPTS);
            const out = await instance.dropIndex('mycollection    ', '  myindex  ');
            assert.equal(out, true);
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(MockDb.calls, [
                {key: 'collection', params: {name: 'mycollection'}},
                {key: 'dropIndex', params: {name: 'myindex'}},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Connection established'],
                ['Mongo@dropIndex: Dropping index myindex on mycollection'],
            ]);
        });
    });

    describe('query', () => {
        it('Should not be static', () => {
            /* @ts-ignore */
            assert.ok(DBMongo.query === undefined);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should not be an async function', () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            assert.ok(Validator.rules.function(instance.query));
            assert.ok(Validator.rules.async_function(instance.query) === false);
            assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should throw if not passed a string or passed an empty string collection name', () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                let val = false;
                try {
                    instance.query(el);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'Mongo@query: Collection should be a non-empty string');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            }
        });

        it('Should return an instance of Query when passed a valid collection name', () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            const q = instance.query('  mycollection   ');
            assert.ok(q instanceof Query);
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
            assert.deepEqual(out, [{bla: 'bla'}]);
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {name: 'main', opts: {readPreference: 'nearest', retryWrites: true}}},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Connection established'],
            ]);
            assert.deepEqual(MockDb.calls, [
                {key: 'collection', params: {name: 'mycollection'}},
            ]);
            assert.deepEqual(mock_col.calls, [
                {key: 'aggregate', params: {options: {}, pipeline: [{$match: {hello: 'world'}}]}},
            ]);
        });
    });

    describe('aggregate', () => {
        it('Should not be static', () => {
            /* @ts-ignore */
            assert.ok(DBMongo.aggregate === undefined);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should not be an async function', () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            assert.ok(Validator.rules.function(instance.aggregate));
            assert.ok(Validator.rules.async_function(instance.aggregate));
            assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should throw if not passed a string or passed an empty string collection name', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                let val = false;
                try {
                    /* @ts-ignore */
                    await instance.aggregate(el);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'Mongo@aggregate: Collection should be a non-empty string');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            }
        });

        it('Should throw if not passed a pipeline array or passed an empty pipeline array', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            for (const el of CONSTANTS.NOT_ARRAY_WITH_EMPTY) {
                let val = false;
                try {
                    await instance.aggregate('test', el);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'Mongo@aggregate: Pipeline should be a non-empty array');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            }
        });

        it('Should throw if passed a pipeline array consisting solely of non/empty objects', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            let val = false;
            try {
                await instance.aggregate('test', CONSTANTS.NOT_OBJECT_WITH_EMPTY);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'Mongo@aggregate: Pipeline empty after sanitization');
            assert.deepEqual(MockClient.calls, []);
            assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
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
            assert.deepEqual(MockClient.calls, [
                {key: 'connect', params: FULL_VALID_CONNECT_EXPECTED_PAYLOAD},
                {key: 'db', params: {
                    name: 'main',
                    opts: {
                        readPreference: 'nearest',
                        retryWrites: true,
                    },
                }},
            ]);
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Connection established'],
            ]);
            assert.deepEqual(MockDb.calls, [
                {key: 'collection', params: {name: 'mycollection'}},
            ]);
            assert.deepEqual(mock_col.calls, [
                {key: 'aggregate', params: {options: {}, pipeline: [{$match: {name: {$eq: 'peter'}}}, {$count: 'tally'}]}},
            ]);
        });
    });

    describe('close', () => {
        it('Should not be static', () => {
            /* @ts-ignore */
            assert.ok(DBMongo.close === undefined);
            assert.deepEqual(mockConsoleInfo.calls, []);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should be an async function', () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            assert.ok(Validator.rules.async_function(instance.close));
            assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
            assert.deepEqual(MockClient.calls, []);
        });

        it('Should not do anything and be successful if client is not connected', async () => {
            const instance = new DBMongo(FULL_VALID_OPTS);
            let val = false;
            try {
                await instance.close();
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, false);
            assert.deepEqual(MockClient.calls, []);
            assert.deepEqual(mockConsoleInfo.calls, [['Mongo: Instantiated']]);
        });

        it('Should throw and not de disconnected if calling client close throws', async () => {
            MockClient.setCloseMode('throw');
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            const instance = new DBMongo(FULL_VALID_OPTS);

            assert.equal(instance.isConnected, false);

            await instance.connect();

            assert.equal(instance.isConnected, true);

            let val = false;
            try {
                await instance.close();
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, false);
            assert.deepEqual(MockClient.calls, [
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
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Connection established'],
                ['Mongo@close: Closing connection'],
                ['Mongo@close: Failed to terminate', {err: 'MockClient@close: Oh No!'}],
            ]);
            assert.equal(instance.isConnected, true);
        });

        it('Should not throw and de disconnected if calling client closes successfully', async () => {
            MockClient.setCloseMode('success');
            MockClient.setConnectMode('success');
            MockClient.setDbMode('success');
            const instance = new DBMongo(FULL_VALID_OPTS);

            assert.equal(instance.isConnected, false);

            await instance.connect();

            assert.equal(instance.isConnected, true);

            let val = false;
            try {
                await instance.close();
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, false);
            assert.deepEqual(MockClient.calls, [
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
            assert.deepEqual(mockConsoleInfo.calls, [
                ['Mongo: Instantiated'],
                ['Mongo@connect: Establishing connection'],
                ['Mongo@connect: Connection established'],
                ['Mongo@close: Closing connection'],
                ['Mongo@close: Connection terminated'],
            ]);
            assert.equal(instance.isConnected, false);
        });
    });
});
