'use strict';

export default class MockFn {

    /* Original function on the parent container */
    #orig_fn:unknown;

    /* Parent container of the function being mocked */
    #mock_par:any;

    /* Name of the function being mocked on the parent container */
    #mock_key:string;

    /* Mocked function */
    #mock_fn:unknown;

    /* Blueprint for synchronous mock */
    #blueprint_sync = (...args) => {
        this.calls.push(args);
        return typeof this.return === 'function' ? this.return(...args) : this.return;
    };

    /* Blueprint for asynchronous mock */
    #blueprint_async = async (...args) => {
        this.calls.push(args);
        if (this.reject) throw new Error('Oh No');
        return typeof this.return === 'function' ? this.return(...args) : this.return;
    };

    /* Array of calls to the mocked function */
    calls:any[] = [];

    /* Configured return when the mocked function gets called */
    return:any = false;

    /* Whether or not the mock should reject the call (for use in async mocks) */
    reject:boolean = false;

    /**
     * Reset the current mock for a next test
     */
    reset () {
        this.return = false;
        this.reject = false;
        this.calls  = [];
    }

    /**
     * Mock a function on the provided parent
     *
     * @param {object/class} par - Object or class that contains the method we want to mock
     * @param {string} key - Name of the method we want to mock
     */
    mock (par:any, key:string) {
        this.#mock_par = par;
        this.#mock_key = key;
        this.#orig_fn  = par[key];

        /* Override parent key with mock */
        par[key] = (this.#orig_fn as any).constructor.name === 'AsyncFunction' ? this.#blueprint_async : this.#blueprint_sync;

        /* Ensure state is reset if mocking a new function */
        this.reset();
    }

    /**
     * Restore the mocked function to its original state
     */
    restore () {
        this.#mock_par[this.#mock_key] = this.#orig_fn;
    }

}
