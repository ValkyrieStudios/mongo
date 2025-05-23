import {Validator} from '@valkyriestudios/validator';
import {isNeArray} from '@valkyriestudios/utils/array';
import {isObject, isNeObject} from '@valkyriestudios/utils/object';
import {isFn, noop} from '@valkyriestudios/utils/function';
import {isNeString} from '@valkyriestudios/utils/string';
import {fnv1A} from '@valkyriestudios/utils/hash/fnv1A';
import {Query} from './Query';
import {
    MongoClient,
    Db,
    Collection,
    type CreateIndexesOptions,
    type Document,
    type AuthMechanismProperties,
} from 'mongodb';

import {
    Protocols,
    type Protocol,
    ReadPreferences,
    type ReadPreference,
    LogLevel,
    type LogObject,
    type LogFn,
} from './Types';

/* Standard logger function in case debug is turned on without a logger */
const stdLogger = (log:LogObject) => {
    const msg = '[' + log.level + '] ' + log.fn + ': ' + log.msg;
    if (log.level === LogLevel.ERROR) {
        if (log.data) {
            console.error(msg, log.err, log.data);
        } else {
            console.error(msg, log.err, log.data);
        }
    } else if (log.data) {
        console.info(msg, log.data);
    } else {
        console.info(msg);
    }
};

type MongoHostFullOptions = {
    /* Whether or not we should debug, this is internal to the library and purely focuses on pool events (defaults to false) */
    debug: boolean;

    /* Debug levels, defaults to ['info', 'error', 'warn'] */
    debug_levels: LogLevel[];

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
    replset: string|boolean;

    /* Mongo protocol to use (defaults to 'mongodb') */
    protocol: Protocol;

    /* Read Preference for connection pool (defaults to 'nearest') */
    read_preference: ReadPreference;

    /* Whether or not we should retry reads (defaults to true) */
    retry_reads: boolean;

    /* Whether or not we should retry writes (defaults to true) */
    retry_writes: boolean;

    /* Time in milliseconds to attempt a connection (defaults to 10000) */
    connect_timeout_ms: number;

    /* Time in milliseconds to attempt a send or receive on a socket before the attempt times out */
    socket_timeout_ms: number;
}

type MongoUriFullOptions = {
    /* Whether or not we should debug, this is internal to the library and purely focuses on pool events (defaults to false) */
    debug: boolean;

    /* Debug levels, defaults to ['info', 'error', 'warn'] */
    debug_levels: LogLevel[];

    /* Size of the connection pool (defaults to 5) */
    pool_size: number;

    /* URI to connect to */
    uri: string;

    /* Database to use for connection pool */
    db: string;

    /* Read Preference for connection pool (defaults to 'nearest') */
    read_preference: ReadPreference;

    /* Whether or not we should retry reads (defaults to true) */
    retry_reads: boolean;

    /* Whether or not we should retry writes (defaults to true) */
    retry_writes: boolean;

    /* Time in milliseconds to attempt a connection (defaults to 10000) */
    connect_timeout_ms: number;

    /* Time in milliseconds to attempt a send or receive on a socket before the attempt times out */
    socket_timeout_ms: number;

    /* Auth mechanism properties (eg: AWS_CREDENTIAL_PROVIDER) */
    auth_mechanism_properties?: AuthMechanismProperties;
}

/* Required mongo options */
type MongoHostOptions = Partial<MongoHostFullOptions> & Required<Pick<MongoHostFullOptions, 'user' | 'pass' | 'db'>> & {
    logger?: LogFn;
};
type MongoUriOptions = Partial<MongoUriFullOptions> & Required<Pick<MongoUriFullOptions, 'uri'>> & {
    logger?: LogFn;
};

export type MongoOptions = MongoHostOptions | MongoUriOptions;

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

const CustomValidator = Validator.extend({
    mongo_enum_protocols: Object.values(Protocols),
    mongo_enum_read_pref: Object.values(ReadPreferences),
    mongo_enum_index_val: [-1, 1],
    mongo_debug_level: Object.values(LogLevel),
    mongo_uri: /^(mongodb(?:\+srv)?):\/\/(?:([^:@]+)(?::([^@]+))?@)?([A-Za-z0-9.-]+(?::\d+)?(?:,[A-Za-z0-9.-]+(?::\d+)?)*)(?:\/([^/?]+)?)?(?:\?(.*))?$/, /* eslint-disable-line max-len */
    mongo_collection_structure_index: {
        name: 'string_ne|min:1|max:128',
        spec: '{min:1}mongo_enum_index_val',
        options: '?object_ne',
    },
});

const vCollectionStructure = CustomValidator.create({
    name    : 'string_ne|min:1|max:128',
    idx     : '?[unique]mongo_collection_structure_index',
});

const vOptions = CustomValidator.create({
    debug               : 'boolean',
    debug_levels        : '[unique]mongo_debug_level',
    pool_size           : 'integer|min:1|max:100',
    host                : 'string_ne|min:1|max:1024',
    user                : 'string_ne|min:1|max:256',
    pass                : 'string_ne|min:1|max:256',
    db                  : 'string_ne|min:1|max:128',
    auth_db             : 'string_ne|min:1|max:128',
    replset             : ['string_ne|min:1|max:128', 'false'],
    protocol            : 'mongo_enum_protocols',
    read_preference     : 'mongo_enum_read_pref',
    retry_reads         : 'boolean',
    retry_writes        : 'boolean',
    connect_timeout_ms  : 'integer|min:1000',
    socket_timeout_ms   : 'integer|min:0',
});

const vUriOptions = CustomValidator.create({
    debug               : 'boolean',
    debug_levels        : '[unique]mongo_debug_level',
    uri                 : 'mongo_uri',
    pool_size           : 'integer|min:1|max:100',
    db                  : 'string_ne|min:1|max:128',
    read_preference     : 'mongo_enum_read_pref',
    retry_reads         : 'boolean',
    retry_writes        : 'boolean',
    connect_timeout_ms  : 'integer|min:1000',
    socket_timeout_ms   : 'integer|min:0',
    auth_mechanism_properties: ['?', {
        SERVICE_HOST: '?string_ne',
        SERVICE_NAME: '?string_ne',
        SERVICE_REALM: '?string_ne',
        CANONICALIZE_HOST_NAME: ['?', 'boolean', 'literal:none', 'literal:forward', 'literal:forwardAndReverse'],
        AWS_SESSION_TOKEN: '?string_ne',
        OIDC_CALLBACK: '?async_function',
        OIDC_HUMAN_CALLBACK: '?async_function',
        ENVIRONMENT: ['?', 'literal:test', 'literal:azure', 'literal:gcp', 'literal:k8s'],
        ALLOWED_HOSTS: '?[unique|min:1]string_ne',
        TOKEN_RESOURCE: '?string_ne',
        AWS_CREDENTIAL_PROVIDER: '?async_function',
    }],
});

const DEFAULTS = {
    debug: false,
    debug_levels: [LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR],
    pool_size: 5,
    read_preference: ReadPreferences.NEAREST,
    retry_reads: true,
    retry_writes: true,
    connect_timeout_ms: 10000,
    socket_timeout_ms: 0,
};

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

        /* Ensure indexes have unique names */
        if (struct.idx) {
            const idx_unique_set:Set<string> = new Set();
            for (let i = 0; i < struct.idx.length; i++) idx_unique_set.add(struct.idx[i].name);
            if (idx_unique_set.size !== struct.idx.length) throw new Error(`${msg}: Ensure all indexes have a unique name`);
        }
    }
}

/**
 * Creates a config from a connection config based on uri
 *
 * @param {MongoUriOptions} opts - Connection config
 */
function getConfigFromUriOptions (opts:MongoUriOptions):{config:MongoUriFullOptions;uri:string} {
    let config:Record<string, unknown> = {...DEFAULTS};

    /* Specific url search params */
    try {
        if (!isNeString(opts.uri)) throw new Error('');

        const url = new URL(opts.uri);

        if (url.searchParams.has('retryWrites')) {
            config.retry_writes = url.searchParams.get('retryWrites') === 'true';
        }

        if (url.searchParams.has('retryReads')) {
            config.retry_reads = url.searchParams.get('retryReads') === 'true';
        }

        if (url.searchParams.has('readPreference')) {
            config.read_preference = url.searchParams.get('readPreference') as ReadPreference;
        }

        if (url.searchParams.has('connectTimeoutMS')) {
            config.connect_timeout_ms = parseInt(url.searchParams.get('connectTimeoutMS') as string);
        }

        if (url.searchParams.has('socketTimeoutMS')) {
            config.socket_timeout_ms = parseInt(url.searchParams.get('socketTimeoutMS') as string);
        }

        if (!config.db) {
            config.db = url.pathname?.split('/').pop();
        }
    } catch {
        throw new Error('Mongo@ctor: uri should be passed as a valid uri');
    }

    config = {...config, ...opts};

    /* If we don't have a DB get it from the uri */
    if (!config.db) throw new Error('Mongo@ctor: db not in uri and not provided in config');

    /* Validate options, throw if invalid */
    if (!vUriOptions.check(config)) throw new Error('Mongo@ctor: options are invalid');

    return {config: config as MongoUriFullOptions, uri: opts.uri};
}

/**
 * Creates a config from a connection config based on host variables
 *
 * @param {MongoOptions} opts - Connection config
 */

function getConfigFromHostOptions (opts:MongoHostOptions):{config:MongoHostFullOptions;uri:string} {
    const config = {
        ...DEFAULTS,
        host            : '127.0.0.1:27017',
        auth_db         : 'admin',
        replset         : false,
        protocol        : Protocols.STANDARD,
        ...opts,
    };

    /* Validate options, throw if invalid */
    if (!vOptions.check(config)) throw new Error('Mongo@ctor: options are invalid');

    /* Create connection uri */
    let uri = `${config.protocol}://${config.user}:${config.pass}@${config.host}/${config.auth_db}`;
    if (config.replset) uri += `?replicaSet=${config.replset}`;

    return {config, uri};
}

class Mongo {

    /* Full configuration */
    #config:MongoHostFullOptions|MongoUriFullOptions;

    /* Extracted connection string (built off of configuration) */
    #uri:string;

    /* Mongo Client pool (if established) */
    #mongo_client:MongoClient|false = false;

    /* Mongo Database instance (if established) */
    #mongo_database:Db|false = false;

    /* Extracted identifier for this Mongo instance */
    #uid:string;

    /* Internal log function */
    #log:LogFn = noop;

    constructor (connection_opts:MongoOptions) {
        /* Verify that the options passed are in the form of an object */
        if (!isNeObject(connection_opts)) throw new Error('Mongo@ctor: options should be an object');

        /* If we have a uri we know it's uri options */
        const {config, uri} = 'uri' in connection_opts
            ? getConfigFromUriOptions(connection_opts)
            : getConfigFromHostOptions(connection_opts);

        this.#config = config;
        this.#uri = uri;

        /* If debug, swap out logger */
        if (this.#config.debug) {
            const logProxy = function (obj:LogObject) {
                /* eslint-disable-next-line */
                /* @ts-ignore */
                // eslint-disable-next-line no-invalid-this
                if (!this.levels.has(obj.level)) return;

                /* eslint-disable-next-line */
                /* @ts-ignore */
                // eslint-disable-next-line no-invalid-this
                this.fn(obj);
            };

            /* eslint-disable-next-line */
            /* @ts-ignore */
            logProxy.levels = new Set([...this.#config.debug_levels]);

            /* eslint-disable-next-line */
            /* @ts-ignore */
            logProxy.fn = isFn(connection_opts.logger) ? connection_opts.logger : stdLogger;

            this.#log = logProxy.bind(logProxy);
        }

        /* Create instance uid */
        this.#uid = `mongodb:${fnv1A({uri: this.#uri, db: this.#config.db})}`;

        this.#log({level: LogLevel.INFO, fn: 'Mongo@ctor', msg: 'Instantiated'});
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
     * Getter which returns the configured log function
     */
    get log ():LogFn {
        return this.#log;
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
        if (isNeArray(structure)) validateStructure(structure, 'Mongo@bootstrap');

        try {
            /* Log */
            this.#log({level: LogLevel.INFO, fn: 'Mongo@bootstrap', msg: 'Connectivity check'});

            /* Connect (this will throw if failing to connect) */
            await this.connect();

            /* If structure is provided, run collection/index builds */
            if (isNeArray(structure)) {
                this.#log({level: LogLevel.INFO, fn: 'Mongo@bootstrap', msg: 'Ensuring structure'});
                for (const struct of structure) {
                    /* Create collection if it doesnt exist */
                    const col_exists = await this.hasCollection(struct.name);
                    if (!col_exists) await this.createCollection(struct.name);

                    /* Create indexes if they dont exist */
                    if (!struct.idx || !isNeArray(struct.idx)) continue;
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
                this.#log({level: LogLevel.INFO, fn: 'Mongo@bootstrap', msg: 'Structure ensured'});
            }

            /* Close connection (cleanup) */
            await this.close();

            /* Log */
            this.#log({level: LogLevel.INFO, fn: 'Mongo@bootstrap', msg: 'Connectivity success'});
        } catch (err) {
            this.#log({level: LogLevel.ERROR, fn: 'Mongo@bootstrap', msg: 'Connectivity failure', err: err as Error, data: {structure}});
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
            this.#log({level: LogLevel.INFO, fn: 'Mongo@connect', msg: 'Establishing connection'});

            /**
             * Await client connection pool instantiation
             * https://mongodb.github.io/node-mongodb-native/6.3/classes/MongoClient.html
             * https://mongodb.github.io/node-mongodb-native/6.3/classes/MongoClient.html#connect
             */
            this.#mongo_client = await MongoClient.connect(this.#uri, {
                minPoolSize         : 1,
                maxPoolSize         : this.#config.pool_size,
                maxConnecting       : this.#config.pool_size,
                connectTimeoutMS    : this.#config.connect_timeout_ms,
                socketTimeoutMS     : this.#config.socket_timeout_ms,
                readPreference      : this.#config.read_preference,
                retryReads          : this.#config.retry_reads,
                retryWrites         : this.#config.retry_writes,
                compressors         : ['zlib'],
                zlibCompressionLevel: 3,
                ...isNeObject((this.#config as MongoUriFullOptions).auth_mechanism_properties)
                    ? {authMechanismProperties: (this.#config as MongoUriFullOptions).auth_mechanism_properties}
                    : {},
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
            this.#log({level: LogLevel.INFO, fn: 'Mongo@connect', msg: 'Connection established'});

            return this.#mongo_database;
        } catch (err) {
            /* Reset props */
            this.#mongo_client      = false;
            this.#mongo_database    = false;

            /* Log */
            this.#log({level: LogLevel.ERROR, fn: 'Mongo@connect', msg: 'Failed to connect', err: err as Error});

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
        if (!isNeString(collection)) throw new Error('Mongo@hasCollection: Collection should be a non-empty string');

        /* Connect */
        const db = await this.connect();
        if (!(db instanceof Db)) throw new Error('Mongo@hasCollection: Failed to connect');

        const name = collection.trim();

        const result = await db.listCollections({name});
        if (!isFn(result?.toArray)) throw new Error('Mongo@hasCollection: Unexpected result');

        const exists = isNeArray(await result.toArray());

        this.#log({
            level: LogLevel.INFO,
            fn: 'Mongo@hasCollection',
            msg: exists ? 'Collection exists' : 'Collection does not exist',
            data: {collection: name},
        });

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
        if (!isNeString(collection)) throw new Error('Mongo@createCollection: Collection should be a non-empty string');

        /* Connect */
        const db = await this.connect();
        if (!(db instanceof Db)) throw new Error('Mongo@createCollection: Failed to connect');

        const name = collection.trim();

        /* Log */
        this.#log({level: LogLevel.INFO, fn: 'Mongo@createCollection', msg: 'Creating collection', data: {collection: name}});
        const result = await db.createCollection(name);

        this.#log(result
            ? {level: LogLevel.INFO, fn: 'Mongo@createCollection', msg: 'Collection created', data: {collection: name}}
            : {
                level: LogLevel.ERROR,
                fn: 'Mongo@createCollection',
                msg: 'Did not create collection',
                err: new Error('Failed to create collection'),
                data: {collection: name},
            });

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
        if (!isNeString(collection)) throw new Error('Mongo@dropCollection: Collection should be a non-empty string');

        /* Connect */
        const db = await this.connect();
        if (!(db instanceof Db)) throw new Error('Mongo@dropCollection: Failed to connect');

        const name = collection.trim();

        /* Log */
        this.#log({level: LogLevel.WARN, fn: 'Mongo@dropCollection', msg: 'Dropping collection', data: {collection: name}});

        const result = await db.dropCollection(name);
        this.#log(result
            ? {level: LogLevel.WARN, fn: 'Mongo@dropCollection', msg: 'Collection dropped', data: {collection: name}}
            : {level: LogLevel.WARN, fn: 'Mongo@dropCollection', msg: 'Did not drop collection', data: {collection: name}});

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
        if (!isNeString(collection)) throw new Error('Mongo@hasIndex: Collection should be a non-empty string');
        if (!isNeString(name)) throw new Error('Mongo@hasIndex: Index Name should be a non-empty string');

        /* Connect */
        const db = await this.connect();
        if (!(db instanceof Db)) throw new Error('Mongo@hasIndex: Failed to connect');

        const col_name = collection.trim();
        const idx_name = name.trim();

        const result = await db.collection(col_name).indexExists(idx_name);

        /* Log */
        this.#log({
            level: LogLevel.INFO,
            fn: 'Mongo@hasIndex',
            msg: result ? 'Index exists' : 'Index does not exist',
            data: {collection: col_name, name: idx_name},
        });

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
        if (!isNeString(collection)) throw new Error('Mongo@createIndex: Collection should be a non-empty string');
        if (!isNeString(name)) throw new Error('Mongo@createIndex: Index Name should be a non-empty string');

        if (
            !isNeObject(spec) ||
            !Object.values(spec).every(el => el === 1 || el === -1)
        ) throw new Error('Mongo@createIndex: Invalid spec passed');

        if (!isObject(options)) throw new Error('Mongo@createIndex: Options should be an object');

        /* Connect */
        const db = await this.connect();
        if (!(db instanceof Db)) throw new Error('Mongo@createIndex: Failed to connect');

        const col_name = collection.trim();
        const idx_name = name.trim();

        /* Log */
        this.#log({
            level: LogLevel.INFO,
            fn: 'Mongo@createIndex',
            msg: 'Creating index',
            data: {collection: col_name, name: idx_name, spec, options},
        });

        /* Create Index */
        const result = await db.collection(col_name).createIndex(spec, {...options, name: idx_name});

        this.#log(result
            ? {
                level: LogLevel.INFO,
                fn: 'Mongo@createIndex',
                msg: 'Index created',
                data: {collection: col_name, name: idx_name, spec, options},
            }
            : {
                level: LogLevel.ERROR,
                fn: 'Mongo@createIndex',
                msg: 'Failed to create index',
                err: new Error('Failed to create index'),
                data: {collection: col_name, name: idx_name, spec, options},
            }
        );

        return isNeString(result);
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
        if (!isNeString(collection)) throw new Error('Mongo@dropIndex: Collection should be a non-empty string');
        if (!isNeString(name)) throw new Error('Mongo@dropIndex: Index Name should be a non-empty string');

        /* Connect */
        const db = await this.connect();
        if (!(db instanceof Db)) throw new Error('Mongo@dropIndex: Failed to connect');

        const col_name = collection.trim();
        const idx_name = name.trim();

        this.#log({level: LogLevel.INFO, fn: 'Mongo@dropIndex', msg: 'Dropping index', data: {collection: col_name, name: idx_name}});

        /* Drop Index */
        try {
            await db.collection(col_name).dropIndex(idx_name);
            this.#log({level: LogLevel.INFO, fn: 'Mongo@dropIndex', msg: 'Index dropped', data: {collection: col_name, name: idx_name}});
            return true;
        } catch (err) {
            this.#log({
                level: LogLevel.ERROR,
                fn: 'Mongo@dropIndex',
                msg: 'Failed to drop index',
                err: err as Error,
                data: {collection: col_name, name: idx_name},
            });
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
    query <T extends Document> (collection:string):Query<T> {
        if (!isNeString(collection)) throw new Error('Mongo@query: Collection should be a non-empty string');

        return new Query<T>(this, collection.trim());
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
        if (!isNeString(collection)) throw new Error('Mongo@aggregate: Collection should be a non-empty string');
        if (!isNeArray(pipeline)) throw new Error('Mongo@aggregate: Pipeline should be a non-empty array');

        const s_pipe = [];
        for (const el of pipeline) {
            if (!isNeObject(el)) continue;
            s_pipe.push(el);
        }
        if (!isNeArray(s_pipe)) throw new Error('Mongo@aggregate: Pipeline empty after sanitization');

        return new Query<T>(this, collection.trim()).aggregate<T>(s_pipe);
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
            this.#log({level: LogLevel.INFO, fn: 'Mongo@close', msg: 'Closing connection'});

            /* Close client pool */
            await this.#mongo_client.close();
            this.#mongo_client = false;

            /* Clear database */
            this.#mongo_database = false;

            /* Log */
            this.#log({level: LogLevel.INFO, fn: 'Mongo@close', msg: 'Connection Terminated'});
        } catch (err) {
            this.#log({level: LogLevel.ERROR, fn: 'Mongo@close', msg: 'Failed to terminate', err: err as Error});
        }
    }

}

export {Mongo, Mongo as default};
