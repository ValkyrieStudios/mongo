import {DbOptions, MongoClient, MongoClientOptions} from 'mongodb';
import MockDb from './MockDb';

type MockMode = 'throw' | 'wrongret' | 'success';

const orig_connect = MongoClient.connect;
let con_mode:MockMode = 'success';
let db_mode:MockMode = 'success';
let close_mode:MockMode = 'success';
let calls:unknown[] = [];

export default class MockClient extends MongoClient {

    uri:string;

    opts:MongoClientOptions;

    constructor (uri:string, opts:MongoClientOptions) {
        super(uri, opts);

        this.uri = uri;

        this.opts = opts;
    }

    /* eslint-disable-next-line */
    /* @ts-ignore */
    db (name:string, opts:DbOptions):MockDb {
        calls.push({key: 'db', params: {name, opts}});

        if (db_mode === 'throw') throw new Error('MockClient@db: Oh No!');

        /* eslint-disable-next-line */
        /* @ts-ignore */
        if (db_mode === 'wrongret') return false;

        return new MockDb(name, opts);
    }

    async close ():Promise<void> {
        calls.push({key: 'close', params: {}});

        if (close_mode === 'throw') throw new Error('MockClient@close: Oh No!');
    }

    static async connect (uri:string, opts:MongoClientOptions):Promise<MockClient> {
        calls.push({key: 'connect', params: {uri, opts}});

        if (con_mode === 'throw') throw new Error('MockClient@connect: Oh No!');

        /* eslint-disable-next-line */
        /* @ts-ignore */
        if (con_mode === 'wrongret') return false;

        return new MockClient(uri, opts);
    }

    static setConnectMode (mode:MockMode = 'success') {
        con_mode = mode;
    }

    static setDbMode (mode:MockMode = 'success') {
        db_mode = mode;
    }

    static setCloseMode (mode:MockMode = 'success') {
        close_mode = mode;
    }

    static get calls ():unknown[] {
        return calls;
    }

    static mock () {
        MockClient.reset();

        /* eslint-disable-next-line */
        /* @ts-ignore */
        MongoClient.connect = MockClient.connect;
    }

    static reset () {
        calls = [];
        MockClient.setConnectMode();
        MockClient.setDbMode();
        MockClient.setCloseMode();
        MockDb.reset();
    }

    static restore () {
        MockClient.reset();
        MongoClient.connect = orig_connect;
    }

}
