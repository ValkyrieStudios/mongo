import {
    AggregateOptions,
    BulkWriteOptions,
    Collection,
    DeleteOptions,
    DeleteResult,
    Document,
    Filter,
    UpdateFilter,
    UpdateOptions,
    UpdateResult,
} from 'mongodb';
import MockOrderedBulkOp from './MockOrderedBulkOp';
import MockUnorderedBulkOp from './MockUnorderedBulkOp';

type MockMode = 'throw' | 'wrongret' | 'emptyret' | 'unack' | 'success';

export default class MockCollection extends Collection {

    #calls:unknown[] = [];

    #col_aggregate:MockMode = 'success';

    #col_delete_one:MockMode = 'success';

    #col_delete_many:MockMode = 'success';

    #col_update_one:MockMode = 'success';

    #col_update_many:MockMode = 'success';

    #col_unordered_bop:MockMode = 'success';

    #col_ordered_bop:MockMode = 'success';

    constructor (col:string) {
        /* eslint-disable-next-line */
        /* @ts-ignore */
        super({databaseName: 'main', client: {}}, col, {});
    }

    /* eslint-disable-next-line */
    /* @ts-ignore */
    aggregate (pipeline:Document[], options:AggregateOptions) {
        this.#calls.push({key: 'aggregate', params: {pipeline, options}});

        if (this.#col_aggregate === 'throw') throw new Error('MockCollection@aggregate: Oh No!');

        if (this.#col_aggregate === 'wrongret') return {toArray: async () => false};

        return {toArray: async () => [{bla: 'bla'}]};
    }

    async deleteOne (query:Filter<Document>, options:DeleteOptions):Promise<DeleteResult> {
        this.#calls.push({key: 'deleteOne', params: {query, options}});

        if (this.#col_delete_one === 'throw') throw new Error('MockCollection@deleteOne: Oh No!');

        /* eslint-disable-next-line */
        /* @ts-ignore */
        if (this.#col_delete_one === 'wrongret') return 'hello';

        if (this.#col_delete_one === 'unack') return {acknowledged: false, deletedCount: 1};

        return {deletedCount: 1, acknowledged: true};
    }

    async deleteMany (query:Filter<Document>, options:DeleteOptions):Promise<DeleteResult> {
        this.#calls.push({key: 'deleteMany', params: {query, options}});

        if (this.#col_delete_many === 'throw') throw new Error('MockCollection@deleteMany: Oh No!');

        /* eslint-disable-next-line */
        /* @ts-ignore */
        if (this.#col_delete_many === 'wrongret') return 'hello';

        if (this.#col_delete_many === 'unack') return {acknowledged: false, deletedCount: 1};

        return {deletedCount: 42, acknowledged: true};
    }

    async updateOne (query:Filter<Document>, data:UpdateFilter<Document>, options:UpdateOptions):Promise<UpdateResult> {
        this.#calls.push({key: 'updateOne', params: {query, data, options}});

        if (this.#col_update_one === 'throw') throw new Error('MockCollection@updateOne: Oh No!');

        /* eslint-disable-next-line */
        /* @ts-ignore */
        if (this.#col_update_one === 'wrongret') return 'hello';

        if (this.#col_update_one === 'unack') return {acknowledged: false, matchedCount: 1, modifiedCount: 0, upsertedCount: 0} as UpdateResult;

        return {acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0} as UpdateResult;
    }

    async updateMany (query:Filter<Document>, data:UpdateFilter<Document>, options:UpdateOptions):Promise<UpdateResult> {
        this.#calls.push({key: 'updateMany', params: {query, data, options}});

        if (this.#col_update_many === 'throw') throw new Error('MockCollection@updateMany: Oh No!');

        /* eslint-disable-next-line */
        /* @ts-ignore */
        if (this.#col_update_many === 'wrongret') return 'hello';

        if (this.#col_update_many === 'unack') return {acknowledged: false, matchedCount: 10, modifiedCount: 0, upsertedCount: 0} as UpdateResult;

        return {acknowledged: true, matchedCount: 10, modifiedCount: 10, upsertedCount: 0} as UpdateResult;
    }

    /* eslint-disable-next-line */
    /* @ts-ignore */
    initializeUnorderedBulkOp (options:BulkWriteOptions|undefined): MockUnorderedBulkOp {
        this.#calls.push({key: 'initializeUnorderedBulkOp', params: {options}});

        if (this.#col_unordered_bop === 'throw') throw new Error('MockCollection@initializeUnorderedBulkOp: Oh No!');

        /* eslint-disable-next-line */
        /* @ts-ignore */
        if (this.#col_unordered_bop === 'wrongret') return false;

        return new MockUnorderedBulkOp(options);
    }

    /* eslint-disable-next-line */
    /* @ts-ignore */
    initializeOrderedBulkOp (options:BulkWriteOptions|undefined): MockOrderedBulkOp {
        this.#calls.push({key: 'initializeOrderedBulkOp', params: {options}});

        if (this.#col_ordered_bop === 'throw') throw new Error('MockCollection@initializeOrderedBulkOp: Oh No!');

        /* eslint-disable-next-line */
        /* @ts-ignore */
        if (this.#col_ordered_bop === 'wrongret') return false;

        return new MockOrderedBulkOp(options);
    }

    /* MOCK UTILITIES */

    get calls ():unknown[] {
        return this.#calls;
    }

    setColAggregate (mode:MockMode = 'success') {
        this.#col_aggregate = mode;
    }

    setColDeleteOne (mode:MockMode = 'success') {
        this.#col_delete_one = mode;
    }

    setColDeleteMany (mode:MockMode = 'success') {
        this.#col_delete_many = mode;
    }

    setColUpdateOne (mode:MockMode = 'success') {
        this.#col_update_one = mode;
    }

    setColUpdateMany (mode:MockMode = 'success') {
        this.#col_update_many = mode;
    }

    setColUnorderedBop (mode:MockMode = 'success') {
        this.#col_unordered_bop = mode;
    }

    setColOrderedBop (mode:MockMode = 'success') {
        this.#col_ordered_bop = mode;
    }

    reset () {
        this.#calls = [];
        this.setColAggregate();
        this.setColDeleteOne();
        this.setColDeleteMany();
        this.setColUpdateOne();
        this.setColUpdateMany();
        this.setColUnorderedBop();
        this.setColOrderedBop();
        MockUnorderedBulkOp.reset();
        MockOrderedBulkOp.reset();
    }

}
