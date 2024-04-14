'use strict';

/* eslint-disable class-methods-use-this */

type MockMode = 'throw' | 'wrongret' | 'emptyret' | 'unack' | 'success';

let mode_exec:MockMode = 'success';
let mode_exec_return:any = {acknowledged: true, insertedCount: 50};

let calls:any[] = [];

export default class MockUnorderedBulkOp {

    constructor (opts) {
        calls.push({key: 'ctor', params: {opts}});
    }

    insert (doc, opts = {}):MockUnorderedBulkOp {
        calls.push({key: 'insert', params: {doc, opts}});
        return this;
    }

    async execute (opts = {}): Promise<any> {
        calls.push({key: 'execute', params: {opts}});

        if (mode_exec === 'throw') throw new Error('MockUnorderedBulkOp@execute: Oh No!');

        if (mode_exec === 'wrongret') return false;

        return mode_exec_return;
    }

    static get calls ():any[] {
        return calls;
    }

    static setModeExec (mode:MockMode = 'success', retval:any = {acknowledged: true, insertedCount: 50}) {
        mode_exec = mode;
        mode_exec_return = retval;
    }

    static reset () {
        calls = [];
        MockUnorderedBulkOp.setModeExec();
    }

}