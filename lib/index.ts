'use strict';

import Validator    from '@valkyriestudios/validator';
import Is           from '@valkyriestudios/utils/is';
import fnv1A        from '@valkyriestudios/utils/hash/fnv1A';
import Query        from './Query';
import {
    MongoClient,
    Db,
    Collection,
    type CreateIndexesOptions,
    type Document,
} from 'mongodb';

import {
    Protocols,
    type Protocol,
    ReadPreferences,
    type ReadPreference,
} from './Types';

export interface MongoFullOptions {
    /* Whether or not we should debug, this is internal to the library and purely focuses on pool events (defaults to false) */
    debug: boolean;

    /* Size of the connection pool (defaults to 5) */
    pool_size: number;

    /* Host URL (defaults to 127.0.0.1:27017) */
    host: string;

    /* User to authenticate with */
    user: string;

    /* Password for user */
    pass: string;

    /* Database to use for connection pool */
    db: string;

    /* Authentication Database (defaults to 'admin') */
    auth_db: string;

    /* Name of the Replica set to use (defaults to false, not always necessary to pass) */
    replset: string|false;

    /* Mongo protocol to use (defaults to 'mongodb') */
    protocol: Protocol;

    /* Read Preference for connection pool (defaults to 'nearest') */
    read_preference: ReadPreference;

    /* Whether or not we should retry reads (defaults to true) */
    retry_reads: boolean;

    /* Whether or not we should retry writes (defaults to true) */
    retry_writes: boolean;
}

/* Required mongo options */
export type MongoOptions = Partial<MongoFullOptions> & Required<Pick<MongoFullOptions, 'user' | 'pass' | 'db'>>;

type CollectionIndexStructure = {
    name:string;
    spec:{[key:string]:1|-1};
    options?:CreateIndexesOptions;
}

type CollectionStructure = {
    name:string;
    idx?: CollectionIndexStructure[];
}

/**
 * Validation Setup
 */

Validator.extendEnum({
    valkyrie_mongo_enum_protocols: Object.values(Protocols),
    valkyrie_mongo_enum_read_pref: Object.values(ReadPreferences),
    valkyrie_mongo_enum_index_val: [-1, 1],
});

Validator.extendSchema<CollectionIndexStructure>('valkyrie_mongo_structure_collection_index', {
    name: 'string_ne|min:1|max:128',
    spec: '{min:1}valkyrie_mongo_enum_index_val',
    options: '?object_ne',
});

const vCollectionStructure = new Validator<CollectionStructure>({
    name    : 'string_ne|min:1|max:128',
    idx     : '?[unique]valkyrie_mongo_structure_collection_index',
});

const vOptions = new Validator<MongoFullOptions>({
    debug           : 'boolean',
    pool_size       : 'integer|min:1|max:100',
    host            : 'string_ne|min:1|max:1024',
    user            : 'string_ne|min:1|max:256',
    pass            : 'string_ne|min:1|max:256',
    db              : 'string_ne|min:1|max:128',
    auth_db         : 'string_ne|min:1|max:128',
    replset         : '(string_ne|min:1|max:128)(false)',
    protocol        : 'valkyrie_mongo_enum_protocols',
    read_preference : 'valkyrie_mongo_enum_read_pref',
    retry_reads     : 'boolean',
    retry_writes    : 'boolean',
});

/**
 * Validates structure passed to check
 *
 * @param {CollectionStructure[]} struct - Structure to validate
 * @throws {Error} Throws when structure is invalid
 */
function validateStructure (structure:CollectionStructure[], msg:string) {
    for (const struct of structure) {
        /* Baseline validation of structure */
        if (!vCollectionStructure.check(struct)) throw new Error(`${msg}: All collection objects need to be valid`);

        /* If no indexes dont do anything */
        if (!struct.idx || !Is.NeArray(struct.idx)) continue;

        /* Ensure indexes have unique names */
        const idx_unique_set:Set<string> = new Set();
        for (const idx of struct.idx) idx_unique_set.add(idx.name);
        if (idx_unique_set.size !== struct.idx.length) throw new Error(`${msg}: Ensure all indexes have a unique name`);
    }
}

export default class Mongo {

    /* Full configuration */
    #config:MongoFullOptions;

    /* Extracted connection string (built off of configuration) */
    #uri:string;

    /* Mongo Client pool (if established) */
    #mongo_client:MongoClient|false = false;

    /* Mongo Database instance (if established) */
    #mongo_database:Db|false = false;

    /* Extracted identifier for this Mongo instance */
    #uid:string;

    /* Internal log function */
    #log = (...args:any[]) => {
        if (!this.#config.debug) return;
        console.info(...args);
    };

    constructor (opts:MongoOptions) {
        /* Verify that the options passed are in the form of an object */
        if (!Is.NeObject(opts)) throw new Error('Mongo@ctor: options should be an object');

        /* Create options, spread passed options on top of defaults */
        const config = {
            debug           : false,
            pool_size       : 5,
            host            : '127.0.0.1:27017',
            auth_db         : 'admin',
            replset         : false,
            protocol        : Protocols.STANDARD,
            read_preference : ReadPreferences.NEAREST,
            retry_reads     : true,
            retry_writes    : true,
            ...opts,
        };

        /* Validate options, throw if invalid */
        if (!vOptions.check(config)) throw new Error('Mongo@ctor: options are invalid');

        /* Options are valid */
        this.#config = config;

        /* Create connection uri */
        this.#uri = [
            `${this.#config.protocol}://${this.#config.user}:${this.#config.pass}@${this.#config.host}/${this.#config.auth_db}`,
            this.#config.replset ? `?replicaSet=${this.#config.replset}` : false,
        ].filter(el => el !== false).join('');

        /* Create instance uid */
        this.#uid = `mongodb:${fnv1A({uri: this.#uri, db: this.#config.db})}`;

        /* Log */
        this.#log('Mongo: Instantiated');
    }

    /**
     * Returns a hashed identifier for the Mongo instance comprised of several configuration options.
     *
     * @returns {string}
     */
    get uid ():string {
        return this.#uid;
    }

    /**
     * Whether or not the instance is connected
     *
     * @returns {boolean}
     */
    get isConnected ():boolean {
        return !!(this.#mongo_client && this.#mongo_database);
    }

    /**
     * Whether or not debug is enabled
     *
     * @returns {boolean}
     */
    get isDebugEnabled ():boolean {
        return this.#config.debug;
    }

    /**
     * Bootstrap mongo, this does several things:
     * 1) Test whether or not we can connect to the database
     * 2) (optional) Ensures structural integrity through automated collection/index creation
     *
     * @returns {Promise<void>}
     * @throws {Error} If connectivity check fails, structure is invalid or structure creation fails
     */
    async bootstrap (structure?:CollectionStructure[]):Promise<void> {
        /* Validate collections array */
        if (Is.NeArray(structure)) validateStructure(structure, 'Mongo@bootstrap');

        try {
            /* Log */
            this.#log('Mongo@bootstrap: ------ Connectivity check');

            /* Connect (this will throw if failing to connect) */
            await this.connect();

            /* If structure is provided, run collection/index builds */
            if (Is.NeArray(structure)) {
                this.#log('Mongo@bootstrap: ------ Ensuring structure');
                for (const struct of structure) {
                    /* Create collection if it doesnt exist */
                    const col_exists = await this.hasCollection(struct.name);
                    if (!col_exists) await this.createCollection(struct.name);

                    /* Create indexes if they dont exist */
                    if (!struct.idx || !Is.NeArray(struct.idx)) continue;
                    for (const idx of struct.idx) {
                        const idx_exists = await this.hasIndex(struct.name, idx.name);
                        if (idx_exists) continue;

                        await this.createIndex(
                            struct.name,
                            idx.name,
                            idx.spec,
                            {background: true, ...idx.options || {}}
                        );
                    }
                }
                this.#log('Mongo@bootstrap: ------ Structure ensured');
            }

            /* Close connection (cleanup) */
            await this.close();

            /* Log */
            this.#log('Mongo@bootstrap: ------ Connectivity success');
        } catch (err) {
            this.#log('Mongo@bootstrap: ------ Connectivity failure');
            throw err;
        }
    }

    /**
     * Establish connection to mongodb using the instance configuration.
     * Take Note: this will not establish multiple connections if a client pool already exists
     *
     * @returns {Promise<Db>} Database instance
     * @throws {Error} When failing to establish a connection
     */
    async connect ():Promise<Db> {
        try {
            /* If a pool exists return the pool */
            if (this.#mongo_database) return this.#mongo_database;

            /* Log */
            this.#log('Mongo@connect: Establishing connection');

            /**
             * Await client connection pool instantiation
             * https://mongodb.github.io/node-mongodb-native/6.3/classes/MongoClient.html
             * https://mongodb.github.io/node-mongodb-native/6.3/classes/MongoClient.html#connect
             */
            this.#mongo_client = await MongoClient.connect(this.#uri, {
                minPoolSize         : 1,
                maxPoolSize         : this.#config.pool_size,
                maxConnecting       : this.#config.pool_size,
                connectTimeoutMS    : 10000,
                socketTimeoutMS     : 0,
                readPreference      : this.#config.read_preference,
                retryReads          : this.#config.retry_reads,
                retryWrites         : this.#config.retry_writes,
                compressors         : ['zlib'],
                zlibCompressionLevel: 3,
            });
            if (!(this.#mongo_client instanceof MongoClient)) throw new Error('Mongo@connect: Failed to create client pool');

            /**
             * Create db instance we want to use
             * https://mongodb.github.io/node-mongodb-native/6.3/classes/Db.html
             * https://mongodb.github.io/node-mongodb-native/6.3/interfaces/DbOptions.html
             */
            this.#mongo_database = this.#mongo_client.db(this.#config.db, {
                readPreference  : this.#config.read_preference,
                retryWrites     : this.#config.retry_writes,
            });
            if (!(this.#mongo_database instanceof Db)) throw new Error('Mongo@connect: Failed to create database instance');

            /* Log */
            if (this.isDebugEnabled) console.info('Mongo@connect: Connection established');

            return this.#mongo_database;
        } catch (err) {
            /* Reset props */
            this.#mongo_client      = false;
            this.#mongo_database    = false;

            /* Log */
            this.#log('Mongo@connect: Failed to connect', {err: err instanceof Error ? err.message : 'Unknown Error'});

            throw err;
        }
    }

    /**
     * Verify whether or not a collection exists on the database
     *
     * @param {string} collection - Collection to verify exists
     * @returns {Promise<boolean>} Whether or not the collection exists
     * @throws {Error} When invalid options are passed or we fail to connect
     */
    async hasCollection (collection:string):Promise<boolean> {
        if (!Is.NeString(collection)) throw new Error('Mongo@hasCollection: Collection should be a non-empty string');

        /* Connect */
        const db = await this.connect();
        if (!(db instanceof Db)) throw new Error('Mongo@hasCollection: Failed to connect');

        const name = collection.trim();

        const result = await db.listCollections({name});
        if (!Is.Object(result) || !Is.Function(result.toArray)) throw new Error('Mongo@hasCollection: Unexpected result');

        const exists = Is.NeArray(await result.toArray());

        /* Log */
        this.#log(`Mongo@hasCollection: ${name} - ${exists ? 'exists' : 'does not exist'}`);

        return exists;
    }

    /**
     * Create a collection on the database
     *
     * @param {string} collection - Collection to create
     * @returns {Promise<boolean>} Whether or not the collection was created
     * @throws {Error} When invalid options are passed or we fail to connect
     */
    async createCollection (collection:string):Promise<boolean> {
        if (!Is.NeString(collection)) throw new Error('Mongo@createCollection: Collection should be a non-empty string');

        /* Connect */
        const db = await this.connect();
        if (!(db instanceof Db)) throw new Error('Mongo@createCollection: Failed to connect');

        const name = collection.trim();

        /* Log */
        this.#log(`Mongo@createCollection: Creating collection - ${name}`);

        const result = await db.createCollection(name);

        return result instanceof Collection;
    }

    /**
     * Drop a collection on the database
     *
     * @param {string} collection - Collection to drop
     * @returns {Promise<boolean>} Whether or not the collection was dropped
     * @throws {Error} When invalid options are passed or we fail to connect
     */
    async dropCollection (collection:string):Promise<boolean> {
        if (!Is.NeString(collection)) throw new Error('Mongo@dropCollection: Collection should be a non-empty string');

        /* Connect */
        const db = await this.connect();
        if (!(db instanceof Db)) throw new Error('Mongo@dropCollection: Failed to connect');

        const name = collection.trim();

        /* Log */
        this.#log(`Mongo@dropCollection: Dropping collection - ${name}`);

        const result = await db.dropCollection(name);

        return !!result;
    }

    /**
     * Verify whether or not an index exists for a particular collection on the database
     *
     * @param {string} collection - Collection to verify on
     * @param {string} name - Name of the index to verify exists
     * @returns {Promise<boolean>} Whether or not the index exists on the collection
     * @throws {Error} When invalid options are passed or we fail to connect
     */
    async hasIndex (collection:string, name:string):Promise<boolean> {
        if (!Is.NeString(collection)) throw new Error('Mongo@hasIndex: Collection should be a non-empty string');
        if (!Is.NeString(name)) throw new Error('Mongo@hasIndex: Index Name should be a non-empty string');

        /* Connect */
        const db = await this.connect();
        if (!(db instanceof Db)) throw new Error('Mongo@hasIndex: Failed to connect');

        const col_name = collection.trim();
        const idx_name = name.trim();

        const result = await db.collection(col_name).indexExists(idx_name);

        /* Log */
        this.#log(`Mongo@hasIndex: ${col_name} ix:${idx_name} - ${result ? 'exists' : 'does not exist'}`);

        return !!result;
    }

    /**
     * Create an index on a collection on the database
     *
     * @param {string} collection - Collection to create the index for
     * @param {string} name - Name of the index to be created
     * @param {{[key:string]:1|-1}} spec - Index key specification
     * @param {CreateIndexesOptions} options - (optional) Index options
     * @returns {Promise<boolean>} Whether or not the operation was successful
     * @throws {Error} When invalid options are passed or we fail to connect
     */
    async createIndex (
        collection:string,
        name:string,
        spec:{[key:string]:1|-1},
        options:CreateIndexesOptions = {}
    ):Promise<boolean> {
        if (!Is.NeString(collection)) throw new Error('Mongo@createIndex: Collection should be a non-empty string');
        if (!Is.NeString(name)) throw new Error('Mongo@createIndex: Index Name should be a non-empty string');

        if (
            !Is.NeObject(spec) ||
            !Object.values(spec).every(el => el === 1 || el === -1)
        ) throw new Error('Mongo@createIndex: Invalid spec passed');

        if (!Is.Object(options)) throw new Error('Mongo@createIndex: Options should be an object');

        /* Connect */
        const db = await this.connect();
        if (!(db instanceof Db)) throw new Error('Mongo@createIndex: Failed to connect');

        const col_name = collection.trim();
        const idx_name = name.trim();

        /* Log */
        this.#log(`Mongo@createIndex: Creating index ${idx_name} on ${col_name}`);

        /* Create Index */
        const result = await db.collection(col_name).createIndex(spec, {...options, name: idx_name});

        return Is.NeString(result);
    }

    /**
     * Drop an index on a collection on the database
     *
     * @param {string} collection - Collection to drop the index for
     * @param {string} name - Name of the index to drop
     * @returns {Promise<boolean>} Whether or not the operation was successful
     * @throws {Error} When invalid options are passed or we fail to connect
     */
    async dropIndex (collection:string, name:string):Promise<boolean> {
        if (!Is.NeString(collection)) throw new Error('Mongo@dropIndex: Collection should be a non-empty string');
        if (!Is.NeString(name)) throw new Error('Mongo@dropIndex: Index Name should be a non-empty string');

        /* Connect */
        const db = await this.connect();
        if (!(db instanceof Db)) throw new Error('Mongo@dropIndex: Failed to connect');

        const col_name = collection.trim();
        const idx_name = name.trim();

        /* Log */
        this.#log(`Mongo@dropIndex: Dropping index ${idx_name} on ${col_name}`);

        /* Drop Index */
        try {
            await db.collection(col_name).dropIndex(idx_name);
            return true;
        } catch (err) {
            return false;
        }
    }

    /**
     * Get a query instance for a specific collection
     *
     * @param {string} collection - Collection to query from
     * @returns {Promise<Query>} Instance of query
     * @throws {Error} When invalid options are passed
     */
    query (collection:string):Query {
        if (!Is.NeString(collection)) throw new Error('Mongo@query: Collection should be a non-empty string');

        return new Query(this, collection.trim());
    }

    /**
     * Aggregate query handler - Compatible with ValkyrieStudios/Beam
     *
     * @param {string} collection - Collection to query from
     * @param {{[key:string]:any}[]} pipeline - Aggregation pipeline to run]
     * @returns {Promise<Document[]>}
     * @throws {Error} When invalid options are passed
     */
    async aggregate <T extends Document> (collection:string, pipeline:Document[]):Promise<T[]> {
        if (!Is.NeString(collection)) throw new Error('Mongo@aggregate: Collection should be a non-empty string');
        if (!Is.NeArray(pipeline)) throw new Error('Mongo@aggregate: Pipeline should be a non-empty array');

        const s_pipe = [];
        for (const el of pipeline) {
            if (!Is.NeObject(el)) continue;
            s_pipe.push(el);
        }
        if (!Is.NeArray(s_pipe)) throw new Error('Mongo@aggregate: Pipeline empty after sanitization');

        return new Query(this, collection.trim()).aggregate<T>(s_pipe);
    }

    /**
     * Close the client pool
     *
     * @returns {Promise<void>} Resolves when connection is successfully terminated
     * @throws {Error} When failing to terminate client pool
     */
    async close ():Promise<void> {
        if (!this.#mongo_client) return;

        try {
            /* Log */
            this.#log('Mongo@close: Closing connection');

            /* Close client pool */
            await this.#mongo_client.close();
            this.#mongo_client = false;

            /* Clear database */
            this.#mongo_database = false;

            /* Log */
            this.#log('Mongo@close: Connection terminated');
        } catch (err) {
            /* Log */
            this.#log('Mongo@close: Failed to terminate', {err: err instanceof Error ? err.message : 'Unknown Error'});
        }
    }

}
