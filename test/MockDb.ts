'use strict';

/* eslint-disable class-methods-use-this */

import {CreateIndexesOptions, Db, DbOptions, IndexSpecification} from 'mongodb';
import MockCollection from './MockCollection';

type MockMode = 'throw' | 'wrongret' | 'emptyret' | 'success' | 'mock';

let db_col:MockMode = 'success';
let db_col_idx_exists:MockMode = 'success';
let db_col_idx_create:MockMode = 'success';
let db_col_idx_drop:MockMode = 'success';
let db_col_exists:MockMode = 'success';
let db_col_create:MockMode = 'success';
let db_col_drop:MockMode = 'success';

let calls:any[] = [];
let mock_col:MockCollection|false = false;

export default class MockDb extends Db {

    name:string;

    opts:DbOptions;

    /* @ts-ignore */
    constructor (name:string, opts:DbOptions) {
        try {
            /* @ts-ignore */
            super();
        } catch (err) {
            //  Nothing to do here
        }

        /* @ts-ignore */
        this.opts = opts;

        /* @ts-ignore */
        this.name = name;
    }

    /* @ts-ignore */
    async listCollections (opts):Promise<Record<string, any>> {
        calls.push({key: 'listCollections', params: {opts}});
        if (db_col_exists === 'throw') throw new Error('MockDb@listCollections: Oh No!');

        /* @ts-ignore */
        if (db_col_exists === 'wrongret') return false;

        if (db_col_exists === 'emptyret') return {toArray: async () => []};
        return {toArray: async () => ['bla']};
    }

    /* @ts-ignore */
    async dropCollection (name):Promise<boolean> {
        calls.push({key: 'dropCollection', params: {name}});

        if (db_col_drop === 'throw') throw new Error('MockDb@dropCollection: Oh No!');

        if (db_col_drop === 'wrongret') return false;

        return true;
    }

    /* @ts-ignore */
    async createCollection (name:string):Promise<MockCollection> {
        calls.push({key: 'createCollection', params: {name}});

        if (db_col_create === 'throw') throw new Error('MockDb@createCollection: Oh No!');

        /* @ts-ignore */
        if (db_col_create === 'wrongret') return false;

        return new MockCollection(name);
    }

    /* @ts-ignore */
    collection (name:string) {
        calls.push({key: 'collection', params: {name}});

        if (db_col === 'throw') throw new Error('MockDb@collection: Oh No!');

        return db_col === 'mock' ? mock_col || new MockCollection(name) : this;
    }

    /* @ts-ignore */
    async indexExists (name):Promise<boolean> {
        calls.push({key: 'indexExists', params: {name}});

        if (db_col_idx_exists === 'throw') throw new Error('MockDb@indexExists: Oh No!');

        if (db_col_idx_exists === 'wrongret') return false;

        return true;
    }

    /* @ts-ignore */
    async dropIndex (name):Promise<boolean> {
        calls.push({key: 'dropIndex', params: {name}});

        if (db_col_idx_drop === 'throw') throw new Error('MockDb@dropIndex: Oh No!');

        if (db_col_idx_drop === 'wrongret') return false;

        return true;
    }

    /* @ts-ignore */
    async createIndex (
        indexSpec: IndexSpecification,
        options: CreateIndexesOptions
    ): Promise<string> {
        calls.push({key: 'createIndex', params: {indexSpec, options}});

        if (db_col_idx_create === 'throw') throw new Error('MockDb@createIndex: Oh No!');

        /* @ts-ignore */
        if (db_col_idx_create === 'wrongret') return false;

        /* @ts-ignore */
        return options.name;
    }

    static get calls ():any[] {
        return calls;
    }

    static setDbColMode (mode:MockMode = 'success') {
        db_col = mode;
    }

    static setDbColIdxExistsMode (mode:MockMode = 'success') {
        db_col_idx_exists = mode;
    }

    static setDbColIdxCreateMode (mode:MockMode = 'success') {
        db_col_idx_create = mode;
    }

    static setDbColIdxDropMode (mode:MockMode = 'success') {
        db_col_idx_drop = mode;
    }

    static setDbColExistsMode (mode:MockMode = 'success') {
        db_col_exists = mode;
    }

    static setDbColCreateMode (mode:MockMode = 'success') {
        db_col_create = mode;
    }

    static setDbColDropMode (mode:MockMode = 'success') {
        db_col_drop = mode;
    }

    static setMockCol (col:MockCollection|false = false) {
        mock_col = col;
    }

    static reset () {
        calls = [];
        MockDb.setDbColMode();
        MockDb.setDbColIdxExistsMode();
        MockDb.setDbColIdxCreateMode();
        MockDb.setDbColIdxDropMode();
        MockDb.setDbColExistsMode();
        MockDb.setDbColCreateMode();
        MockDb.setDbColDropMode();
        MockDb.setMockCol();
    }

}
