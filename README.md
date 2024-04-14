# @valkyriestudios/mongo

[![CodeCov](https://codecov.io/gh/ValkyrieStudios/mongo/branch/main/graph/badge.svg)](https://codecov.io/gh/ValkyrieStudios/mongo)
[![Test](https://github.com/ValkyrieStudios/mongo/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/ValkyrieStudios/mongo/actions/workflows/test.yml)
[![Lint](https://github.com/ValkyrieStudios/mongo/actions/workflows/lint.yml/badge.svg?branch=main)](https://github.com/ValkyrieStudios/mongo/actions/workflows/lint.yml)
[![CodeQL](https://github.com/ValkyrieStudios/mongo/actions/workflows/github-code-scanning/codeql/badge.svg?branch=main)](https://github.com/ValkyrieStudios/mongo/actions/workflows/github-code-scanning/codeql)
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
```typescript
{
    pool_size: 50,
    host: 'dummyatlas.example.mongodb.net',
    user: 'root',
    pass: 'rootroot',
    db: 'main',
}
```

## Available Functions
### GET uid :string
Getter for a hashed signature of the mongo instance, this can be used for internal systems working with factory-style approaches to ensure only one
connection pool is created for a particular configuration.

Example:
```typescript
import Mongo from '@valkyriestudios/mongo';
const instance = new Mongo({user: 'admin', pass: 'root', db: 'main', read_preference: 'nearest'});
console.info(instance.uid); // 'mongodb:2283077747'
```

Take note: Only certain properties of the configuration are taken into account for hashing of the signature. These properties are: `protocol`, `user`,
`pass`, `host`, `auth_db`, `replset`.

### GET isConnected :boolean
Whether or not the mongo instance is successfully connected and the pool is operational.

Example:
```typescript
import Mongo from '@valkyriestudios/mongo';
const instance = new Mongo({user: 'admin', pass: 'root', db: 'main', read_preference: 'nearest'});

console.info(instance.isConnected); // false

await instance.connect();

console.info(instance.isConnected); // true
```

### GET isDebugEnabled :boolean
Whether or not the instance has debug enabled. By default debug is not enabled.

```typescript
import Mongo from '@valkyriestudios/mongo';
const instance = new Mongo({user: 'admin', pass: 'root', db: 'main', read_preference: 'nearest'});

console.info(instance.isDebugEnabled); // false

const instance2 = new Mongo({user: 'admin', pass: 'root', db: 'main', read_preference: 'nearest', debug: true});

console.info(instance2.isDebugEnabled); // true
```

#### bootstrap (structure?StructureCollection[]):Promise<void>
TODO

#### connect ():Promise<Db>
Establish connection to mongodb using the instance configuration.

Note:
- This **will not** establish multiple connections if a client pool already exists, as such this can be called safely multiple times.
- This **will throw** if the instance fails to acquire a connection
- Most operations handle calling `.connect()` behind the scenes, as such you will not need to use this in most real-world scenarios
- This **can be useful** to run a connectivity test when initializing an application as part of a middleware chain.


```typescript
import MyMongo from './Mongo';

await MyMongo.connect();
```

#### hasCollection (collection:string):Promise<boolean>
Verify whether or not a collection exists on the database the instance is configured for. Returns true if the collection exists and false if it
doesn't.

For example, to test whether or not a collection called 'sales_2023' exists we can do the following:
```typescript
import MyMongo from './Mongo';

const exists = await MyMongo.hasCollection('sales_2023'); 
console.info(exists ? 'exists' : 'does not exist');
```

Let's say we wanted to create the 'sales_2023' collection only if it didn't exist:
```typescript
import MyMongo from './Mongo';

const exists = await MyMongo.hasCollection('sales_2023');
if (!exists) await MyMongo.createCollection('sales_2023');
```

Note: There is no need to call connect prior to this operation as this is handled internally.

#### createCollection (collection:string):Promise<boolean>
Create a collection on the database.

Let's say we want to create a collection called 'sales_2024':
```typescript
import MyMongo from './Mongo';

const created = await MyMongo.createCollection('sales_2024');
console.info(created ? 'was created' : 'failed to create');
```

Note: There is no need to call connect prior to this operation as this is handled internally.

#### dropCollection (collection:string):Promise<boolean>
Drop a collection on the database.

Let's say we want to do some cleanup on our database and no longer need the old 'sales\_2008' collection:
```typescript
import MyMongo from './Mongo';

await MyMongo.dropCollection('sales_2008'); 
```

Note:
- There is no need to call connect prior to this operation as this is handled internally.
- **⚠️ Careful: This operation removes a collection and is irreversible**

#### hasIndex (collection:string, name:string):Promise<boolean> 
Verify whether or not an index exists for a particular collection on the database. Returns true if the index exists and false if it
doesn't.

For example, to test whether or not an index called 'date\_asc' exists on a collection called 'sales\_2023' exists we can do the following:
```typescript
import MyMongo from './Mongo';

const exists = await MyMongo.hasIndex('sales_2023', 'date_asc'); 
console.info(exists ? 'exists' : 'does not exist');
```

Let's say we wanted to create the 'date\_asc' index on our 'sales\_2023' collection only if it didn't exist:
```typescript
import MyMongo from './Mongo';

const exists = await MyMongo.hasIndex('sales_2023', 'date_asc');
if (!exists) await MyMongo.createIndex('sales_2023', 'date_asc', {date: 1});
```

Note: There is no need to call connect prior to this operation as this is handled internally.

#### createIndex (collection:string, name:string, spec:{[key:string]:1|-1}, options:CreateIndexesOptions = {}):Promise<boolean>
TODO

#### dropIndex (collection:string, name:string):Promise<boolean>
Drop an index on a collection on the database

Let's say we want to do some cleanup on our database and no longer need the 'date\_desc' index on a collection called 'sales\_2008':
```typescript
import MyMongo from './Mongo';

await MyMongo.dropIndex('sales_2008', 'date_desc'); 
```

Note:
- There is no need to call connect prior to this operation as this is handled internally.
- **⚠️ Careful: This operation removes an index, though not irreversible it might harm performance if that index is still in use**

#### query (collection:string):Query
Get a query instance for a specific collection (more on Querying in the secion titled [Querying](#querying)

For example let's say we wanted a query instance for a particular collection to reuse later down the line:
```typescript
import MyMongo from './Mongo';

const qUser = MyMongo.query('users');

...

/* Retrieve peter */
const user = await qUser.aggregate([
    {$match: {name: {$eq: 'Peter'}}},
    {$limit: 1},
    {$project: {uid: 1}},
]);

/* Remove peter */
if (Array.isArray(user) && user.length) await qUser.removeOne({uid: {$eq: user[0].uid}});
```

Note:
- There is no need to call connect prior to this operation as this is handled internally.
- A query instance can be re-used however many times necessary

#### aggregate
TODO

#### close ():Promise<void>
Closes the client pool

```typescript
import MyMongo from './Mongo';
await MyMongo.close();
```

Note:
- Any operation done after the client pool is closed will re-open the client pool
- This can be useful to run cleanup when shutting down an application
- This will not do anything and simply resolve if the client pool did not exist or was not connected

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


