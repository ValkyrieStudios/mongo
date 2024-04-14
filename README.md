# @valkyriestudios/mongo

[![codecov](https://codecov.io/gh/ValkyrieStudios/mongo/branch/main/graph/badge.svg)](https://codecov.io/gh/ValkyrieStudios/mongo)
[![codeql](https://github.com/ValkyrieStudios/mongo/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/ValkyrieStudios/mongo/actions/workflows/github-code-scanning/codeql)
[![npm](https://img.shields.io/npm/v/@valkyriestudios/mongo.svg)](https://www.npmjs.com/package/@valkyriestudios/mongo)
[![npm](https://img.shields.io/npm/dm/@valkyriestudios/mongo.svg)](https://www.npmjs.com/package/@valkyriestudios/mongo)

Simplified mongo wrapper library for JS backends

`npm install @valkyriestudios/mongo`

## Introduction
This library offers a simple approach to working with mongo instances, offering both direct connectivity as well as ability to connect to Atlas clusters through the mongodb+srv protocol.

Among other defaults it works with connection pooling and applies zlib compression for fast optimized queries. Behind the scenes it works with the latest version of the native mongodb driver and though it does not open up all functionalitites this offers it tries to ensure most real-world scenarios could be handled.

If there's anything missing in this library that you deem a necessity feel free to open a pull request or shoot us a suggestion ;)

## Getting Started
The best way to get started with this library is by creating an instance of mongo, we suggest creating a class which extends from this library's main export and passing the configuration to its super constructor.

Below is an example, for sake of the argument the rest of this document will work through this example class:
```typescript
'use strict';

import Mongo  from '@valkyriestudios/mongo';

class MyMongo extends Mongo {

    constructor () {
        super({... // Configuration options});
    }

}

const instance = new Mongo();
export default instance;
```

###### Options
The following is the list of options available for configuration as well as their defaults. Most of these options have sensible defaults and as such only a handful are truly required.

| Option | Meaning | Required | Default |
|--------|----------|---------|---------|
| **debug** | Internal debug option for @valkyriestudios/mongo, logging will be done on system console if enabled | | `false` |
| **pool_size** | The size of the internal connection pool size, for safety reasons this will be validated as **an integer between 1 and 100** | | `5` |
| **host** | Host URL to connect to | | `127.0.0.1:27017` |
| **user** | Name of the user to connect with | yes | |
| **pass** | Password of the user connecting with | yes | |
| **db** | Database to use for the connection pool | yes | |
| **auth_db** | Authentication Database | | `'admin'` |
| **replset** | Name of the replica set to use **(defaults to false, pass as string to configure)** | | `false` |
| **protocol** | Protocol to connect to mongo with, either `mongodb` or `mongodb+srv` **(Set to `mongodb+srv` for Atlas) | | `'mongodb'` |
| **read_preference** | MongoDB Read Preference (See: https://www.mongodb.com/docs/manual/core/read-preference) | | `'nearest'` |
| **retry_reads** | Whether or not to retry reads when they fail | | `true` |
| **retry_writes** | Whether or not to retry writes when they fail | | `true` |

Below is an example of such a configuration object for an atlas cluster hosted at 'dummyatlas.example.mongodb.net' with a user called 'root' and a password of 'rootroot' for a connection pool with size 50.

**Take note: In real-world scenarios the values here should never be part of a codebase but be provided through the environment**
```
{
    pool_size: 50,
    host: 'dummyatlas.example.mongodb.net',
    user: 'root',
    pass: 'rootroot',
    db: 'main',
}
```

## Available Functions
#### GET uid
TODO

#### GET isConnected
TODO

#### GET isDebugEnabled
TODO

#### bootstrap
TODO

#### connect
TODO

#### hasCollection
TODO

#### createCollection
TODO

#### dropCollection
TODO

#### hasIndex
TODO

#### createIndex
TODO

#### dropIndex
TODO

#### query
TODO

#### aggregate
TODO

#### close
TODO

## Querying
#### aggregate
TODO

#### removeOne
TODO

#### removeMany
TODO

### updateOne
TODO

### updateMany
TODO

### insertMany
TODO

### bulkOps
TODO

## Contributors
- [Peter Vermeulen](mailto:contact@valkyriestudios.be)

