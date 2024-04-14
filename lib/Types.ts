'use strict';

/**
 * MongoDB Protocols
 *
 * https://www.mongodb.com/docs/manual/reference/connection-string/#std-label-connections-standard-connection-string-format
 * https://www.mongodb.com/docs/manual/reference/connection-string/#std-label-connections-dns-seedlist
 */
export enum Protocols {
    /* Protocol for connection string that specifies all hosts */
    STANDARD = 'mongodb',

    /* Protocol for hostname that corresponds to a DNS SRV record (eg: Atlas deployments) with a seedlist */
    SRV = 'mongodb+srv',
}

export type Protocol = `${Protocols}`;

/**
 * MongoDB Read Preferences: How we want to balance our load
 *
 * https://www.mongodb.com/docs/manual/core/read-preference/
 */
export enum ReadPreferences {
    /* All operations read from the current replica set primary */
    PRIMARY = 'primary',

    /* Read from primary but fallback to secondary if unavailable */
    PRIMARY_PREFERRED = 'primaryPreferred',

    /* All operations read from the secondary members of the replica set */
    SECONDARY = 'secondary',

    /* Operations typically read data from secondary members of the replica set, falls back to primary */
    SECONDARY_PREFERRED = 'secondaryPreferred',

    /* Operations read from a random eligible replica set member, based on a specified latency threshold */
    NEAREST = 'nearest',
}

export type ReadPreference = `${ReadPreferences}`;
