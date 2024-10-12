/* eslint-disable max-lines */

import Validator                                from '@valkyriestudios/validator';
import {describe, it, beforeEach, afterEach}    from 'node:test';
import * as assert                              from 'node:assert/strict';
import Query                                    from '../../lib/Query';
import DBMongo                                  from '../../lib';
import CONSTANTS                                from '../constants';
import MockCollection                           from '../MockCollection';
import MockClient                               from '../MockClient';
import MockDb                                   from '../MockDb';
import MockUnorderedBulkOp                      from '../MockUnorderedBulkOp';
import MockOrderedBulkOp                        from '../MockOrderedBulkOp';
import MockFn                                   from '../MockFn';

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
    let mdb_instance;

    beforeEach(() => {
        mockConsoleInfo.mock(console, 'info');
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
        MockClient.restore();
    });

    describe('ctor', () => {
        it('Should throw when not passed an instance of Mongo', () => {
            for (const el of [...CONSTANTS.NOT_OBJECT_WITH_EMPTY, {foo: 'bar'}]) {
                assert.throws(
                    () => new Query(el, 'mycol'),
                    new Error('MongoQuery: Expected instance of Mongo')
                );
            }
        });

        it('Should throw when not passed a valid collection name', () => {
            for (const el of CONSTANTS.NOT_STRING_WITH_EMPTY) {
                assert.throws(
                    () => new Query(mdb_instance, el),
                    new Error('MongoQuery: Expected collection to be a non-empty string')
                );
            }
        });

        it('Should not throw when passed an instance of collection', () => {
            /* @ts-ignore */
            assert.doesNotThrow(() => new Query(mdb_instance, 'mycollection'));
            assert.deepEqual(mock_col.calls, []);
        });
    });

    describe('count', () => {
        let instance:Query;

        beforeEach(() => {
            instance = new Query(mdb_instance, 'mycollection');
        });

        it('Should not be static', () => {
            /* @ts-ignore */
            assert.ok(Query.count === undefined);
        });

        it('Should be an async function', () => {
            assert.ok(Validator.rules.async_function(instance.count));
            assert.deepEqual(MockClient.calls, []);
            assert.deepEqual(mock_col.calls, []);
        });

        it('Should throw when passed options that are not an object or undefined', async () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === undefined) continue;
                let val = false;
                try {
                    await instance.count({}, el);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'MongoQuery@count: Options should be an object');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mock_col.calls, []);
            }
        });

        it('Should throw when passed a filter that is not undefined an object or a valid pipeline', async () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === undefined || (Array.isArray(el) && el.length)) continue;
                let val = false;
                try {
                    await instance.count(el);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'MongoQuery@count: Invalid filter passed');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mock_col.calls, []);
            }
        });

        describe('filter', () => {
            it('Should throw when passed a valid payload but we fail to acquire a connection', async () => {
                const query = {date: {$gt: new Date()}};
                MockClient.setDbMode('wrongret');
                mock_col.setColUnorderedBop('throw');
                let val = false;
                try {
                    await instance.count(query);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'MongoQuery@count: Failed - Mongo@connect: Failed to create database instance');
                assert.deepEqual(MockClient.calls, [
                    {key: 'connect', params: EXPECTED_CON_PAYLOAD},
                    {key: 'db', params: EXPECTED_DB_PAYLOAD},
                ]);
                assert.deepEqual(mock_col.calls, []);
            });

            it('Should throw when passed valid payload but internal count throws', async () => {
                const query = {date: {$gt: new Date()}};
                mock_col.setColCount('throw');
                let val = false;
                try {
                    await instance.count(query);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'MongoQuery@count: Failed - MockCollection@count: Oh No!');
                assert.deepEqual(MockClient.calls, [
                    {key: 'connect', params: EXPECTED_CON_PAYLOAD},
                    {key: 'db', params: EXPECTED_DB_PAYLOAD},
                ]);
                assert.deepEqual(mock_col.calls, [{key: 'count', params: {options: {}, query}}]);
            });

            it('Should throw when passed valid payload but internal count returns a wrong result', async () => {
                const query = {date: {$gt: new Date()}};
                mock_col.setColCount('wrongret');
                let val = false;
                try {
                    await instance.count(query);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'MongoQuery@count: Failed - Unexpected result');
                assert.deepEqual(MockClient.calls, [
                    {key: 'connect', params: EXPECTED_CON_PAYLOAD},
                    {key: 'db', params: EXPECTED_DB_PAYLOAD},
                ]);
                assert.deepEqual(mock_col.calls, [{key: 'count', params: {options: {}, query}}]);
            });

            it('Should return count when passed valid payload and count succeeds', async () => {
                const query = {date: {$gt: new Date()}};
                mock_col.setColCount('success');
                const out = await instance.count(query);
                assert.equal(out, 20);
                assert.deepEqual(MockClient.calls, [
                    {key: 'connect', params: EXPECTED_CON_PAYLOAD},
                    {key: 'db', params: EXPECTED_DB_PAYLOAD},
                ]);
                assert.deepEqual(mock_col.calls, [{key: 'count', params: {options: {}, query}}]);
            });

            it('Should allow passing empty query', async () => {
                mock_col.setColCount('success');
                const out = await instance.count({});
                assert.equal(out, 20);
                assert.deepEqual(MockClient.calls, [
                    {key: 'connect', params: EXPECTED_CON_PAYLOAD},
                    {key: 'db', params: EXPECTED_DB_PAYLOAD},
                ]);
                assert.deepEqual(mock_col.calls, [{key: 'count', params: {options: {}, query: {}}}]);
            });

            it('Should allow passing options for query', async () => {
                mock_col.setColCount('success');
                const out = await instance.count({}, {allowDiskUse: true});
                assert.equal(out, 20);
                assert.deepEqual(MockClient.calls, [
                    {key: 'connect', params: EXPECTED_CON_PAYLOAD},
                    {key: 'db', params: EXPECTED_DB_PAYLOAD},
                ]);
                assert.deepEqual(mock_col.calls, [{key: 'count', params: {options: {allowDiskUse: true}, query: {}}}]);
            });
        });

        describe('aggregate', () => {
            it('Should throw when passed a valid payload but we fail to acquire a connection', async () => {
                const query = [{$match: {date: {$gt: new Date()}}}];
                MockClient.setDbMode('wrongret');
                mock_col.setColUnorderedBop('throw');
                let val = false;
                try {
                    await instance.count(query);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'MongoQuery@count: Failed - Mongo@connect: Failed to create database instance');
                assert.deepEqual(MockClient.calls, [
                    {key: 'connect', params: EXPECTED_CON_PAYLOAD},
                    {key: 'db', params: EXPECTED_DB_PAYLOAD},
                ]);
                assert.deepEqual(mock_col.calls, []);
            });

            it('Should throw when passed valid payload but internal aggregate throws', async () => {
                const query = [{$match: {date: {$gt: new Date()}}}];
                mock_col.setColAggregate('throw');
                let val = false;
                try {
                    await instance.count(query);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'MongoQuery@count: Failed - MockCollection@aggregate: Oh No!');
                assert.deepEqual(MockClient.calls, [
                    {key: 'connect', params: EXPECTED_CON_PAYLOAD},
                    {key: 'db', params: EXPECTED_DB_PAYLOAD},
                ]);
                assert.deepEqual(mock_col.calls, [{key: 'aggregate', params: {options: {}, pipeline: [
                    ...query,
                    {$count: 'count'},
                ]}}]);
            });

            it('Should throw when passed valid payload but aggregate returns non-array result', async () => {
                const query = [{$match: {date: {$gt: new Date()}}}];
                mock_col.setColAggregate('wrongret');
                let val = false;
                try {
                    await instance.count(query);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'MongoQuery@count: Failed - Unexpected result');
                assert.deepEqual(MockClient.calls, [
                    {key: 'connect', params: EXPECTED_CON_PAYLOAD},
                    {key: 'db', params: EXPECTED_DB_PAYLOAD},
                ]);
                assert.deepEqual(mock_col.calls, [{key: 'aggregate', params: {options: {}, pipeline: [
                    ...query,
                    {$count: 'count'},
                ]}}]);
            });

            it('Should not throw and return data when passed valid payload and aggregate returns result', async () => {
                const query = [{$match: {date: {$gt: new Date()}}}];
                mock_col.setColAggregate('success', [{count: 5}]);
                const out = await instance.count(query);
                assert.equal(out, 5);
                assert.deepEqual(MockClient.calls, [
                    {key: 'connect', params: EXPECTED_CON_PAYLOAD},
                    {key: 'db', params: EXPECTED_DB_PAYLOAD},
                ]);
                assert.deepEqual(mock_col.calls, [{key: 'aggregate', params: {options: {}, pipeline: [
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
            assert.ok(Query.aggregate === undefined);
        });

        it('Should be an async function', () => {
            assert.ok(Validator.rules.async_function(instance.aggregate));
            assert.deepEqual(MockClient.calls, []);
            assert.deepEqual(mock_col.calls, []);
        });

        it('Should throw when not passed a valid pipeline array', async () => {
            for (const el of CONSTANTS.NOT_ARRAY_WITH_EMPTY) {
                let val = false;
                try {
                    await instance.aggregate(el);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'MongoQuery@aggregrate: Pipeline should be an array with content');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mock_col.calls, []);
            }
        });

        it('Should throw when passed options that are not an object', async () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === undefined) continue;
                let val = false;
                try {
                    await instance.aggregate([{$match: {date: {$gt: new Date()}}}], el);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'MongoQuery@aggregate: Options should be an object');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mock_col.calls, []);
            }
        });

        it('Should throw when passed a pipeline array that is empty after sanitization', async () => {
            let val = false;
            try {
                await instance.aggregate(CONSTANTS.NOT_OBJECT_WITH_EMPTY);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@aggregate: Pipeline is empty after sanitization');
            assert.deepEqual(MockClient.calls, []);
            assert.deepEqual(mock_col.calls, []);
        });

        it('Should throw when passed a valid payload but we fail to acquire a connection', async () => {
            const pipeline = [{$match: {date: {$gt: new Date()}}}];
            MockClient.setDbMode('wrongret');
            mock_col.setColUnorderedBop('throw');
            let val = false;
            try {
                await instance.aggregate(pipeline);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@aggregate: Failed - Mongo@connect: Failed to create database instance');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, []);
        });

        it('Should throw when passed valid payload but internal aggregate throws', async () => {
            const pipeline = [{$match: {date: {$gt: new Date()}}}];
            mock_col.setColAggregate('throw');
            let val = false;
            try {
                await instance.aggregate(pipeline);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@aggregate: Failed - MockCollection@aggregate: Oh No!');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'aggregate', params: {options: {}, pipeline}}]);
        });

        it('Should throw when passed valid payload but aggregate returns non-array result', async () => {
            const pipeline = [{$match: {date: {$gt: new Date()}}}];
            mock_col.setColAggregate('wrongret');
            let val = false;
            try {
                await instance.aggregate(pipeline, {allowDiskUse: true});
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@aggregate: Failed - Unexpected result');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'aggregate', params: {options: {allowDiskUse: true}, pipeline}}]);
        });

        it('Should not throw and return data when passed valid payload and aggregate returns result', async () => {
            const pipeline = [{$match: {date: {$gt: new Date()}}}];
            mock_col.setColAggregate('success');
            const out = await instance.aggregate(pipeline, {allowDiskUse: true});
            assert.deepEqual(out, [{bla: 'bla'}]);
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'aggregate', params: {options: {allowDiskUse: true}, pipeline}}]);
        });
    });

    describe('findOne', () => {
        let instance:Query;

        beforeEach(() => {
            instance = new Query(mdb_instance, 'mycollection');
        });

        it('Should not be static', () => {
            /* @ts-ignore */
            assert.ok(Query.findOne === undefined);
        });

        it('Should be an async function', () => {
            assert.ok(Validator.rules.async_function(instance.findOne));
            assert.deepEqual(MockClient.calls, []);
            assert.deepEqual(mock_col.calls, []);
        });

        it('Should throw when not passed a valid query', async () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === undefined) continue;

                let val = false;
                try {
                    await instance.findOne(el);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'MongoQuery@findOne: If passed, query should be an object');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mock_col.calls, []);
            }
        });

        it('Should throw when passed projection that is not an object', async () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === undefined) continue;
                let val = false;
                try {
                    await instance.findOne({date: {$gt: new Date()}}, el);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'MongoQuery@findOne: If passed, projection should be an object');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mock_col.calls, []);
            }
        });

        it('Should throw when passed a valid payload but we fail to acquire a connection', async () => {
            const query = {date: {$gt: new Date()}};
            MockClient.setDbMode('wrongret');
            mock_col.setColUnorderedBop('throw');
            let val = false;
            try {
                await instance.findOne(query);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@findOne: Failed - Mongo@connect: Failed to create database instance');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, []);
        });

        it('Should throw when passed valid payload but internal aggregate throws', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColAggregate('throw');
            let val = false;
            try {
                await instance.findOne(query);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@findOne: Failed - MockCollection@aggregate: Oh No!');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'aggregate', params: {options: {}, pipeline: [
                {$match: query},
                {$limit: 1},
            ]}}]);
        });

        it('Should throw when passed valid payload but aggregate returns non-array result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColAggregate('wrongret');
            let val = false;
            try {
                await instance.findOne(query);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@findOne: Failed - Unexpected result');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'aggregate', params: {options: {}, pipeline: [
                {$match: query},
                {$limit: 1},
            ]}}]);
        });

        it('Should not throw and return data when passed valid payload and aggregate returns result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColAggregate('success');
            const out = await instance.findOne(query);
            assert.deepEqual(out, {bla: 'bla'});
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'aggregate', params: {options: {}, pipeline: [
                {$match: query},
                {$limit: 1},
            ]}}]);
        });

        it('Should not throw and return data when passed no query payload and aggregate returns result', async () => {
            mock_col.setColAggregate('success');
            const out = await instance.findOne();
            assert.deepEqual(out, {bla: 'bla'});
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'aggregate', params: {options: {}, pipeline: [
                {$limit: 1},
            ]}}]);
        });

        it('Should not throw and return data when passed empty query payload and aggregate returns result', async () => {
            mock_col.setColAggregate('success');
            const out = await instance.findOne({});
            assert.deepEqual(out, {bla: 'bla'});
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'aggregate', params: {options: {}, pipeline: [
                {$limit: 1},
            ]}}]);
        });

        it('Should not throw and return data when passed empty projection payload and aggregate returns result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColAggregate('success');
            const out = await instance.findOne(query, {});
            assert.deepEqual(out, {bla: 'bla'});
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'aggregate', params: {options: {}, pipeline: [
                {$match: query},
                {$limit: 1},
            ]}}]);
        });

        it('Should not throw and return data when passed projection payload and aggregate returns result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColAggregate('success');
            const out = await instance.findOne(query, {_id: 0, name: 1});
            assert.deepEqual(out, {bla: 'bla'});
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'aggregate', params: {options: {}, pipeline: [
                {$match: query},
                {$limit: 1},
                {$project: {_id: 0, name: 1}},
            ]}}]);
        });

        it('Should not throw and return data when passed empty query and projection payload and aggregate returns result', async () => {
            mock_col.setColAggregate('success');
            const out = await instance.findOne({}, {_id: 0, name: 1});
            assert.deepEqual(out, {bla: 'bla'});
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'aggregate', params: {options: {}, pipeline: [
                {$limit: 1},
                {$project: {_id: 0, name: 1}},
            ]}}]);
        });
    });

    describe('removeOne', () => {
        let instance:Query;

        beforeEach(() => {
            instance = new Query(mdb_instance, 'mycollection');
        });

        it('Should not be static', () => {
            /* @ts-ignore */
            assert.ok(Query.removeOne === undefined);
        });

        it('Should be an async function', () => {
            assert.ok(Validator.rules.async_function(instance.removeOne));
            assert.deepEqual(MockClient.calls, []);
            assert.deepEqual(mock_col.calls, []);
        });

        it('Should throw when not passed a valid query object', async () => {
            for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                let val = false;
                try {
                    await instance.removeOne(el);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'MongoQuery@removeOne: Query should be an object with content');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mock_col.calls, []);
            }
        });

        it('Should throw when passed options that are not an object', async () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === undefined) continue;
                let val = false;
                try {
                    await instance.removeOne({date: {$gt: new Date()}}, el);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'MongoQuery@removeOne: Options should be an object');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mock_col.calls, []);
            }
        });

        it('Should throw when passed a valid payload but we fail to acquire a connection', async () => {
            const query = {date: {$gt: new Date()}};
            MockClient.setDbMode('wrongret');
            mock_col.setColUnorderedBop('throw');
            let val = false;
            try {
                await instance.removeOne(query);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@removeOne: Failed - Mongo@connect: Failed to create database instance');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, []);
        });

        it('Should throw when passed valid payload but internal deleteOne throws', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColDeleteOne('throw');
            let val = false;
            try {
                await instance.removeOne(query);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@removeOne: Failed - MockCollection@deleteOne: Oh No!');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'deleteOne', params: {options: {}, query}}]);
        });

        it('Should throw when passed valid payload but internal deleteOne returns a non-object result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColDeleteOne('wrongret');
            let val = false;
            try {
                await instance.removeOne(query);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@removeOne: Failed - Unacknowledged');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'deleteOne', params: {options: {}, query}}]);
        });

        it('Should throw when passed valid payload but internal deleteMany returns a non-acknowledged result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColDeleteOne('unack');
            let val = false;
            try {
                await instance.removeOne(query);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@removeOne: Failed - Unacknowledged');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'deleteOne', params: {options: {}, query}}]);
        });

        it('Should return result when passed valid payload and internal deleteOne returns valid result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColDeleteOne('success');
            const out = await instance.removeOne(query, {ordered: true});
            assert.deepEqual(out, {acknowledged: true, deletedCount: 1});
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'deleteOne', params: {options: {ordered: true}, query}}]);
        });
    });

    describe('removeMany', () => {
        let instance:Query;

        beforeEach(() => {
            instance = new Query(mdb_instance, 'mycollection');
        });

        it('Should not be static', () => {
            /* @ts-ignore */
            assert.ok(Query.removeMany === undefined);
        });

        it('Should be an async function', () => {
            assert.ok(Validator.rules.async_function(instance.removeMany));
            assert.deepEqual(MockClient.calls, []);
            assert.deepEqual(mock_col.calls, []);
        });

        it('Should throw when not passed a valid query object', async () => {
            for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                let val = false;
                try {
                    await instance.removeMany(el);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'MongoQuery@removeMany: Query should be an object with content');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mock_col.calls, []);
            }
        });

        it('Should throw when passed options that are not an object', async () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === undefined) continue;
                let val = false;
                try {
                    await instance.removeMany({date: {$gt: new Date()}}, el);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'MongoQuery@removeMany: Options should be an object');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mock_col.calls, []);
            }
        });

        it('Should throw when passed a valid payload but we fail to acquire a connection', async () => {
            const query = {date: {$gt: new Date()}};
            MockClient.setDbMode('wrongret');
            mock_col.setColUnorderedBop('throw');
            let val = false;
            try {
                await instance.removeMany(query);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@removeMany: Failed - Mongo@connect: Failed to create database instance');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, []);
        });

        it('Should throw when passed valid payload but internal deleteMany throws', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColDeleteMany('throw');
            let val = false;
            try {
                await instance.removeMany(query);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@removeMany: Failed - MockCollection@deleteMany: Oh No!');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'deleteMany', params: {options: {}, query}}]);
        });

        it('Should throw when passed valid payload but internal deleteMany returns a non-object result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColDeleteMany('wrongret');
            let val = false;
            try {
                await instance.removeMany(query);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@removeMany: Failed - Unacknowledged');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'deleteMany', params: {options: {}, query}}]);
        });

        it('Should throw when passed valid payload but internal deleteMany returns a non-acknowledged result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColDeleteMany('unack');
            let val = false;
            try {
                await instance.removeMany(query);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@removeMany: Failed - Unacknowledged');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'deleteMany', params: {options: {}, query}}]);
        });

        it('Should return result when passed valid payload and internal deleteMany returns valid result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColDeleteMany('success');
            const out = await instance.removeMany(query, {ordered: true});
            assert.deepEqual(out, {deletedCount: 42, acknowledged: true});
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'deleteMany', params: {options: {ordered: true}, query}}]);
        });
    });

    describe('updateOne', () => {
        let instance:Query;

        beforeEach(() => {
            instance = new Query(mdb_instance, 'mycollection');
        });

        it('Should not be static', () => {
            /* @ts-ignore */
            assert.ok(Query.updateOne === undefined);
        });

        it('Should be an async function', () => {
            assert.ok(Validator.rules.async_function(instance.updateOne));
            assert.deepEqual(MockClient.calls, []);
            assert.deepEqual(mock_col.calls, []);
        });

        it('Should throw when not passed a valid query object', async () => {
            for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                let val = false;
                try {
                    await instance.updateOne(el, {$inc: {count: 1}});
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'MongoQuery@updateOne: Query should be an object with content');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mock_col.calls, []);
            }
        });

        it('Should throw when not passed a valid data object', async () => {
            for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                if (Array.isArray(el)) continue;
                let val = false;
                try {
                    await instance.updateOne({date: {$gt: new Date()}}, el);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'MongoQuery@updateOne: Data should be an object/array with content');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mock_col.calls, []);
            }

            for (const el of CONSTANTS.NOT_ARRAY_WITH_EMPTY) {
                if (Validator.rules.object(el)) continue;
                let val = false;
                try {
                    await instance.updateOne({date: {$gt: new Date()}}, el);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'MongoQuery@updateOne: Data should be an object/array with content');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mock_col.calls, []);
            }
        });

        it('Should throw when passed options that are not an object', async () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === undefined) continue;
                let val = false;
                try {
                    await instance.updateOne({date: {$gt: new Date()}}, {$inc: {count: 1}}, el);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'MongoQuery@updateOne: Options should be an object');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mock_col.calls, []);
            }
        });

        it('Should throw when passed an update pipeline that contains non-objects', async () => {
            let val = false;
            try {
                await instance.updateOne({date: {$gt: new Date()}}, CONSTANTS.NOT_OBJECT_WITH_EMPTY);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@updateOne: Data pipeline is invalid');
            assert.deepEqual(MockClient.calls, []);
            assert.deepEqual(mock_col.calls, []);
        });

        it('Should throw when passed a valid payload but we fail to acquire a connection', async () => {
            const query = {date: {$gt: new Date()}};
            MockClient.setDbMode('wrongret');
            mock_col.setColUnorderedBop('throw');
            let val = false;
            try {
                await instance.updateOne(query, {$inc: {count: 1}});
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@updateOne: Failed - Mongo@connect: Failed to create database instance');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, []);
        });

        it('Should throw when passed valid payload but internal updateOne throws', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColUpdateOne('throw');
            let val = false;
            try {
                await instance.updateOne(query, {$inc: {count: 1}});
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@updateOne: Failed - MockCollection@updateOne: Oh No!');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'updateOne', params: {options: {}, query, data: {$inc: {count: 1}}}}]);
        });

        it('Should throw when passed valid payload but internal updateOne returns a non-object result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColUpdateOne('wrongret');
            let val = false;
            try {
                await instance.updateOne(query, {$inc: {count: 1}}, {upsert: true});
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@updateOne: Failed - Unacknowledged');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'updateOne', params: {options: {upsert: true}, query, data: {$inc: {count: 1}}}}]);
        });

        it('Should throw when passed valid payload but internal updateOne returns a non-acknowledged result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColUpdateOne('unack');
            let val = false;
            try {
                await instance.updateOne(query, {$inc: {count: 1}}, {upsert: false});
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@updateOne: Failed - Unacknowledged');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'updateOne', params: {options: {upsert: false}, query, data: {$inc: {count: 1}}}}]);
        });

        it('Should return result when passed valid payload and internal updateOne returns valid result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColUpdateOne('success');
            const out = await instance.updateOne(query, {$inc: {count: 1}}, {upsert: false});
            assert.deepEqual(out, {matchedCount: 1, modifiedCount: 1, upsertedCount: 0, acknowledged: true});
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'updateOne', params: {options: {upsert: false}, query, data: {$inc: {count: 1}}}}]);
        });
    });

    describe('updateMany', () => {
        let instance:Query;

        beforeEach(() => {
            instance = new Query(mdb_instance, 'mycollection');
        });

        it('Should not be static', () => {
            /* @ts-ignore */
            assert.ok(Query.updateMany === undefined);
        });

        it('Should be an async function', () => {
            assert.ok(Validator.rules.async_function(instance.updateMany));
            assert.deepEqual(MockClient.calls, []);
            assert.deepEqual(mock_col.calls, []);
        });

        it('Should throw when not passed a valid query object', async () => {
            for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                let val = false;
                try {
                    await instance.updateMany(el, {$inc: {count: 1}});
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'MongoQuery@updateMany: Query should be an object with content');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mock_col.calls, []);
            }
        });

        it('Should throw when not passed a valid data object', async () => {
            for (const el of CONSTANTS.NOT_OBJECT_WITH_EMPTY) {
                if (Array.isArray(el)) continue;
                let val = false;
                try {
                    await instance.updateMany({date: {$gt: new Date()}}, el);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'MongoQuery@updateMany: Data should be an object/array with content');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mock_col.calls, []);
            }

            for (const el of CONSTANTS.NOT_ARRAY_WITH_EMPTY) {
                if (Validator.rules.object(el)) continue;
                let val = false;
                try {
                    await instance.updateMany({date: {$gt: new Date()}}, el);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'MongoQuery@updateMany: Data should be an object/array with content');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mock_col.calls, []);
            }
        });

        it('Should throw when passed options that are not an object', async () => {
            for (const el of CONSTANTS.NOT_OBJECT) {
                if (el === undefined) continue;
                let val = false;
                try {
                    await instance.updateMany({date: {$gt: new Date()}}, {$inc: {count: 1}}, el);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'MongoQuery@updateMany: Options should be an object');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mock_col.calls, []);
            }
        });

        it('Should throw when passed an update pipeline that contains non-objects', async () => {
            let val = false;
            try {
                await instance.updateMany({date: {$gt: new Date()}}, CONSTANTS.NOT_OBJECT_WITH_EMPTY);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@updateMany: Data pipeline is invalid');
            assert.deepEqual(MockClient.calls, []);
            assert.deepEqual(mock_col.calls, []);
        });

        it('Should throw when passed a valid payload but we fail to acquire a connection', async () => {
            const query = {date: {$gt: new Date()}};
            MockClient.setDbMode('wrongret');
            mock_col.setColUnorderedBop('throw');
            let val = false;
            try {
                await instance.updateMany(query, {$inc: {count: 1}});
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@updateMany: Failed - Mongo@connect: Failed to create database instance');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, []);
        });

        it('Should throw when passed valid payload but internal updateMany throws', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColUpdateMany('throw');
            let val = false;
            try {
                await instance.updateMany(query, {$inc: {count: 1}});
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@updateMany: Failed - MockCollection@updateMany: Oh No!');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'updateMany', params: {options: {}, query, data: {$inc: {count: 1}}}}]);
        });

        it('Should throw when passed valid payload but internal updateMany returns a non-object result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColUpdateMany('wrongret');
            let val = false;
            try {
                await instance.updateMany(query, {$inc: {count: 1}}, {upsert: true});
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@updateMany: Failed - Unacknowledged');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'updateMany', params: {options: {upsert: true}, query, data: {$inc: {count: 1}}}}]);
        });

        it('Should throw when passed valid payload but internal updateMany returns a non-acknowledged result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColUpdateMany('unack');
            let val = false;
            try {
                await instance.updateMany(query, {$inc: {count: 1}}, {upsert: false});
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@updateMany: Failed - Unacknowledged');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'updateMany', params: {options: {upsert: false}, query, data: {$inc: {count: 1}}}}]);
        });

        it('Should return result when passed valid payload and internal updateMany returns valid result', async () => {
            const query = {date: {$gt: new Date()}};
            mock_col.setColUpdateMany('success');
            const out = await instance.updateMany(query, {$inc: {count: 1}}, {upsert: false});
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(out, {matchedCount: 10, modifiedCount: 10, upsertedCount: 0, acknowledged: true});
            assert.deepEqual(mock_col.calls, [{key: 'updateMany', params: {options: {upsert: false}, query, data: {$inc: {count: 1}}}}]);
        });
    });

    describe('insertMany', () => {
        let instance:Query;

        beforeEach(() => {
            instance = new Query(mdb_instance, 'mycollection');
        });

        it('Should not be static', () => {
            /* @ts-ignore */
            assert.ok(Query.insertMany === undefined);
        });

        it('Should be an async function', () => {
            assert.ok(Validator.rules.async_function(instance.insertMany));
            assert.deepEqual(MockClient.calls, []);
            assert.deepEqual(mock_col.calls, []);
        });

        it('Should throw when not passed a valid documents array', async () => {
            for (const el of CONSTANTS.NOT_ARRAY_WITH_EMPTY) {
                let val = false;
                try {
                    await instance.insertMany(el);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'MongoQuery@insertMany: Documents should be an array with content');
                assert.deepEqual(MockClient.calls, []);
                assert.deepEqual(mock_col.calls, []);
            }
        });

        it('Should throw when passed a documents array that is empty after sanitization', async () => {
            let val = false;
            try {
                await instance.insertMany(CONSTANTS.NOT_OBJECT_WITH_EMPTY);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@insertMany: Documents is empty after sanitization');
            assert.deepEqual(MockClient.calls, []);
            assert.deepEqual(mock_col.calls, []);
        });

        it('Should throw when passed a documents array but we fail to acquire a connection', async () => {
            MockClient.setDbMode('wrongret');
            mock_col.setColUnorderedBop('throw');
            let val = false;
            try {
                await instance.insertMany([
                    {first_name: 'Peter', last_name: 'Vermeulen'},
                    {first_name: 'Jack', last_name: 'Bauer'},
                ]);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@insertMany: Failed - MongoQuery@bulkOps: Failed - Mongo@connect: Failed to create database instance'); // eslint-disable-line max-len
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, []);
            assert.deepEqual(MockUnorderedBulkOp.calls, []);
            assert.deepEqual(MockOrderedBulkOp.calls, []);
        });

        it('Should throw when passed a documents array but we fail to create a bulk operator due to it throwing', async () => {
            mock_col.setColUnorderedBop('throw');
            let val = false;
            try {
                await instance.insertMany([
                    {first_name: 'Peter', last_name: 'Vermeulen'},
                    {first_name: 'Jack', last_name: 'Bauer'},
                ]);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@insertMany: Failed - MongoQuery@bulkOps: Failed - MockCollection@initializeUnorderedBulkOp: Oh No!'); // eslint-disable-line max-len
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'initializeUnorderedBulkOp', params: {options: undefined}}]);
            assert.deepEqual(MockUnorderedBulkOp.calls, []);
            assert.deepEqual(MockOrderedBulkOp.calls, []);
        });

        it('Should throw when passed a documents array but we fail to create a bulk operator due to it returning a bad val', async () => {
            mock_col.setColUnorderedBop('wrongret');
            let val = false;
            try {
                await instance.insertMany([
                    {first_name: 'Peter', last_name: 'Vermeulen'},
                    {first_name: 'Jack', last_name: 'Bauer'},
                ]);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@insertMany: Failed - MongoQuery@bulkOps: Failed - Not able to acquire bulk operation');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'initializeUnorderedBulkOp', params: {options: undefined}}]);
            assert.deepEqual(MockUnorderedBulkOp.calls, []);
            assert.deepEqual(MockOrderedBulkOp.calls, []);
        });

        it('Should throw when passed a documents array but exec on bulk operator throws', async () => {
            mock_col.setColUnorderedBop('success');
            MockUnorderedBulkOp.setModeExec('throw');
            let val = false;
            try {
                await instance.insertMany([
                    {first_name: 'Peter', last_name: 'Vermeulen'},
                    {first_name: 'Jack', last_name: 'Bauer'},
                ]);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@insertMany: Failed - MongoQuery@bulkOps: Failed - MockUnorderedBulkOp@execute: Oh No!');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'initializeUnorderedBulkOp', params: {options: undefined}}]);
            assert.deepEqual(MockUnorderedBulkOp.calls, [
                {key: 'ctor', params: {opts: undefined}},
                {key: 'insert', params: {doc: {first_name: 'Peter', last_name: 'Vermeulen'}, opts: {}}},
                {key: 'insert', params: {doc: {first_name: 'Jack', last_name: 'Bauer'}, opts: {}}},
                {key: 'execute', params: {opts: {}}},
            ]);
            assert.deepEqual(MockOrderedBulkOp.calls, []);
        });

        it('Should throw when passed a document array and execute succeeds but not all documents were inserted', async () => {
            mock_col.setColUnorderedBop('success');
            MockUnorderedBulkOp.setModeExec('success');
            let val = false;
            try {
                await instance.insertMany([
                    {first_name: 'Peter', last_name: 'Vermeulen'},
                    {first_name: 'Jack', last_name: 'Bauer'},
                ]);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@insertMany: Failed - Not all documents were inserted');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'initializeUnorderedBulkOp', params: {options: undefined}}]);
            assert.deepEqual(MockUnorderedBulkOp.calls, [
                {key: 'ctor', params: {opts: undefined}},
                {key: 'insert', params: {doc: {first_name: 'Peter', last_name: 'Vermeulen'}, opts: {}}},
                {key: 'insert', params: {doc: {first_name: 'Jack', last_name: 'Bauer'}, opts: {}}},
                {key: 'execute', params: {opts: {}}},
            ]);
            assert.deepEqual(MockOrderedBulkOp.calls, []);
        });

        it('Should succeed when passed a document array and all documents were inserted', async () => {
            mock_col.setColUnorderedBop('success');
            MockUnorderedBulkOp.setModeExec('success', {insertedCount: 2});
            const out = await instance.insertMany([
                {first_name: 'Peter', last_name: 'Vermeulen'},
                {first_name: 'Jack', last_name: 'Bauer'},
            ]);
            assert.deepEqual(out, {insertedCount: 2});
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'initializeUnorderedBulkOp', params: {options: undefined}}]);
            assert.deepEqual(MockUnorderedBulkOp.calls, [
                {key: 'ctor', params: {opts: undefined}},
                {key: 'insert', params: {doc: {first_name: 'Peter', last_name: 'Vermeulen'}, opts: {}}},
                {key: 'insert', params: {doc: {first_name: 'Jack', last_name: 'Bauer'}, opts: {}}},
                {key: 'execute', params: {opts: {}}},
            ]);
            assert.deepEqual(MockOrderedBulkOp.calls, []);
        });
    });

    describe('bulkOps', () => {
        let instance:Query;

        beforeEach(() => {
            instance = new Query(mdb_instance, 'mycollection');
        });

        it('Should not be static', () => {
            /* @ts-ignore */
            assert.ok(Query.bulkOps === undefined);
        });

        it('Should be an async function', () => {
            assert.ok(Validator.rules.async_function(instance.bulkOps));
            assert.deepEqual(MockClient.calls, []);
            assert.deepEqual(mock_col.calls, []);
        });

        it('Should throw when passed a non-function fn', async () => {
            for (const el of CONSTANTS.NOT_FUNCTION) {
                let val = false;
                try {
                    await instance.bulkOps(el);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'MongoQuery@bulkOps: Fn should be a function');
            }
            assert.deepEqual(MockClient.calls, []);
            assert.deepEqual(mock_col.calls, []);
            assert.deepEqual(MockUnorderedBulkOp.calls, []);
            assert.deepEqual(MockOrderedBulkOp.calls, []);
        });

        it('Should throw when passed a non-boolean sort', async () => {
            for (const el of CONSTANTS.NOT_BOOLEAN) {
                if (el === undefined) continue;

                let val = false;
                try {
                    await instance.bulkOps(operator => operator.insert({bla: true}), el);
                } catch (err) {
                    val = err.message;
                }
                assert.equal(val, 'MongoQuery@bulkOps: Sorted should be a boolean');
            }
            assert.deepEqual(MockClient.calls, []);
            assert.deepEqual(mock_col.calls, []);
            assert.deepEqual(MockUnorderedBulkOp.calls, []);
            assert.deepEqual(MockOrderedBulkOp.calls, []);
        });

        it('Should throw when passed a valid payload but fail to acquire a connection', async () => {
            mock_col.setColUnorderedBop('throw');
            MockClient.setDbMode('wrongret');

            let val = false;
            try {
                await instance.bulkOps(operator => operator.insert({bla: true}), false);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@bulkOps: Failed - Mongo@connect: Failed to create database instance');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, []);
            assert.deepEqual(MockUnorderedBulkOp.calls, []);
            assert.deepEqual(MockOrderedBulkOp.calls, []);
        });

        it('Should throw when passed a valid payload but fail to acquire an unordered bulk operator due to it throwing', async () => {
            mock_col.setColUnorderedBop('throw');

            let val = false;
            try {
                await instance.bulkOps(operator => operator.insert({bla: true}), false);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@bulkOps: Failed - MockCollection@initializeUnorderedBulkOp: Oh No!');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'initializeUnorderedBulkOp', params: {options: undefined}}]);
            assert.deepEqual(MockUnorderedBulkOp.calls, []);
            assert.deepEqual(MockOrderedBulkOp.calls, []);
        });

        it('Should throw when passed a valid payload but fail to acquire an ordered bulk operator due to it throwing', async () => {
            mock_col.setColOrderedBop('throw');

            let val = false;
            try {
                await instance.bulkOps(operator => operator.insert({bla: true}), true);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@bulkOps: Failed - MockCollection@initializeOrderedBulkOp: Oh No!');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'initializeOrderedBulkOp', params: {options: undefined}}]);
            assert.deepEqual(MockUnorderedBulkOp.calls, []);
            assert.deepEqual(MockOrderedBulkOp.calls, []);
        });

        it('Should throw when passed a valid payload but fail to acquire an unordered bulk operator due to returning wrong', async () => {
            mock_col.setColUnorderedBop('wrongret');

            let val = false;
            try {
                await instance.bulkOps(operator => operator.insert({bla: true}), false);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@bulkOps: Failed - Not able to acquire bulk operation');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'initializeUnorderedBulkOp', params: {options: undefined}}]);
            assert.deepEqual(MockUnorderedBulkOp.calls, []);
            assert.deepEqual(MockOrderedBulkOp.calls, []);
        });

        it('Should throw when passed a valid payload but fail to acquire an ordered bulk operator due to returning wrong', async () => {
            mock_col.setColOrderedBop('wrongret');

            let val = false;
            try {
                await instance.bulkOps(operator => operator.insert({bla: true}), true);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@bulkOps: Failed - Not able to acquire bulk operation');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'initializeOrderedBulkOp', params: {options: undefined}}]);
            assert.deepEqual(MockUnorderedBulkOp.calls, []);
            assert.deepEqual(MockOrderedBulkOp.calls, []);
        });

        it('Should throw when passed a valid payload but fail to acquire an unordered bulk operator due to exec throw', async () => {
            mock_col.setColUnorderedBop('success');
            MockUnorderedBulkOp.setModeExec('throw');

            let val = false;
            try {
                await instance.bulkOps(operator => operator.insert({bla: true}), false);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@bulkOps: Failed - MockUnorderedBulkOp@execute: Oh No!');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'initializeUnorderedBulkOp', params: {options: undefined}}]);
            assert.deepEqual(MockUnorderedBulkOp.calls, [
                {key: 'ctor', params: {opts: undefined}},
                {key: 'insert', params: {doc: {bla: true}, opts: {}}},
                {key: 'execute', params: {opts: {}}},
            ]);
            assert.deepEqual(MockOrderedBulkOp.calls, []);
        });

        it('Should throw when passed a valid payload but fail to acquire an ordered bulk operator due to exec throw', async () => {
            mock_col.setColOrderedBop('success');
            MockOrderedBulkOp.setModeExec('throw');

            let val = false;
            try {
                await instance.bulkOps(operator => operator.insert({bla: true}), true);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@bulkOps: Failed - MockOrderedBulkOp@execute: Oh No!');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'initializeOrderedBulkOp', params: {options: undefined}}]);
            assert.deepEqual(MockUnorderedBulkOp.calls, []);
            assert.deepEqual(MockOrderedBulkOp.calls, [
                {key: 'ctor', params: {opts: undefined}},
                {key: 'insert', params: {doc: {bla: true}, opts: {}}},
                {key: 'execute', params: {opts: {}}},
            ]);
        });

        it('Should throw when passed a valid payload but fail to acquire an unordered bulk operator due to exec wrong return', async () => {
            mock_col.setColUnorderedBop('success');
            MockUnorderedBulkOp.setModeExec('wrongret');

            let val = false;
            try {
                await instance.bulkOps(operator => operator.insert({bla: true}), false);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@bulkOps: Failed - Unexpected result');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'initializeUnorderedBulkOp', params: {options: undefined}}]);
            assert.deepEqual(MockUnorderedBulkOp.calls, [
                {key: 'ctor', params: {opts: undefined}},
                {key: 'insert', params: {doc: {bla: true}, opts: {}}},
                {key: 'execute', params: {opts: {}}},
            ]);
            assert.deepEqual(MockOrderedBulkOp.calls, []);
        });

        it('Should throw when passed a valid payload but fail to acquire an ordered bulk operator due to exec wrong return', async () => {
            mock_col.setColOrderedBop('success');
            MockOrderedBulkOp.setModeExec('wrongret');

            let val = false;
            try {
                await instance.bulkOps(operator => operator.insert({bla: true}), true);
            } catch (err) {
                val = err.message;
            }
            assert.equal(val, 'MongoQuery@bulkOps: Failed - Unexpected result');
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'initializeOrderedBulkOp', params: {options: undefined}}]);
            assert.deepEqual(MockUnorderedBulkOp.calls, []);
            assert.deepEqual(MockOrderedBulkOp.calls, [
                {key: 'ctor', params: {opts: undefined}},
                {key: 'insert', params: {doc: {bla: true}, opts: {}}},
                {key: 'execute', params: {opts: {}}},
            ]);
        });

        it('Should succeed when passed a valid payload and unordered bulk operator exec goes right', async () => {
            mock_col.setColUnorderedBop('success');
            MockUnorderedBulkOp.setModeExec('success', {yay: true});

            const out = await instance.bulkOps(operator => operator.insert({bla: true}), false);
            assert.deepEqual(out, {yay: true});
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'initializeUnorderedBulkOp', params: {options: undefined}}]);
            assert.deepEqual(MockUnorderedBulkOp.calls, [
                {key: 'ctor', params: {opts: undefined}},
                {key: 'insert', params: {doc: {bla: true}, opts: {}}},
                {key: 'execute', params: {opts: {}}},
            ]);
            assert.deepEqual(MockOrderedBulkOp.calls, []);
        });

        it('Should succeed when passed a valid payload and ordered bulk operator exec goes right', async () => {
            mock_col.setColOrderedBop('success');
            MockOrderedBulkOp.setModeExec('success', {yay: true});

            const out = await instance.bulkOps(operator => operator.insert({bla: true}), true);
            assert.deepEqual(out, {yay: true});
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'initializeOrderedBulkOp', params: {options: undefined}}]);
            assert.deepEqual(MockUnorderedBulkOp.calls, []);
            assert.deepEqual(MockOrderedBulkOp.calls, [
                {key: 'ctor', params: {opts: undefined}},
                {key: 'insert', params: {doc: {bla: true}, opts: {}}},
                {key: 'execute', params: {opts: {}}},
            ]);
        });

        it('Should allow using an async function', async () => {
            mock_col.setColOrderedBop('success');
            MockOrderedBulkOp.setModeExec('success', {yay: true});

            const out = await instance.bulkOps(async operator => operator.insert({bla: true}), true);
            assert.deepEqual(out, {yay: true});
            assert.deepEqual(MockClient.calls, [{key: 'connect', params: EXPECTED_CON_PAYLOAD}, {key: 'db', params: EXPECTED_DB_PAYLOAD}]);
            assert.deepEqual(mock_col.calls, [{key: 'initializeOrderedBulkOp', params: {options: undefined}}]);
            assert.deepEqual(MockUnorderedBulkOp.calls, []);
            assert.deepEqual(MockOrderedBulkOp.calls, [
                {key: 'ctor', params: {opts: undefined}},
                {key: 'insert', params: {doc: {bla: true}, opts: {}}},
                {key: 'execute', params: {opts: {}}},
            ]);
        });
    });
});
