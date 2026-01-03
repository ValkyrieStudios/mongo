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

let calls:unknown[] = [];
let mock_col:MockCollection|false = false;

export default class MockDb extends Db {

    name:string;

    opts:DbOptions;

    constructor (name:string, opts:DbOptions) {
        try {
            /* eslint-disable-next-line */
            /* @ts-ignore */
            super();
        } catch {
            //  Nothing to do here
        }

        /* eslint-disable-next-line */
        /* @ts-ignore */
        this.opts = opts;

        /* eslint-disable-next-line */
        /* @ts-ignore */
        this.name = name;
    }

    /* eslint-disable-next-line */
    /* @ts-ignore */
    async listCollections (opts):Promise<Record<string, unknown>> {
        calls.push({key: 'listCollections', params: {opts}});
        if (db_col_exists === 'throw') throw new Error('MockDb@listCollections: Oh No!');

        /* eslint-disable-next-line */
        /* @ts-ignore */
        if (db_col_exists === 'wrongret') return false;

        if (db_col_exists === 'emptyret') return {toArray: async () => []};
        return {toArray: async () => ['bla']};
    }

    async dropCollection (name: string):Promise<boolean> {
        calls.push({key: 'dropCollection', params: {name}});

        if (db_col_drop === 'throw') throw new Error('MockDb@dropCollection: Oh No!');

        if (db_col_drop === 'wrongret') return false;

        return true;
    }

    /* eslint-disable-next-line */
    /* @ts-ignore */
    async createCollection (name:string):Promise<MockCollection> {
        calls.push({key: 'createCollection', params: {name}});

        if (db_col_create === 'throw') throw new Error('MockDb@createCollection: Oh No!');

        /* eslint-disable-next-line */
        /* @ts-ignore */
        if (db_col_create === 'wrongret') return false;

        return new MockCollection(name);
    }

    /* eslint-disable-next-line */
    /* @ts-ignore */
    collection (name:string) {
        calls.push({key: 'collection', params: {name}});

        if (db_col === 'throw') throw new Error('MockDb@collection: Oh No!');

        return db_col === 'mock' ? mock_col || new MockCollection(name) : this;
    }

    async indexExists (name: string):Promise<boolean> {
        calls.push({key: 'indexExists', params: {name}});

        if (db_col_idx_exists === 'throw') throw new Error('MockDb@indexExists: Oh No!');

        if (db_col_idx_exists === 'wrongret') return false;

        return true;
    }

    async dropIndex (name: string):Promise<boolean> {
        calls.push({key: 'dropIndex', params: {name}});

        if (db_col_idx_drop === 'throw') throw new Error('MockDb@dropIndex: Oh No!');

        if (db_col_idx_drop === 'wrongret') return false;

        return true;
    }

    /* eslint-disable-next-line */
    /* @ts-ignore */
    async createIndex (
        indexSpec: IndexSpecification,
        options: CreateIndexesOptions
    ): Promise<string> {
        calls.push({key: 'createIndex', params: {indexSpec, options}});

        if (db_col_idx_create === 'throw') throw new Error('MockDb@createIndex: Oh No!');

        /* eslint-disable-next-line */
        /* @ts-ignore */
        if (db_col_idx_create === 'wrongret') return false;

        return options.name as string;
    }

    static get calls ():unknown[] {
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
