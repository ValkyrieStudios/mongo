/* eslint-disable max-len */
/* eslint-disable max-lines */

import Validator from '@valkyriestudios/validator';
import {describe, it, beforeEach, afterEach, expect} from 'vitest';
import Query from '../../lib/Query';
import DBMongo from '../../lib';
import CONSTANTS from '../constants';
import MockCollection from '../MockCollection';
import MockClient from '../MockClient';
import MockDb from '../MockDb';
import MockUnorderedBulkOp from '../MockUnorderedBulkOp';
import MockOrderedBulkOp from '../MockOrderedBulkOp';
import MockFn from '../MockFn';

const EXPECTED_CON_PAYLOAD = {
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
    uri: 'mongodb://peter:mysecretpassword@127.0.0.1:27017/admin',
};

const EXPECTED_DB_PAYLOAD = {
    name: 'main',
    opts: {readPreference: 'nearest', retryWrites: true},
};

describe('Query', () => {
    const mock_col = new MockCollection('mycollection');
    const mockConsoleInfo = new MockFn();
    const mockConsoleError = new MockFn();
    let mdb_instance: DBMongo;

    beforeEach(() => {
        mockConsoleInfo.mock(console, 'info');
        mockConsoleError.mock(console, 'error');
        mock_col.reset();
        MockClient.mock();
        MockDb.setMockCol(mock_col);
        MockDb.setDbColMode('mock');
        MockClient.setDbMode('success');
        MockClient.setConnectMode('success');
        mdb_instance = new DBMongo({user: 'peter', pass: 'mysecretpassword', db: 'main'});
    });

    afterEach(() => {
        mockConsoleInfo.restore();
        mockConsoleError.restore();
        MockClient.restore();
    });

    describe('ctor', () => {
        it('Should throw when not passed an instance of Mongo', () => {
            for (const el of [...CONSTANTS.NOT_OBJECT_WITH_EMPTY, {foo: 'bar'}]) {
                expect(
                    () => new Query(el, 'mycol')
                ).toThrowError(/MongoQuery: Expected instance of Mongo/);
            }
        });

        it('Should throw when not passed a valid collection name', () => {
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                expect(
                    () => new Query(mdb_instance, el)
                ).toThrowError(/MongoQuery: Expected collection to be a non-empty string/);
            }
        });

        it('Should not throw when passed an instance of collection', () => {
            /* @ts-ignore */
            expect(() => new Query(mdb_instance, 'mycollection')).not.toThrow();
            expect(mock_col.calls).toEqual([]);
        });
    });

    describe('count', () => {
        let instance:Query;

        beforeEach(() => {
            instance = new Query(mdb_instance, 'mycollection');
        });

        it('Should not be static', () => {
            /* @ts-ignore */
            expect(Query.count).toBe(undefined);
        });

        it('Should be an async function', () => {
            expect(Validator.rules.async_function(instance.count)).toBe(true);
            expect(MockClient.calls).toEqual([]);
            expect(mock_col.calls).toEqual([]);
        });

        it('Should throw when passed options that are not an object or undefined', async () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === undefined) continue;
                let val:string|boolean = false;
                try {
                    await instance.count({}, el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@count: Options should be an object');
                expect(MockClient.calls).toEqual([]);
                expect(mock_col.calls).toEqual([]);
            }
        });

        it('Should throw when passed a filter that is not undefined an object or a valid pipeline', async () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === undefined || (Array.isArray(el) && el.length)) continue;
                let val:string|boolean = false;
                try {
                    await instance.count(el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@count: Invalid filter passed');
                expect(MockClient.calls).toEqual([]);
                expect(mock_col.calls).toEqual([]);
            }
        });

        describe('filter', () => {
            it('Should throw when passed a valid payload but we fail to acquire a connection', async () => {
                const query = {date: {$gt: new Date()}};
                MockClient.setDbMode('wrongret');
                mock_col.setColUnorderedBop('throw');
                let val:string|boolean = false;
                try {
                    await instance.count(query);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@count: Failed - Mongo@connect: Failed to create database instance');
                expect(MockClient.calls).toEqual([
                    {key: 'connect', params: EXPECTED_CON_PAYLOAD},
                    {key: 'db', params: EXPECTED_DB_PAYLOAD},
                ]);
                expect(mock_col.calls).toEqual([]);
            });

            it('Should throw when passed valid payload but internal count throws', async () => {
                const query = {date: {$gt: new Date()}};
                mock_col.setColCount('throw');
                let val:string|boolean = false;
                try {
                    await instance.count(query);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@count: Failed - MockCollection@count: Oh No!');
                expect(MockClient.calls).toEqual([
                    {key: 'connect', params: EXPECTED_CON_PAYLOAD},
                    {key: 'db', params: EXPECTED_DB_PAYLOAD},
                ]);
                expect(mock_col.calls).toEqual([{key: 'count', params: {options: {}, query}}]);
            });

            it('Should throw when passed valid payload but internal count returns a wrong result', async () => {
                const query = {date: {$gt: new Date()}};
                mock_col.setColCount('wrongret');
                let val:string|boolean = false;
                try {
                    await instance.count(query);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@count: Failed - Unexpected result');
                expect(MockClient.calls).toEqual([
                    {key: 'connect', params: EXPECTED_CON_PAYLOAD},
                    {key: 'db', params: EXPECTED_DB_PAYLOAD},
                ]);
                expect(mock_col.calls).toEqual([{key: 'count', params: {options: {}, query}}]);
            });

            it('Should return count when passed valid payload and count succeeds', async () => {
                const query = {date: {$gt: new Date()}};
                mock_col.setColCount('success');
                const out = await instance.count(query);
                expect(out).toBe(20);
                expect(MockClient.calls).toEqual([
                    {key: 'connect', params: EXPECTED_CON_PAYLOAD},
                    {key: 'db', params: EXPECTED_DB_PAYLOAD},
                ]);
                expect(mock_col.calls).toEqual([{key: 'count', params: {options: {}, query}}]);
            });

            it('Should allow passing empty query', async () => {
                mock_col.setColCount('success');
                const out = await instance.count({});
                expect(out).toBe(20);
                expect(MockClient.calls).toEqual([
                    {key: 'connect', params: EXPECTED_CON_PAYLOAD},
                    {key: 'db', params: EXPECTED_DB_PAYLOAD},
                ]);
                expect(mock_col.calls).toEqual([{key: 'count', params: {options: {}, query: {}}}]);
            });

            it('Should allow passing options for query', async () => {
                mock_col.setColCount('success');
                const out = await instance.count({}, {allowDiskUse: true});
                expect(out).toBe(20);
                expect(MockClient.calls).toEqual([
                    {key: 'connect', params: EXPECTED_CON_PAYLOAD},
                    {key: 'db', params: EXPECTED_DB_PAYLOAD},
                ]);
                expect(mock_col.calls).toEqual([{key: 'count', params: {options: {allowDiskUse: true}, query: {}}}]);
            });
        });

        describe('aggregate', () => {
            it('Should throw when passed a valid payload but we fail to acquire a connection', async () => {
                const query = [{$match: {date: {$gt: new Date()}}}];
                MockClient.setDbMode('wrongret');
                mock_col.setColUnorderedBop('throw');
                let val:string|boolean = false;
                try {
                    await instance.count(query);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@count: Failed - Unexpected result');
                expect(MockClient.calls).toEqual([
                    {key: 'connect', params: EXPECTED_CON_PAYLOAD},
                    {key: 'db', params: EXPECTED_DB_PAYLOAD},
                ]);
                expect(mock_col.calls).toEqual([]);
            });

            it('Should throw when passed valid payload but internal aggregate throws', async () => {
                const query = [{$match: {date: {$gt: new Date()}}}];
                mock_col.setColAggregate('throw');
                let val:string|boolean = false;
                try {
                    await instance.count(query);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@count: Failed - Unexpected result');
                expect(MockClient.calls).toEqual([
                    {key: 'connect', params: EXPECTED_CON_PAYLOAD},
                    {key: 'db', params: EXPECTED_DB_PAYLOAD},
                ]);
                expect(mock_col.calls).toEqual([{key: 'aggregate', params: {options: {}, pipeline: [
                    ...query,
                    {$count: 'count'},
                ]}}]);
            });

            it('Should throw when passed valid payload but aggregate returns non-array result', async () => {
                const query = [{$match: {date: {$gt: new Date()}}}];
                mock_col.setColAggregate('wrongret');
                let val:string|boolean = false;
                try {
                    await instance.count(query);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@count: Failed - Unexpected result');
                expect(MockClient.calls).toEqual([
                    {key: 'connect', params: EXPECTED_CON_PAYLOAD},
                    {key: 'db', params: EXPECTED_DB_PAYLOAD},
                ]);
                expect(mock_col.calls).toEqual([{key: 'aggregate', params: {options: {}, pipeline: [
                    ...query,
                    {$count: 'count'},
                ]}}]);
            });

            it('Should not throw and return data when passed valid payload and aggregate returns result', async () => {
                const query = [{$match: {date: {$gt: new Date()}}}];
                mock_col.setColAggregate('success', [{count: 5}]);
                const out = await instance.count(query);
                expect(out).toBe(5);
                expect(MockClient.calls).toEqual([
                    {key: 'connect', params: EXPECTED_CON_PAYLOAD},
                    {key: 'db', params: EXPECTED_DB_PAYLOAD},
                ]);
                expect(mock_col.calls).toEqual([{key: 'aggregate', params: {options: {}, pipeline: [
                    ...query,
                    {$count: 'count'},
                ]}}]);
            });
        });
    });

    describe('aggregate', () => {
        let instance:Query;

        beforeEach(() => {
            instance = new Query(mdb_instance, 'mycollection');
        });


        it('Should not be static', () => {
            /* @ts-ignore */
            expect(Query.aggregate).toBe(undefined);
        });

        it('Should be an async function', () => {
            expect(Validator.rules.async_function(instance.aggregate)).toBe(true);
            expect(MockClient.calls).toEqual([]);
            expect(mock_col.calls).toEqual([]);
        });

        it('Should throw when not passed a valid pipeline array', async () => {
            for (const el of CONSTANTS.NOT_ARRAY_WITH_EMPTY) {
                let val:string|boolean = false;
                try {
                    await instance.aggregate(el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@aggregrate: Pipeline should be an array with content');
                expect(MockClient.calls).toEqual([]);
                expect(mock_col.calls).toEqual([]);
            }
        });

        it('Should throw when passed options that are not an object', async () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === undefined) continue;
                let val:string|boolean = false;
                try {
                    await instance.aggregate([{$match: {date: {$gt: new Date()}}}], el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@aggregate: Options should be an object');
                expect(MockClient.calls).toEqual([]);
                expect(mock_col.calls).toEqual([]);
            }
        });

        it('Should throw when passed a pipeline array that is empty after sanitization', async () => {
            let val:string|boolean = false;
            try {
                await instance.aggregate(CONSTANTS.NOT_OBJECT_WITH_EMPTY);
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('MongoQuery@aggregate: Pipeline is empty after sanitization');
            expect(MockClient.calls).toEqual([]);
            expect(mock_col.calls).toEqual([]);
        });

        it('Should return an empty array when passed a valid payload but we fail to acquire a connection', async () => {
            const pipeline = [{$match: {date: {$gt: new Date()}}}];
            MockClient.setDbMode('wrongret');
            mock_col.setColUnorderedBop('throw');
            const out = await instance.aggregate(pipeline);
            expect(out).toEqual([]);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([]);
        });

        it('Should return an empty array when passed valid payload but internal aggregate throws', async () => {
            const pipeline = [{$match: {date: {$gt: new Date()}}}];
            mock_col.setColAggregate('throw');
            const out = await instance.aggregate(pipeline);
            expect(out).toEqual([]);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'aggregate', params: {options: {}, pipeline}}]);
        });

        it('Should return an empty array when passed valid payload but aggregate returns non-array result', async () => {
            const pipeline = [{$match: {date: {$gt: new Date()}}}];
            mock_col.setColAggregate('wrongret');
            const out = await instance.aggregate(pipeline, {allowDiskUse: true});
            expect(out).toEqual([]);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'aggregate', params: {options: {allowDiskUse: true}, pipeline}}]);
        });

        it('Should not throw and return data when passed valid payload and aggregate returns result', async () => {
            const pipeline = [{$match: {date: {$gt: new Date()}}}];
            mock_col.setColAggregate('success');
            const out = await instance.aggregate(pipeline, {allowDiskUse: true});
            expect(out).toEqual([{bla: 'bla'}]);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'aggregate', params: {options: {allowDiskUse: true}, pipeline}}]);
        });
    });

    describe('findOne', () => {
        let instance:Query;

        beforeEach(() => {
            instance = new Query(mdb_instance, 'mycollection');
        });

        it('Should not be static', () => {
            /* @ts-ignore */
            expect(Query.findOne).toBe(undefined);
        });

        it('Should be an async function', () => {
            expect(Validator.rules.async_function(instance.findOne)).toBe(true);
            expect(MockClient.calls).toEqual([]);
            expect(mock_col.calls).toEqual([]);
        });

        it('Should throw when not passed a valid query', async () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === undefined) continue;

                let val:string|boolean = false;
                try {
                    await instance.findOne(el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@findOne: If passed, query should be an object');
                expect(MockClient.calls).toEqual([]);
                expect(mock_col.calls).toEqual([]);
            }
        });

        it('Should throw when passed projection that is not an object', async () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === undefined) continue;
                let val:string|boolean = false;
                try {
                    await instance.findOne({date: {$gt: new Date()}}, el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@findOne: If passed, projection should be an object');
                expect(MockClient.calls).toEqual([]);
                expect(mock_col.calls).toEqual([]);
            }
        });

        it('Should throw when passed a valid payload but we fail to acquire a connection', async () => {
            const query = {date: {$gt: new Date()}};
            MockClient.setDbMode('wrongret');
            let val:string|boolean = false;
            try {
                await instance.findOne(query);
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('MongoQuery@findOne: Failed - Mongo@connect: Failed to create database instance');
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([]);
        });

        it('Should throw when passed valid payload but internal findOne throws', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColFindOne('throw');
            let val:string|boolean = false;
            try {
                await instance.findOne(query);
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('MongoQuery@findOne: Failed - MockCollection@findOne: Oh No!');
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'findOne', params: {options: undefined, query}}]);
        });

        it('Should return null when passed valid payload and internal findOne returns wrong result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColFindOne('wrongret');
            const out = await instance.findOne(query);
            expect(out).toBe(null);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'findOne', params: {options: undefined, query}}]);
        });

        it('Should not throw and return data when passed valid payload and findOne returns result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColFindOne('success');
            const out = await instance.findOne(query, {hello: 1});
            expect(out).toEqual({bla: 'bla'});
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'findOne', params: {options: {projection: {hello: 1}}, query}}]);
        });
    });

    describe('removeOne', () => {
        let instance:Query;

        beforeEach(() => {
            instance = new Query(mdb_instance, 'mycollection');
        });

        it('Should not be static', () => {
            /* @ts-ignore */
            expect(Query.removeOne).toBe(undefined);
        });

        it('Should be an async function', () => {
            expect(Validator.rules.async_function(instance.removeOne)).toBe(true);
            expect(MockClient.calls).toEqual([]);
            expect(mock_col.calls).toEqual([]);
        });

        it('Should throw when not passed a valid query object', async () => {
            for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                let val:string|boolean = false;
                try {
                    await instance.removeOne(el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@removeOne: Query should be an object with content');
                expect(MockClient.calls).toEqual([]);
                expect(mock_col.calls).toEqual([]);
            }
        });

        it('Should throw when passed options that are not an object', async () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === undefined) continue;
                let val:string|boolean = false;
                try {
                    await instance.removeOne({date: {$gt: new Date()}}, el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@removeOne: Options should be an object');
                expect(MockClient.calls).toEqual([]);
                expect(mock_col.calls).toEqual([]);
            }
        });

        it('Should throw when passed a valid payload but we fail to acquire a connection', async () => {
            const query = {date: {$gt: new Date()}};
            MockClient.setDbMode('wrongret');
            mock_col.setColUnorderedBop('throw');
            const out = await instance.removeOne(query);
            expect(out).toBe(false);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([]);
        });

        it('Should throw when passed valid payload but internal deleteOne throws', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColDeleteOne('throw');
            const out = await instance.removeOne(query);
            expect(out).toBe(false);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'deleteOne', params: {options: {}, query}}]);
        });

        it('Should throw when passed valid payload but internal deleteOne returns a non-object result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColDeleteOne('wrongret');
            const out = await instance.removeOne(query);
            expect(out).toBe(false);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'deleteOne', params: {options: {}, query}}]);
        });

        it('Should throw when passed valid payload but internal deleteMany returns a non-acknowledged result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColDeleteOne('unack');
            const out = await instance.removeOne(query);
            expect(out).toBe(false);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'deleteOne', params: {options: {}, query}}]);
        });

        it('Should return true when passed valid payload and internal deleteOne returns valid result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColDeleteOne('success');
            const out = await instance.removeOne(query, {ordered: true});
            expect(out).toBe(true);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'deleteOne', params: {options: {ordered: true}, query}}]);
        });
    });

    describe('removeMany', () => {
        let instance:Query;

        beforeEach(() => {
            instance = new Query(mdb_instance, 'mycollection');
        });

        it('Should not be static', () => {
            /* @ts-ignore */
            expect(Query.removeMany).toBe(undefined);
        });

        it('Should be an async function', () => {
            expect(Validator.rules.async_function(instance.removeMany)).toBe(true);
            expect(MockClient.calls).toEqual([]);
            expect(mock_col.calls).toEqual([]);
        });

        it('Should throw when not passed a valid query object', async () => {
            for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                let val:string|boolean = false;
                try {
                    await instance.removeMany(el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@removeMany: Query should be an object with content');
                expect(MockClient.calls).toEqual([]);
                expect(mock_col.calls).toEqual([]);
            }
        });

        it('Should throw when passed options that are not an object', async () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === undefined) continue;
                let val:string|boolean = false;
                try {
                    await instance.removeMany({date: {$gt: new Date()}}, el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@removeMany: Options should be an object');
                expect(MockClient.calls).toEqual([]);
                expect(mock_col.calls).toEqual([]);
            }
        });

        it('Should return false when passed a valid payload but we fail to acquire a connection', async () => {
            const query = {date: {$gt: new Date()}};
            MockClient.setDbMode('wrongret');
            mock_col.setColUnorderedBop('throw');
            const out = await instance.removeMany(query);
            expect(out).toBe(false);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([]);
        });

        it('Should return false when passed valid payload but internal deleteMany throws', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColDeleteMany('throw');
            const out = await instance.removeMany(query);
            expect(out).toBe(false);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'deleteMany', params: {options: {}, query}}]);
        });

        it('Should return false when passed valid payload but internal deleteMany returns a non-object result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColDeleteMany('wrongret');
            const out = await instance.removeMany(query);
            expect(out).toBe(false);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'deleteMany', params: {options: {}, query}}]);
        });

        it('Should return false when passed valid payload but internal deleteMany returns a non-acknowledged result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColDeleteMany('unack');
            const out = await instance.removeMany(query);
            expect(out).toBe(false);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'deleteMany', params: {options: {}, query}}]);
        });

        it('Should return true when passed valid payload and internal deleteMany returns valid result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColDeleteMany('success');
            const out = await instance.removeMany(query, {ordered: true});
            expect(out).toBe(true);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'deleteMany', params: {options: {ordered: true}, query}}]);
        });
    });

    describe('updateOne', () => {
        let instance:Query;

        beforeEach(() => {
            instance = new Query(mdb_instance, 'mycollection');
        });

        it('Should not be static', () => {
            /* @ts-ignore */
            expect(Query.updateOne).toBe(undefined);
        });

        it('Should be an async function', () => {
            expect(Validator.rules.async_function(instance.updateOne)).toBe(true);
            expect(MockClient.calls).toEqual([]);
            expect(mock_col.calls).toEqual([]);
        });

        it('Should throw when not passed a valid query object', async () => {
            for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                let val:string|boolean = false;
                try {
                    await instance.updateOne(el, {$inc: {count: 1}});
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@updateOne: Query should be an object with content');
                expect(MockClient.calls).toEqual([]);
                expect(mock_col.calls).toEqual([]);
            }
        });

        it('Should throw when not passed a valid data object', async () => {
            for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                if (Array.isArray(el)) continue;
                let val:string|boolean = false;
                try {
                    await instance.updateOne({date: {$gt: new Date()}}, el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@updateOne: Data should be an object/array with content');
                expect(MockClient.calls).toEqual([]);
                expect(mock_col.calls).toEqual([]);
            }

            for (const el of CONSTANTS.NOT_ARRAY_WITH_EMPTY) {
                if (Validator.rules.object(el)) continue;
                let val:string|boolean = false;
                try {
                    await instance.updateOne({date: {$gt: new Date()}}, el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@updateOne: Data should be an object/array with content');
                expect(MockClient.calls).toEqual([]);
                expect(mock_col.calls).toEqual([]);
            }
        });

        it('Should throw when passed options that are not an object', async () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === undefined) continue;
                let val:string|boolean = false;
                try {
                    await instance.updateOne({date: {$gt: new Date()}}, {$inc: {count: 1}}, el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@updateOne: Options should be an object');
                expect(MockClient.calls).toEqual([]);
                expect(mock_col.calls).toEqual([]);
            }
        });

        it('Should throw when passed an update pipeline that contains non-objects', async () => {
            let val:string|boolean = false;
            try {
                await instance.updateOne({date: {$gt: new Date()}}, CONSTANTS.NOT_OBJECT_WITH_EMPTY);
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('MongoQuery@updateOne: Data pipeline is invalid');
            expect(MockClient.calls).toEqual([]);
            expect(mock_col.calls).toEqual([]);
        });

        it('Should return false passed a valid payload but we fail to acquire a connection', async () => {
            const query = {date: {$gt: new Date()}};
            MockClient.setDbMode('wrongret');
            mock_col.setColUnorderedBop('throw');
            const out = await instance.updateOne(query, {$inc: {count: 1}});
            expect(out).toBe(false);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([]);
        });

        it('Should return false passed valid payload but internal updateOne throws', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColUpdateOne('throw');
            const out = await instance.updateOne(query, {$inc: {count: 1}});
            expect(out).toBe(false);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'updateOne', params: {options: {}, query, data: {$inc: {count: 1}}}}]);
        });

        it('Should return false passed valid payload but internal updateOne returns a non-object result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColUpdateOne('wrongret');
            const out = await instance.updateOne(query, {$inc: {count: 1}}, {upsert: true});
            expect(out).toBe(false);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'updateOne', params: {options: {upsert: true}, query, data: {$inc: {count: 1}}}}]);
        });

        it('Should return false passed valid payload but internal updateOne returns a non-acknowledged result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColUpdateOne('unack');
            const out = await instance.updateOne(query, {$inc: {count: 1}}, {upsert: false});
            expect(out).toBe(false);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'updateOne', params: {options: {upsert: false}, query, data: {$inc: {count: 1}}}}]);
        });

        it('Should return true when passed valid payload and internal updateOne returns valid result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColUpdateOne('success');
            const out = await instance.updateOne(query, {$inc: {count: 1}}, {upsert: false});
            expect(out).toBe(true);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'updateOne', params: {options: {upsert: false}, query, data: {$inc: {count: 1}}}}]);
        });
    });

    describe('updateMany', () => {
        let instance:Query;

        beforeEach(() => {
            instance = new Query(mdb_instance, 'mycollection');
        });

        it('Should not be static', () => {
            /* @ts-ignore */
            expect(Query.updateMany).toBe(undefined);
        });

        it('Should be an async function', () => {
            expect(Validator.rules.async_function(instance.updateMany)).toBe(true);
            expect(MockClient.calls).toEqual([]);
            expect(mock_col.calls).toEqual([]);
        });

        it('Should throw when not passed a valid query object', async () => {
            for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                let val:string|boolean = false;
                try {
                    await instance.updateMany(el, {$inc: {count: 1}});
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@updateMany: Query should be an object with content');
                expect(MockClient.calls).toEqual([]);
                expect(mock_col.calls).toEqual([]);
            }
        });

        it('Should throw when not passed a valid data object', async () => {
            for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                if (Array.isArray(el)) continue;
                let val:string|boolean = false;
                try {
                    await instance.updateMany({date: {$gt: new Date()}}, el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@updateMany: Data should be an object/array with content');
                expect(MockClient.calls).toEqual([]);
                expect(mock_col.calls).toEqual([]);
            }

            for (const el of CONSTANTS.NOT_ARRAY_WITH_EMPTY) {
                if (Validator.rules.object(el)) continue;
                let val:string|boolean = false;
                try {
                    await instance.updateMany({date: {$gt: new Date()}}, el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@updateMany: Data should be an object/array with content');
                expect(MockClient.calls).toEqual([]);
                expect(mock_col.calls).toEqual([]);
            }
        });

        it('Should throw when passed options that are not an object', async () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === undefined) continue;
                let val:string|boolean = false;
                try {
                    await instance.updateMany({date: {$gt: new Date()}}, {$inc: {count: 1}}, el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@updateMany: Options should be an object');
                expect(MockClient.calls).toEqual([]);
                expect(mock_col.calls).toEqual([]);
            }
        });

        it('Should throw when passed an update pipeline that contains non-objects', async () => {
            let val:string|boolean = false;
            try {
                await instance.updateMany({date: {$gt: new Date()}}, CONSTANTS.NOT_OBJECT_WITH_EMPTY);
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('MongoQuery@updateMany: Data pipeline is invalid');
            expect(MockClient.calls).toEqual([]);
            expect(mock_col.calls).toEqual([]);
        });

        it('Should return false passed a valid payload but we fail to acquire a connection', async () => {
            const query = {date: {$gt: new Date()}};
            MockClient.setDbMode('wrongret');
            mock_col.setColUnorderedBop('throw');
            const out = await instance.updateMany(query, {$inc: {count: 1}});
            expect(out).toBe(false);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([]);
        });

        it('Should return false passed valid payload but internal updateMany throws', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColUpdateMany('throw');
            const out = await instance.updateMany(query, {$inc: {count: 1}});
            expect(out).toBe(false);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'updateMany', params: {options: {}, query, data: {$inc: {count: 1}}}}]);
        });

        it('Should return false passed valid payload but internal updateMany returns a non-object result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColUpdateMany('wrongret');
            const out = await instance.updateMany(query, {$inc: {count: 1}}, {upsert: true});
            expect(out).toBe(false);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'updateMany', params: {options: {upsert: true}, query, data: {$inc: {count: 1}}}}]);
        });

        it('Should return false passed valid payload but internal updateMany returns a non-acknowledged result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColUpdateMany('unack');
            const out = await instance.updateMany(query, {$inc: {count: 1}}, {upsert: false});
            expect(out).toBe(false);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'updateMany', params: {options: {upsert: false}, query, data: {$inc: {count: 1}}}}]);
        });

        it('Should return true when passed valid payload and internal updateMany returns valid result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColUpdateMany('success');
            const out = await instance.updateMany(query, {$inc: {count: 1}}, {upsert: false});
            expect(out).toBe(true);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'updateMany', params: {options: {upsert: false}, query, data: {$inc: {count: 1}}}}]);
        });
    });

    describe('insertOne', () => {
        let instance:Query;

        beforeEach(() => {
            instance = new Query(mdb_instance, 'mycollection');
        });

        it('Should not be static', () => {
            /* @ts-ignore */
            expect(Query.insertOne).toBe(undefined);
        });

        it('Should be an async function', () => {
            expect(Validator.rules.async_function(instance.insertOne)).toBe(true);
            expect(MockClient.calls).toEqual([]);
            expect(mock_col.calls).toEqual([]);
        });

        it('Should throw when not passed a valid document', async () => {
            for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                if (Array.isArray(el)) continue;
                let val:string|boolean = false;
                try {
                    await instance.insertOne(el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@insertOne: Document should be a non-empty object');
                expect(MockClient.calls).toEqual([]);
                expect(mock_col.calls).toEqual([]);
            }
        });

        it('Should throw when passed options that are not an object', async () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === undefined) continue;
                let val:string|boolean = false;
                try {
                    await instance.insertOne({uid: 'bla', name: 'Peter'}, el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@insertOne: Options should be an object');
                expect(MockClient.calls).toEqual([]);
                expect(mock_col.calls).toEqual([]);
            }
        });

        it('Should return null passed a valid payload but we fail to acquire a connection', async () => {
            MockClient.setDbMode('wrongret');
            mock_col.setColUnorderedBop('throw');
            const out = await instance.insertOne({uid: 'bla', name: 'Peter'}, {writeConcern: {w: 'majority'}});
            expect(out).toBe(null);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([]);
        });

        it('Should return null passed valid payload but internal insertOne throws', async () => {
            mock_col.setColInsertOne('throw');
            const out = await instance.insertOne({uid: 'bla', name: 'Peter'});
            expect(out).toBe(null);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'insertOne', params: {options: {}, data: {uid: 'bla', name: 'Peter'}}}]);
        });

        it('Should return null passed valid payload but internal insertOne returns a non-object result', async () => {
            mock_col.setColInsertOne('wrongret');
            const out = await instance.insertOne({uid: 'bla', name: 'Peter'}, {writeConcern: {w: 'majority'}});
            expect(out).toBe(null);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'insertOne', params: {options: {writeConcern: {w: 'majority'}}, data: {uid: 'bla', name: 'Peter'}}}]);
        });

        it('Should return null when passed valid payload but internal insertOne returns a non-acknowledged result', async () => {
            mock_col.setColInsertOne('unack');
            const out = await instance.insertOne({uid: 'bla', name: 'Peter'}, {writeConcern: {w: 'majority'}});
            expect(out).toBe(null);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'insertOne', params: {options: {writeConcern: {w: 'majority'}}, data: {uid: 'bla', name: 'Peter'}}}]);
        });

        it('Should return result when passed valid payload and internal insertOne returns valid result', async () => {
            mock_col.setColInsertOne('success');
            const out = await instance.insertOne({uid: 'bla', name: 'Peter'});
            expect(out).toBe(10);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'insertOne', params: {options: {}, data: {uid: 'bla', name: 'Peter'}}}]);
        });
    });

    describe('insertMany', () => {
        let instance:Query;

        beforeEach(() => {
            instance = new Query(mdb_instance, 'mycollection');
        });

        it('Should not be static', () => {
            /* @ts-ignore */
            expect(Query.insertMany).toBe(undefined);
        });

        it('Should be an async function', () => {
            expect(Validator.rules.async_function(instance.insertMany)).toBe(true);
            expect(MockClient.calls).toEqual([]);
            expect(mock_col.calls).toEqual([]);
        });

        it('Should throw when not passed a valid documents array', async () => {
            for (const el of CONSTANTS.NOT_ARRAY_WITH_EMPTY) {
                let val:string|boolean = false;
                try {
                    await instance.insertMany(el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@insertMany: Documents should be an array with content');
                expect(MockClient.calls).toEqual([]);
                expect(mock_col.calls).toEqual([]);
            }
        });

        it('Should throw when passed a documents array that is empty after sanitization', async () => {
            let val:string|boolean = false;
            try {
                await instance.insertMany(CONSTANTS.NOT_OBJECT_WITH_EMPTY);
            } catch (err) {
                val = (err as Error).message;
            }
            expect(val).toBe('MongoQuery@insertMany: Documents is empty after sanitization');
            expect(MockClient.calls).toEqual([]);
            expect(mock_col.calls).toEqual([]);
        });

        it('Should return false when passed a documents array but we fail to acquire a connection', async () => {
            MockClient.setDbMode('wrongret');
            mock_col.setColUnorderedBop('throw');
            const out = await instance.insertMany([
                {first_name: 'Peter', last_name: 'Vermeulen'},
                {first_name: 'Jack', last_name: 'Bauer'},
            ]);
            expect(out).toBe(false);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([]);
            expect(MockUnorderedBulkOp.calls).toEqual([]);
            expect(MockOrderedBulkOp.calls).toEqual([]);
        });

        it('Should return false when passed a documents array but we fail to create a bulk operator due to it throwing', async () => {
            mock_col.setColUnorderedBop('throw');
            const out = await instance.insertMany([
                {first_name: 'Peter', last_name: 'Vermeulen'},
                {first_name: 'Jack', last_name: 'Bauer'},
            ]);
            expect(out).toBe(false);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'initializeUnorderedBulkOp', params: {options: undefined}}]);
            expect(MockUnorderedBulkOp.calls).toEqual([]);
            expect(MockOrderedBulkOp.calls).toEqual([]);
        });

        it('Should return false when passed a documents array but we fail to create a bulk operator due to it returning a bad val', async () => {
            mock_col.setColUnorderedBop('wrongret');
            const out = await instance.insertMany([
                {first_name: 'Peter', last_name: 'Vermeulen'},
                {first_name: 'Jack', last_name: 'Bauer'},
            ]);
            expect(out).toBe(false);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'initializeUnorderedBulkOp', params: {options: undefined}}]);
            expect(MockUnorderedBulkOp.calls).toEqual([]);
            expect(MockOrderedBulkOp.calls).toEqual([]);
        });

        it('Should return false when passed a documents array but exec on bulk operator throws', async () => {
            mock_col.setColUnorderedBop('success');
            MockUnorderedBulkOp.setModeExec('throw');
            const out = await instance.insertMany([
                {first_name: 'Peter', last_name: 'Vermeulen'},
                {first_name: 'Jack', last_name: 'Bauer'},
            ]);
            expect(out).toBe(false);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'initializeUnorderedBulkOp', params: {options: undefined}}]);
            expect(MockUnorderedBulkOp.calls).toEqual([
                {key: 'ctor', params: {opts: undefined}},
                {key: 'insert', params: {doc: {first_name: 'Peter', last_name: 'Vermeulen'}, opts: {}}},
                {key: 'insert', params: {doc: {first_name: 'Jack', last_name: 'Bauer'}, opts: {}}},
                {key: 'execute', params: {opts: {}}},
            ]);
            expect(MockOrderedBulkOp.calls).toEqual([]);
        });

        it('Should return false when passed a document array and execute succeeds but not all documents were inserted', async () => {
            mock_col.setColUnorderedBop('success');
            MockUnorderedBulkOp.setModeExec('success');
            const out = await instance.insertMany([
                {first_name: 'Peter', last_name: 'Vermeulen'},
                {first_name: 'Jack', last_name: 'Bauer'},
            ]);
            expect(out).toBe(false);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'initializeUnorderedBulkOp', params: {options: undefined}}]);
            expect(MockUnorderedBulkOp.calls).toEqual([
                {key: 'ctor', params: {opts: undefined}},
                {key: 'insert', params: {doc: {first_name: 'Peter', last_name: 'Vermeulen'}, opts: {}}},
                {key: 'insert', params: {doc: {first_name: 'Jack', last_name: 'Bauer'}, opts: {}}},
                {key: 'execute', params: {opts: {}}},
            ]);
            expect(MockOrderedBulkOp.calls).toEqual([]);
        });

        it('Should succeed when passed a document array and all documents were inserted', async () => {
            mock_col.setColUnorderedBop('success');
            MockUnorderedBulkOp.setModeExec('success', {insertedCount: 2});
            const out = await instance.insertMany([
                {first_name: 'Peter', last_name: 'Vermeulen'},
                {first_name: 'Jack', last_name: 'Bauer'},
            ]);
            expect(out).toBe(true);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'initializeUnorderedBulkOp', params: {options: undefined}}]);
            expect(MockUnorderedBulkOp.calls).toEqual([
                {key: 'ctor', params: {opts: undefined}},
                {key: 'insert', params: {doc: {first_name: 'Peter', last_name: 'Vermeulen'}, opts: {}}},
                {key: 'insert', params: {doc: {first_name: 'Jack', last_name: 'Bauer'}, opts: {}}},
                {key: 'execute', params: {opts: {}}},
            ]);
            expect(MockOrderedBulkOp.calls).toEqual([]);
        });
    });

    describe('bulkOps', () => {
        let instance:Query;

        beforeEach(() => {
            instance = new Query(mdb_instance, 'mycollection');
        });

        it('Should not be static', () => {
            /* @ts-ignore */
            expect(Query.bulkOps).toBe(undefined);
        });

        it('Should be an async function', () => {
            expect(Validator.rules.async_function(instance.bulkOps)).toBe(true);
            expect(MockClient.calls).toEqual([]);
            expect(mock_col.calls).toEqual([]);
        });

        it('Should throw when passed a non-function fn', async () => {
            for (const el of CONSTANTS.NOT_FUNCTION) {
                let val:string|boolean = false;
                try {
                    await instance.bulkOps(el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@bulkOps: Fn should be a function');
            }
            expect(MockClient.calls).toEqual([]);
            expect(mock_col.calls).toEqual([]);
            expect(MockUnorderedBulkOp.calls).toEqual([]);
            expect(MockOrderedBulkOp.calls).toEqual([]);
        });

        it('Should throw when passed a non-boolean sort', async () => {
            for (const el of CONSTANTS.NOT_BOOLEAN) {
                if (el === undefined) continue;

                let val:string|boolean = false;
                try {
                    await instance.bulkOps(operator => operator.insert({bla: true}), el);
                } catch (err) {
                    val = (err as Error).message;
                }
                expect(val).toBe('MongoQuery@bulkOps: Sorted should be a boolean');
            }
            expect(MockClient.calls).toEqual([]);
            expect(mock_col.calls).toEqual([]);
            expect(MockUnorderedBulkOp.calls).toEqual([]);
            expect(MockOrderedBulkOp.calls).toEqual([]);
        });

        it('Should throw when passed a valid payload but fail to acquire a connection', async () => {
            mock_col.setColUnorderedBop('throw');
            MockClient.setDbMode('wrongret');

            const val = await instance.bulkOps(operator => operator.insert({bla: true}), false);
            expect(val).toBe(null);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([]);
            expect(MockUnorderedBulkOp.calls).toEqual([]);
            expect(MockOrderedBulkOp.calls).toEqual([]);
        });

        it('Should return null when passed a valid payload but fail to acquire an unordered bulk operator due to it throwing', async () => {
            mock_col.setColUnorderedBop('throw');

            const val = await instance.bulkOps(operator => operator.insert({bla: true}), false);
            expect(val).toBe(null);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'initializeUnorderedBulkOp', params: {options: undefined}}]);
            expect(MockUnorderedBulkOp.calls).toEqual([]);
            expect(MockOrderedBulkOp.calls).toEqual([]);
        });

        it('Should return null when passed a valid payload but fail to acquire an ordered bulk operator due to it throwing', async () => {
            mock_col.setColOrderedBop('throw');

            const val = await instance.bulkOps(operator => operator.insert({bla: true}), true);
            expect(val).toBe(null);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'initializeOrderedBulkOp', params: {options: undefined}}]);
            expect(MockUnorderedBulkOp.calls).toEqual([]);
            expect(MockOrderedBulkOp.calls).toEqual([]);
        });

        it('Should return null when passed a valid payload but fail to acquire an unordered bulk operator due to returning wrong', async () => {
            mock_col.setColUnorderedBop('wrongret');

            const val = await instance.bulkOps(operator => operator.insert({bla: true}), false);
            expect(val).toBe(null);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'initializeUnorderedBulkOp', params: {options: undefined}}]);
            expect(MockUnorderedBulkOp.calls).toEqual([]);
            expect(MockOrderedBulkOp.calls).toEqual([]);
        });

        it('Should return null when passed a valid payload but fail to acquire an ordered bulk operator due to returning wrong', async () => {
            mock_col.setColOrderedBop('wrongret');

            const val = await instance.bulkOps(operator => operator.insert({bla: true}), true);
            expect(val).toBe(null);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'initializeOrderedBulkOp', params: {options: undefined}}]);
            expect(MockUnorderedBulkOp.calls).toEqual([]);
            expect(MockOrderedBulkOp.calls).toEqual([]);
        });

        it('Should return null when passed a valid payload but fail to acquire an unordered bulk operator due to exec throw', async () => {
            mock_col.setColUnorderedBop('success');
            MockUnorderedBulkOp.setModeExec('throw');

            const val = await instance.bulkOps(operator => operator.insert({bla: true}), false);
            expect(val).toBe(null);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'initializeUnorderedBulkOp', params: {options: undefined}}]);
            expect(MockUnorderedBulkOp.calls).toEqual([
                {key: 'ctor', params: {opts: undefined}},
                {key: 'insert', params: {doc: {bla: true}, opts: {}}},
                {key: 'execute', params: {opts: {}}},
            ]);
            expect(MockOrderedBulkOp.calls).toEqual([]);
        });

        it('Should return null when passed a valid payload but fail to acquire an ordered bulk operator due to exec throw', async () => {
            mock_col.setColOrderedBop('success');
            MockOrderedBulkOp.setModeExec('throw');

            const val = await instance.bulkOps(operator => operator.insert({bla: true}), true);
            expect(val).toBe(null);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'initializeOrderedBulkOp', params: {options: undefined}}]);
            expect(MockUnorderedBulkOp.calls).toEqual([]);
            expect(MockOrderedBulkOp.calls).toEqual([
                {key: 'ctor', params: {opts: undefined}},
                {key: 'insert', params: {doc: {bla: true}, opts: {}}},
                {key: 'execute', params: {opts: {}}},
            ]);
        });

        it('Should return null when passed a valid payload but fail to acquire an unordered bulk operator due to exec wrong return', async () => {
            mock_col.setColUnorderedBop('success');
            MockUnorderedBulkOp.setModeExec('wrongret');

            const val = await instance.bulkOps(operator => operator.insert({bla: true}), false);
            expect(val).toBe(null);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'initializeUnorderedBulkOp', params: {options: undefined}}]);
            expect(MockUnorderedBulkOp.calls).toEqual([
                {key: 'ctor', params: {opts: undefined}},
                {key: 'insert', params: {doc: {bla: true}, opts: {}}},
                {key: 'execute', params: {opts: {}}},
            ]);
            expect(MockOrderedBulkOp.calls).toEqual([]);
        });

        it('Should return null when passed a valid payload but fail to acquire an ordered bulk operator due to exec wrong return', async () => {
            mock_col.setColOrderedBop('success');
            MockOrderedBulkOp.setModeExec('wrongret');

            const val = await instance.bulkOps(operator => operator.insert({bla: true}), true);
            expect(val).toBe(null);
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'initializeOrderedBulkOp', params: {options: undefined}}]);
            expect(MockUnorderedBulkOp.calls).toEqual([]);
            expect(MockOrderedBulkOp.calls).toEqual([
                {key: 'ctor', params: {opts: undefined}},
                {key: 'insert', params: {doc: {bla: true}, opts: {}}},
                {key: 'execute', params: {opts: {}}},
            ]);
        });

        it('Should succeed when passed a valid payload and unordered bulk operator exec goes right', async () => {
            mock_col.setColUnorderedBop('success');
            MockUnorderedBulkOp.setModeExec('success', {yay: true});

            const out = await instance.bulkOps(operator => operator.insert({bla: true}), false);
            expect(out).toEqual({yay: true});
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'initializeUnorderedBulkOp', params: {options: undefined}}]);
            expect(MockUnorderedBulkOp.calls).toEqual([
                {key: 'ctor', params: {opts: undefined}},
                {key: 'insert', params: {doc: {bla: true}, opts: {}}},
                {key: 'execute', params: {opts: {}}},
            ]);
            expect(MockOrderedBulkOp.calls).toEqual([]);
        });

        it('Should succeed when passed a valid payload and ordered bulk operator exec goes right', async () => {
            mock_col.setColOrderedBop('success');
            MockOrderedBulkOp.setModeExec('success', {yay: true});

            const out = await instance.bulkOps(operator => operator.insert({bla: true}), true);
            expect(out).toEqual({yay: true});
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'initializeOrderedBulkOp', params: {options: undefined}}]);
            expect(MockUnorderedBulkOp.calls).toEqual([]);
            expect(MockOrderedBulkOp.calls).toEqual([
                {key: 'ctor', params: {opts: undefined}},
                {key: 'insert', params: {doc: {bla: true}, opts: {}}},
                {key: 'execute', params: {opts: {}}},
            ]);
        });

        it('Should allow using an async function', async () => {
            mock_col.setColOrderedBop('success');
            MockOrderedBulkOp.setModeExec('success', {yay: true});

            const out = await instance.bulkOps(async operator => operator.insert({bla: true}), true);
            expect(out).toEqual({yay: true});
            expect(MockClient.calls).toEqual([{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            expect(mock_col.calls).toEqual([{key: 'initializeOrderedBulkOp', params: {options: undefined}}]);
            expect(MockUnorderedBulkOp.calls).toEqual([]);
            expect(MockOrderedBulkOp.calls).toEqual([
                {key: 'ctor', params: {opts: undefined}},
                {key: 'insert', params: {doc: {bla: true}, opts: {}}},
                {key: 'execute', params: {opts: {}}},
            ]);
        });
    });
});
