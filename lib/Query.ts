import {isBoolean} from '@valkyriestudios/utils/boolean/is';
import {isAsync, isFunction} from '@valkyriestudios/utils/function';
import {isNotEmptyString} from '@valkyriestudios/utils/string/isNotEmpty';
import {isObject, isNeObject} from '@valkyriestudios/utils/object';
import {isArray, isNeArray, dedupe} from '@valkyriestudios/utils/array';
import {Mongo}  from './index';
import {
    type AggregateOptions,
    type BulkWriteResult,
    type DeleteOptions,
    type DeleteResult,
    type Document,
    type Filter,
    type OrderedBulkOperation,
    type UnorderedBulkOperation,
    type UpdateFilter,
    type UpdateOptions,
    type UpdateResult,
} from 'mongodb';

type BulkOperator = OrderedBulkOperation|UnorderedBulkOperation;
type BulkOperatorFunction = (operator:BulkOperator) => void;

class Query <TModel extends Document> {

    /* Instance of @valkyriestudios/mongo the query is running against */
    #instance:Mongo;

    /* Mongo collection the query is for */
    #col:string;

    constructor (instance:Mongo, col:string) {
        if (!(instance instanceof Mongo)) throw new Error('MongoQuery: Expected instance of Mongo');
        if (!isNotEmptyString(col)) throw new Error('MongoQuery: Expected collection to be a non-empty string');

        this.#instance  = instance;
        this.#col       = col;
    }

    /**
     * Run an aggregation pipeline against the collection and return its results
     *
     * @param {Document[]} pipeline - Pipeline array to run
     * @param {AggregateOptions} options - (default={}) Aggregation options
     * @returns {Promise<Document[]>} Array of documents
     * @throws {Error} When provided options are invalid or connection fails
     */
    async aggregate <T extends Document> (pipeline:Document[], options:AggregateOptions = {}):Promise<T[]> {
        if (!isNeArray(pipeline)) throw new Error('MongoQuery@aggregrate: Pipeline should be an array with content');
        if (!isObject(options)) throw new Error('MongoQuery@aggregate: Options should be an object');

        /* Sanitize pipeline */
        const normalized_pipeline = dedupe(pipeline, {filter_fn: isNeObject});
        if (!normalized_pipeline.length) throw new Error('MongoQuery@aggregate: Pipeline is empty after sanitization');

        /* Run pipeline */
        try {
            /* Connect */
            const db = await this.#instance.connect();

            /* Run query */
            const result = await db.collection(this.#col).aggregate(normalized_pipeline, options).toArray();
            if (!isArray(result)) throw new Error('Unexpected result');
            return result as T[];
        } catch (err) {
            throw new Error(`MongoQuery@aggregate: Failed - ${err instanceof Error ? err.message : 'Unknown Error'}`);
        }
    }

    /**
     * Find the first document matching the provided query
     * Take Note: when passing no query it will simply return the first document it finds
     *
     * @param {Filter<Document>?} query - Optional Query that matches the document to find
     * @param {Document?} projection - Optional projection to use, if not passed will return entire object
     * @returns {Promise<Document|null>} The found document or null
     * @throws {Error} when provided query or connection fails
     */
    async findOne <T extends TModel> (query?:Filter<TModel>, projection?:Document):Promise<T|null> {
        if (
            query !== undefined &&
            !isObject(query)
        ) throw new Error('MongoQuery@findOne: If passed, query should be an object');

        if (
            projection !== undefined &&
            !isObject(projection)
        ) throw new Error('MongoQuery@findOne: If passed, projection should be an object');

        try {
            /* Run query */
            const result = await this.aggregate<T>([
                ...isNeObject(query) ? [{$match: query}] : [],
                {$limit: 1},
                ...isNeObject(projection) ? [{$project: projection}] : [],
            ]);

            return isNeArray(result) && isObject(result[0]) ? result[0] : null;
        } catch (err) {
            const msg = err instanceof Error ? err.message.replace('MongoQuery@aggregate: Failed - ', '') : 'Unknown Error';
            throw new Error(`MongoQuery@findOne: Failed - ${msg}`);
        }
    }

    /**
     * Remove the first document matching the provided query
     *
     * @param {Filter<Document>} query - Query that matches the document to be removed
     * @param {DeleteOptions} options - (default={}) Remove options
     * @returns {Promise<DeleteResult>} Result of the query
     * @throws {Error} When provided options are invalid or connection fails
     */
    async removeOne (query:Filter<TModel>, options:DeleteOptions = {}):Promise<DeleteResult> {
        if (!isNeObject(query)) throw new Error('MongoQuery@removeOne: Query should be an object with content');
        if (!isObject(options)) throw new Error('MongoQuery@removeOne: Options should be an object');

        try {
            /* Connect */
            const db = await this.#instance.connect();

            /* Run query */
            const result = await db.collection(this.#col).deleteOne(query as Filter<Document>, options);
            if (!result?.acknowledged) throw new Error('Unacknowledged');
            return result;
        } catch (err) {
            throw new Error(`MongoQuery@removeOne: Failed - ${err instanceof Error ? err.message : 'Unknown Error'}`);
        }
    }

    /**
     * Remove all documents matching the provided query
     *
     * @param {Filter<Document>} query - Query that matches the documents to be removed
     * @param {DeleteOptions} options - (default={}) Remove options
     * @returns {Promise<DeleteResult>} Result of the query
     * @throws {Error} When provided options are invalid or connection fails
     */
    async removeMany (query:Filter<TModel>, options:DeleteOptions = {}):Promise<DeleteResult> {
        if (!isNeObject(query)) throw new Error('MongoQuery@removeMany: Query should be an object with content');
        if (!isObject(options)) throw new Error('MongoQuery@removeMany: Options should be an object');

        try {
            /* Connect */
            const db = await this.#instance.connect();

            /* Run query */
            const result = await db.collection(this.#col).deleteMany(query as Filter<Document>, options);
            if (!result?.acknowledged) throw new Error('Unacknowledged');
            return result;
        } catch (err) {
            throw new Error(`MongoQuery@removeMany: Failed - ${err instanceof Error ? err.message : 'Unknown Error'}`);
        }
    }

    /**
     * Update the first document matching the provided query
     *
     * @param {Filter<Document>} query - Query that matches the documents to be updated
     * @param {UpdateFilter<Document>} data - Update to run
     * @param {UpdateOptions} options - Update Options
     * @returns {Promise<UpdateResult>} Result of the query
     * @throws {Error} When provided options are invalid or connection fails
     */
    async updateOne (query:Filter<TModel>, data:UpdateFilter<TModel>, options:UpdateOptions = {}):Promise<UpdateResult> {
        if (!isNeObject(query)) throw new Error('MongoQuery@updateOne: Query should be an object with content');
        if (!isNeObject(data) && !isNeArray(data)) throw new Error('MongoQuery@updateOne: Data should be an object/array with content');
        if (!isObject(options)) throw new Error('MongoQuery@updateOne: Options should be an object');

        /* Check if all entries are at least objects with content when passed an update pipeline */
        if (isArray(data) && !data.every(isNeObject)) throw new Error('MongoQuery@updateOne: Data pipeline is invalid');

        try {
            /* Connect */
            const db = await this.#instance.connect();

            /* Run query */
            const result = await db.collection(this.#col).updateOne(query as Filter<Document>, data as UpdateFilter<Document>, options);
            if (!result?.acknowledged) throw new Error('Unacknowledged');
            return result;
        } catch (err) {
            throw new Error(`MongoQuery@updateOne: Failed - ${err instanceof Error ? err.message : 'Unknown Error'}`);
        }
    }

    /**
     * Update all documents matching the provided query
     *
     * @param {Filter<Document>} query - Query that matches the documents to be updated
     * @param {UpdateFilter<Document>} data - Update to run
     * @param {UpdateOptions} options - Update Options
     * @returns {Promise<UpdateResult>} Result of the query
     * @throws {Error} When provided options are invalid or connection fails
     */
    async updateMany (query:Filter<TModel>, data:UpdateFilter<TModel>, options:UpdateOptions = {}):Promise<UpdateResult> {
        if (!isNeObject(query)) throw new Error('MongoQuery@updateMany: Query should be an object with content');
        if (!isNeObject(data) && !isNeArray(data)) throw new Error('MongoQuery@updateMany: Data should be an object/array with content');
        if (!isObject(options)) throw new Error('MongoQuery@updateMany: Options should be an object');

        /* Check if all entries are at least objects with content when passed an update pipeline */
        if (isArray(data) && !data.every(isNeObject)) throw new Error('MongoQuery@updateMany: Data pipeline is invalid');

        try {
            /* Connect */
            const db = await this.#instance.connect();

            /* Run query */
            const result = await db.collection(this.#col).updateMany(query as Filter<Document>, data as UpdateFilter<Document>, options);
            if (!result?.acknowledged) throw new Error('Unacknowledged');
            return result;
        } catch (err) {
            throw new Error(`MongoQuery@updateMany: Failed - ${err instanceof Error ? err.message : 'Unknown Error'}`);
        }
    }

    /**
     * Insert one or multiple documents into a specific collection
     *
     * @param {Document[]} documents - Array of documents to insert
     * @returns {Promise<BulkWriteResult>} Result of the query
     * @throws {Error} When provided options are invalid or connection fails
     */
    async insertMany (documents:TModel[]):Promise<BulkWriteResult> {
        if (!isNeArray(documents)) throw new Error('MongoQuery@insertMany: Documents should be an array with content');

        const normalized_documents = dedupe(documents, {filter_fn: isNeObject});
        if (!isNeArray(normalized_documents)) throw new Error('MongoQuery@insertMany: Documents is empty after sanitization');

        try {
            const result = await this.bulkOps(operator => {
                for (let i = 0; i < normalized_documents.length; i++) {
                    operator.insert(normalized_documents[i]);
                }
            }, false);
            if (result?.insertedCount !== normalized_documents.length) throw new Error('Not all documents were inserted');

            return result;
        } catch (err) {
            throw new Error(`MongoQuery@insertMany: Failed - ${err instanceof Error ? err.message : 'Unknown Error'}`);
        }
    }

    /**
     * Run bulk operations
     *
     * @param {BulkOperatorFunction} fn - Bulk operations callback function
     * @param {boolean} sorted - Whether or not an unordered (false) or ordered (true) bulk operation should be used
     * @returns {Promise<BulkWriteResult>} Result of the query
     * @throws {Error} When provided options are invalid or connection fails
     */
    async bulkOps (fn:BulkOperatorFunction, sorted:boolean = false):Promise<BulkWriteResult> {
        if (!isFunction(fn)) throw new Error('MongoQuery@bulkOps: Fn should be a function');
        if (!isBoolean(sorted)) throw new Error('MongoQuery@bulkOps: Sorted should be a boolean');

        try {
            /* Connect */
            const db = await this.#instance.connect();

            /* Instantiate bulk operator */
            const bulk_operator = db.collection(this.#col)[sorted === false ? 'initializeUnorderedBulkOp' : 'initializeOrderedBulkOp']();
            if (!isObject(bulk_operator) || !isFunction(bulk_operator.execute)) throw new Error('Not able to acquire bulk operation');

            /* Pass bulk operator to fn */
            if (!isAsync(fn)) {
                fn(bulk_operator);
            } else {
                await fn(bulk_operator);
            }

            /* Execute operations */
            const result = await bulk_operator.execute();
            if (!isObject(result)) throw new Error('Unexpected result');

            return result;
        } catch (err) {
            throw new Error(`MongoQuery@bulkOps: Failed - ${err instanceof Error ? err.message : 'Unknown Error'}`);
        }
    }

}

export {Query, Query as default};
