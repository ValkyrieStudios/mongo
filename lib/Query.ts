'use strict';

import {Is}     from '@valkyriestudios/utils/is';
import {dedupe} from '@valkyriestudios/utils/array/dedupe';
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

class Query {

    /* Instance of @valkyriestudios/mongo the query is running against */
    #instance:Mongo;

    /* Mongo collection the query is for */
    #col:string;

    constructor (instance:Mongo, col:string) {
        if (!(instance instanceof Mongo)) throw new Error('MongoQuery: Expected instance of Mongo');
        if (!Is.NeString(col)) throw new Error('MongoQuery: Expected collection to be a non-empty string');

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
        if (!Is.NeArray(pipeline)) throw new Error('MongoQuery@aggregrate: Pipeline should be an array with content');
        if (!Is.Object(options)) throw new Error('MongoQuery@aggregate: Options should be an object');

        /* Sanitize pipeline */
        const normalized_pipeline = dedupe(pipeline.filter(Is.NeObject));
        if (!Is.NeArray(normalized_pipeline)) throw new Error('MongoQuery@aggregate: Pipeline is empty after sanitization');

        /* Run pipeline */
        try {
            /* Connect */
            const db = await this.#instance.connect();

            /* Run query */
            const result = await db.collection(this.#col).aggregate(normalized_pipeline, options).toArray();
            if (!Is.Array(result)) throw new Error('Unexpected result');
            return result as T[];
        } catch (err) {
            throw new Error(`MongoQuery@aggregate: Failed - ${err instanceof Error ? err.message : 'Unknown Error'}`);
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
    async removeOne (query:Filter<Document>, options:DeleteOptions = {}):Promise<DeleteResult> {
        if (!Is.NeObject(query)) throw new Error('MongoQuery@removeOne: Query should be an object with content');
        if (!Is.Object(options)) throw new Error('MongoQuery@removeOne: Options should be an object');

        try {
            /* Connect */
            const db = await this.#instance.connect();

            /* Run query */
            const result = await db.collection(this.#col).deleteOne(query, options);
            if (!Is.Object(result)) throw new Error('Unexpected result');
            if (!result.acknowledged) throw new Error('Unacknowledged');
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
    async removeMany (query:Filter<Document>, options:DeleteOptions = {}):Promise<DeleteResult> {
        if (!Is.NeObject(query)) throw new Error('MongoQuery@removeMany: Query should be an object with content');
        if (!Is.Object(options)) throw new Error('MongoQuery@removeMany: Options should be an object');

        try {
            /* Connect */
            const db = await this.#instance.connect();

            /* Run query */
            const result = await db.collection(this.#col).deleteMany(query, options);
            if (!Is.Object(result)) throw new Error('Unexpected result');
            if (!result.acknowledged) throw new Error('Unacknowledged');
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
    async updateOne (query:Filter<Document>, data:UpdateFilter<Document>, options:UpdateOptions = {}):Promise<UpdateResult> {
        if (!Is.NeObject(query)) throw new Error('MongoQuery@updateOne: Query should be an object with content');
        if (!Is.NeObject(data) && !Is.NeArray(data)) throw new Error('MongoQuery@updateOne: Data should be an object/array with content');
        if (!Is.Object(options)) throw new Error('MongoQuery@updateOne: Options should be an object');

        /* Check if all entries are at least objects with content when passed an update pipeline */
        if (Is.Array(data) && !data.every(Is.NeObject)) throw new Error('MongoQuery@updateOne: Data pipeline is invalid');

        try {
            /* Connect */
            const db = await this.#instance.connect();

            /* Run query */
            const result = await db.collection(this.#col).updateOne(query, data, options);
            if (!Is.Object(result)) throw new Error('Unexpected result');
            if (!result.acknowledged) throw new Error('Unacknowledged');
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
    async updateMany (query:Filter<Document>, data:UpdateFilter<Document>, options:UpdateOptions = {}):Promise<UpdateResult> {
        if (!Is.NeObject(query)) throw new Error('MongoQuery@updateMany: Query should be an object with content');
        if (!Is.NeObject(data) && !Is.NeArray(data)) throw new Error('MongoQuery@updateMany: Data should be an object/array with content');
        if (!Is.Object(options)) throw new Error('MongoQuery@updateMany: Options should be an object');

        /* Check if all entries are at least objects with content when passed an update pipeline */
        if (Is.Array(data) && !data.every(Is.NeObject)) throw new Error('MongoQuery@updateMany: Data pipeline is invalid');

        try {
            /* Connect */
            const db = await this.#instance.connect();

            /* Run query */
            const result = await db.collection(this.#col).updateMany(query, data, options);
            if (!Is.Object(result)) throw new Error('Unexpected result');
            if (!result.acknowledged) throw new Error('Unacknowledged');
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
    async insertMany (documents:Document[]):Promise<BulkWriteResult> {
        if (!Is.NeArray(documents)) throw new Error('MongoQuery@insertMany: Documents should be an array with content');

        const normalized_documents = dedupe(documents.filter(Is.NeObject));
        if (!Is.NeArray(normalized_documents)) throw new Error('MongoQuery@insertMany: Documents is empty after sanitization');

        try {
            const result = await this.bulkOps(operator => {
                for (const el of normalized_documents) operator.insert(el);
            }, false);
            if (
                !Is.Object(result) ||
                result.insertedCount !== normalized_documents.length
            ) throw new Error('Not all documents were inserted');

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
        if (!Is.Function(fn)) throw new Error('MongoQuery@bulkOps: Fn should be a function');
        if (!Is.Boolean(sorted)) throw new Error('MongoQuery@bulkOps: Sorted should be a boolean');

        try {
            /* Connect */
            const db = await this.#instance.connect();

            /* Instantiate bulk operator */
            const bulk_operator = sorted === false
                ? db.collection(this.#col).initializeUnorderedBulkOp()
                : db.collection(this.#col).initializeOrderedBulkOp();
            if (!Is.Object(bulk_operator) || !Is.Function(bulk_operator.execute)) throw new Error('Not able to acquire bulk operation');

            /* Pass bulk operator to fn */
            if (!Is.AsyncFunction(fn)) {
                fn(bulk_operator);
            } else {
                await fn(bulk_operator);
            }

            /* Execute operations */
            const result = await bulk_operator.execute();
            if (!Is.Object(result)) throw new Error('Unexpected result');

            return result;
        } catch (err) {
            throw new Error(`MongoQuery@bulkOps: Failed - ${err instanceof Error ? err.message : 'Unknown Error'}`);
        }
    }

}

export {Query, Query as default};
