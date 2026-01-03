import {ClientSession, DbOptions, MongoClient, MongoClientOptions} from 'mongodb';
import MockDb from './MockDb';

type MockMode = 'throw' | 'wrongret' | 'success';

const orig_connect = MongoClient.connect;
let con_mode:MockMode = 'success';
let db_mode:MockMode = 'success';
let close_mode:MockMode = 'success';
let session_mode:MockMode = 'success';
let txn_mode:MockMode = 'success';
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

    /* eslint-disable-next-line */
    /* @ts-ignore */
    startSession(options?: ClientSessionOptions): ClientSession {
        calls.push({key: 'startSession', params: {options}});

        if (session_mode === 'throw') throw new Error('MockClient@startSession: Failed');

        // Return a Mock Session
        return {
            /* eslint-disable-next-line */
            /* @ts-ignore */
            withTransaction: async (fn: (session: ClientSession) => Promise<unknown>, opts?: TransactionOptions) => {
                calls.push({key: 'withTransaction', params: {opts}});

                if (txn_mode === 'throw') throw new Error('MockClient@withTransaction: Aborted');

                // Execute the callback passed by the user
                return await fn({} as ClientSession);
            },
            endSession: async () => {
                calls.push({key: 'endSession', params: {}});
            }
        } as unknown as ClientSession;
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

    static setConnectMode (mode:MockMode = 'success') { con_mode = mode; }
    static setDbMode (mode:MockMode = 'success') { db_mode = mode; }
    static setCloseMode (mode:MockMode = 'success') { close_mode = mode; }
    static setSessionMode (mode:MockMode = 'success') { session_mode = mode; }
    static setTxnMode (mode:MockMode = 'success') { txn_mode = mode; }

    static get calls ():unknown[] { return calls; }
    static get isEmpty () { return calls.length === 0; }

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
        MockClient.setSessionMode();
        MockClient.setTxnMode();
        MockDb.reset();
    }

    static restore () {
        MockClient.reset();
        MongoClient.connect = orig_connect;
    }

}
