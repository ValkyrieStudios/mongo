# @valkyriestudios/mongo

[![CodeCov](https://codecov.io/gh/ValkyrieStudios/mongo/branch/main/graph/badge.svg)](https://codecov.io/gh/ValkyrieStudios/mongo)
[![Test](https://github.com/ValkyrieStudios/mongo/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/ValkyrieStudios/mongo/actions/workflows/test.yml)
[![Lint](https://github.com/ValkyrieStudios/mongo/actions/workflows/lint.yml/badge.svg?branch=main)](https://github.com/ValkyrieStudios/mongo/actions/workflows/lint.yml)
[![CodeQL](https://github.com/ValkyrieStudios/mongo/actions/workflows/github-code-scanning/codeql/badge.svg?branch=main)](https://github.com/ValkyrieStudios/mongo/actions/workflows/github-code-scanning/codeql)
[![npm](https://img.shields.io/npm/v/@valkyriestudios/mongo.svg)](https://www.npmjs.com/package/@valkyriestudios/mongo)
[![npm](https://img.shields.io/npm/dm/@valkyriestudios/mongo.svg)](https://www.npmjs.com/package/@valkyriestudios/mongo)

Simplified mongo wrapper library for JS backends

## Installation
`npm install @valkyriestudios/mongo`


## Introduction
This library offers a simple approach to working with MongoDB instances, offering both direct connectivity as well as the ability to connect to Atlas clusters through the mongodb+srv protocol.

Among other defaults, it works with connection pooling and applies zlib compression for fast optimized queries. Behind the scenes, it works with the latest version of the native MongoDB driver, and though it does not open up all functionalities this offers, it tries to ensure most real-world scenarios could be handled.

If there's anything missing in this library that you deem a necessity, feel free to open a pull request or shoot us a suggestion ;)


## Getting Started
The best way(s) to get started is by creating an instance and exporting it or creating a class that extends from this library's main export and passing the configuration to its super constructor (we only suggest this approach if you want to override certain behaviors).

Below is an example of the instance approach, for sake of the argument, the rest of this document will use this as the 'MyMongo' export:
```typescript
'use strict';

import Mongo from '@valkyriestudios/mongo';

const instance = new Mongo({...});
export default instance;
```

By using the class approach you can internally override certain methods like bootstrap (which is further down in the readme) allowing that logic to be centralized, for example:
```typescript
'use strict';

import Mongo from '@valkyriestudios/mongo';

class MyMongo extends Mongo {

    constructor () {
        super({... // Configuration options});
    }

    async bootstrap () {
        await super.bootstrap([
            ...
            {name: 'users', idx: [{name: 'uid_asc', spec: {uid: 1}}]},
            ...
        ]);
    }

}

const instance = new MyMongo();
export default instance;
```


###### Options
The following is the list of options available for configuration as well as their defaults. Most of these options have sensible defaults and as such, only a handful are truly required.

| Option | Meaning | Required | Default |
|--------|----------|---------|---------|
| **debug** | Internal debug option for @valkyriestudios/mongo, logging will be done on system console if enabled | | `false` |
| **pool_size** | The size of the internal connection pool, for safety reasons this will be validated as **an integer between 1 and 100** | | `5` |
| **host** | Host URL to connect to | | `127.0.0.1:27017` |
| **user** | Name of the user to connect with | yes | |
| **pass** | Password of the user connecting with | yes | |
| **db** | Database to use for the connection pool | yes | |
| **auth_db** | Authentication Database | | `'admin'` |
| **replset** | Name of the replica set to use **(defaults to false, pass as string to configure)** | | `false` |
| **protocol** | Protocol to connect to mongo with, either `mongodb` or `mongodb+srv` (Set to `mongodb+srv` for Atlas) | | `'mongodb'` |
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
    protocol: 'mongodb+srv',
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


### bootstrap (structure?CollectionStructure[]):Promise<void>
Bootstrap is a utility function that is designed to be used as part of the bootstrapping of an application to verify connectivity success.

By default bootstrap will verify that it can connect to mongo using the configuration provided to the instance. It does this in two steps: 1) Connect, 2) close connection. If a connection fails to be made bootstrap will throw an error.

Example bootstrap usage:
```typescript
import MyMongo from './Mongo';

await MyMongo.bootstrap();
```

##### Structural Integrity
An interesting addition to the bootstrap process is what we like to dub **structural integrity**. Many systems start out small and evolve over time, so does data, indexes, collections that an ecosystem might touch on. In addition to this some systems adhere to the 'single source of truth' principle and are organized around the concept of microservices, where each microservice is in charge of its collections and how they work.

To aid in this, the bootstrap method allows you to provide an array of KV objects that we called 'CollectionStructure', this array tells bootstrap to ensure the provided collections as well as optional indexes are created and available.

Without diving further into complex lingo here's a simple example of a call to bootstrap ensuring 4 collections `users`, `events`, `companies`, `locations` as well as their accompanying indexes are created.
```typescript
import MyMongo from './Mongo';

await MyMongo.bootstrap([
    {name: 'users', idx: [
        {name: 'uid_asc', spec: {uid: 1}},
        {name: 'company_id_asc_uid_asc', spec: {company_id: 1, uid: 1}},
    ]},
    {name: 'events', idx: [
        {name: 'date_asc', spec: {date: 1}, options: {expireAfterSeconds: 5184000}}
        {name: 'company_id_asc_user_id_asc', spec: {company_id: 1, user_id: 1}},
    ]},
    {name: 'companies', idx: [
        {name: 'uid_asc', spec: {uid: 1}},
    ]},
    {name: 'locations'}
]);
```

Structural creation through bootstrap **does not remove anything, it only creates**, as such **removing an index from the list will not remove it from the collection**. 

Note:
- A key benefit of this approach is that you can be 100% sure that whatever is in bootstrap will be aligned between a development, staging and production environment.
- Internally bootstrap makes use of the available `hasCollection`, `createCollection`, `hasIndex`, `createIndex` methods on your instance and as such could be seen as a simple configurable orchestrator


### connect ():Promise<Db>
Establish connection to mongodb using the instance configuration.

```typescript
import MyMongo from './Mongo';

await MyMongo.connect();
```

Note:
- This **will not** establish multiple connections if a client pool already exists, as such this can be called safely multiple times.
- This **will throw** if the instance fails to acquire a connection
- Most operations handle calling `.connect()` behind the scenes, as such you will not need to use this in most real-world scenarios
- This **can be useful** to run a connectivity test when initializing an application as part of a middleware chain, here's an example of a hypothetical connectivity-test function:
```typescript
import MyMongo from './Mongo';

async function checkConnectivity ():Promise<boolean> {
    try {
        await MyMongo.connect();
        await MyMongo.close();
        return true;
    } catch (err) {
        return false;
    }
}
```


### hasCollection (collection:string):Promise<boolean>
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


### createCollection (collection:string):Promise<boolean>
Create a collection on the database.

Let's say we want to create a collection called 'sales_2024':
```typescript
import MyMongo from './Mongo';

const created = await MyMongo.createCollection('sales_2024');
console.info(created ? 'was created' : 'failed to create');
```

Note: There is no need to call connect prior to this operation as this is handled internally.


### dropCollection (collection:string):Promise<boolean>
Drop a collection on the database.

Let's say we want to do some cleanup on our database and no longer need the old 'sales\_2008' collection:
```typescript
import MyMongo from './Mongo';

await MyMongo.dropCollection('sales_2008'); 
```

Note:
- There is no need to call connect prior to this operation as this is handled internally.
- **⚠️ Careful: This operation removes a collection and is irreversible**


### hasIndex (collection:string, name:string):Promise<boolean> 
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


### createIndex (collection:string, name:string, spec:{[key:string]:1|-1}, options:CreateIndexesOptions = {}):Promise<boolean>
Create an index on a collection on the database, this method requires you to pass the name of the collection, name you wish to call the index and the index specification.

Check out the following page to learn more about [indexing](https://www.mongodb.com/docs/manual/indexes/)

For example, let's say we wanted to create an index called 'date\_asc\_total\_desc' on a collection called 'sales\_2023' we can do the following:
```typescript
import MyMongo from './Mongo';

await MyMongo.createIndex('sales_2023', 'date_asc_total_desc', {date: 1, total: -1});
```

##### Specification
In the valkyriestudios/mongo library an index specification is a KV map where each key is the name of the field you wish to index and its value being how you want the field to be ordered in the index (1 for ascending and -1 for descending).

##### CreateIndexesOptions
The create indexes options allow for more advanced index usage such as partial filter expressions, TTL indexes, etc.

For example: Let's say we wanted to create an index with a partial filter expression on deleted_at that gets created in the background
```typescript
import MyMongo from './Mongo';

await MyMongo.createIndex('sales_2023', 'date_asc_total_desc_nodeleted', {date: 1, total: -1}, {
    background: true,
    partialFilterExpression: {deleted_at: {$exists: false}}
});
```

Or let's say we wanted to create an index that automatically removes any document older than 90 days:
```typescript
import MyMongo from './Mongo';

await MyMongo.createIndex('events', 'date_asc', {date: 1}, {
    expireAfterSeconds: 7776000,
    background: true,
});
```

Check out the following page to learn more about [CreateIndexesOptions](https://mongodb.github.io/node-mongodb-native/6.5/interfaces/CreateIndexesOptions.html)


### dropIndex (collection:string, name:string):Promise<boolean>
Drop an index on a collection on the database

Let's say we want to do some cleanup on our database and no longer need the 'date\_desc' index on a collection called 'sales\_2008':
```typescript
import MyMongo from './Mongo';

await MyMongo.dropIndex('sales_2008', 'date_desc'); 
```

Note:
- There is no need to call connect prior to this operation as this is handled internally.
- **⚠️ Careful: This operation removes an index, though not irreversible it might harm performance if that index is still in use**


### query (collection:string):Query
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

We can of course also use it immediately like so:
```typescript
import MyMongo from './Mongo';

await MyMongo.query('users').insertMany([{name: 'Jake'}, {name: 'Bob'}]);
```

Note:
- There is no need to call connect prior to this operation as this is handled internally.
- A query instance can be re-used however many times necessary


### aggregate (collection:string, pipeline:Document[]):Promise<Document[]>
Utility function which is a shorthand for aggregation queries (see Querying).

Example usage:
```typescript
import MyMongo from './Mongo';

await MyMongo.aggregate('users', [
    {$match: {is_active: {$eq: true}}},
]);
```

##### Working with types
Important to note is that in the same way the aggregate method on our Query class works with generics this one allows you to pass a type as the type of the return array.

Example usage:
```typescript
import MyMongo from './Mongo';

type User {
    uid:string;
    first_name:string;
    last_name:string;
}
const users = await MyMongo.aggregate<User>('users', [
    {$match: {is_active: {$eq: true}}},
    {$limit: 10},
]);
```


### close ():Promise<void>
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
When using the **query** function on the Mongo instance you get back an instance of @valkyriestudios/mongo/Query. This is a class that is tied to a specific MongoDB collection and opens up crud-functionality in a seamless way.

An instance of this class could be ephemeral and immediately consumed like so:
```typescript
import MyMongo from './Mongo';

await MyMongo.query('users').insertMany([{name: 'Jake'}, {name: 'Bob'}]);
```

or it could be assigned to a variable and used repeatedly, and as such could form the baseline for a model class like below:
```typescript
import MyMongo from './Mongo';

let qUser = MyMongo.query('users');

type User {
    uid:string;
    first_name:string;
    last_name:string;
}

class User {
    ...
    static async one (uid:string):Promise<User|false> {
        if (typeof uid !== 'string' || !uid.length) return false;
        
        const users = await qUser.aggregate<User>([
            {$match: {uid: {$eq: uid}}},
            {$limit: 1},
        ]);
        return Array.isArray(users) && users.length ? users[0] : false;
    }
    ...
}
```

The below sections describe all the methods available on a Query instance.


### aggregate (pipeline:Document[], options:AggregateOptions = {}):Promise<Document[]>
Runs an aggregation pipeline against the query instance's collection and return its results as an array of Documents, this method requires you to pass an aggregation pipeline with an optional AggregateOptions parameter.

Check out the following for:
- an overview of [Mongo Aggregation Pipelines](https://www.mongodb.com/docs/manual/aggregation/).
- an overview of [AggregateOptions](https://mongodb.github.io/node-mongodb-native/6.5/interfaces/AggregateOptions.html)

Example Usage:
```typescript
import MyMongo from './Mongo';

const users = await MyMongo.query('users').aggregate([
    {$match: {is_active: {$eq: true}}},
    {$limit: 10},
]);
```


##### Working with types
Important to note is that the aggregate method works with generics and allows you to pass a type as the type of the return array.

In the above example the `users` array would be seen as an array of type `Document[]` (Document being the internal mongo driver\'s type), however if you want more advanced typing you can provide your type to the aggregate function directly like in the below example. In this example the `users` array would be typed as `User[]`.

```typescript
import MyMongo from './Mongo';

type User {
    uid:string;
    first_name:string;
    last_name:string;
}
const users = await MyMongo.query('users').aggregate<User>([
    {$match: {is_active: {$eq: true}}},
    {$count: 'tally'}
]);
```

### findOne (query?:Filter<Document>, projection?:Document):Promise<Document|null>
Find the **first document matching the provided query**, pass an optional projection object to only return specific fields.

Example usage:
```typescript
import MyMongo from './Mongo';

await MyMongo.query('users').findOne({uid: {$eq: 'd8d61fa6-61e9-4794-84d4-f3280b413dfc'}});
```

Example usage with projection:
```typescript
import MyMongo from './Mongo';

await MyMongo.query('users').findOne({uid: {$eq: 'd8d61fa6-61e9-4794-84d4-f3280b413dfc'}}, {_id: 0, name: 1, email: 1});
```

Note: When not passing a query this function will simply return the first document it finds


### removeOne (query:Filter<Document>, options:DeleteOptions = {}):Promise<DeleteResult>
Remove the **first document matching the provided query**, this method requires you to pass a filter to define which document you want to remove. **By design** this library **does not allow passing an empty query**.

Check out the following for an overview of [DeleteOptions](https://mongodb.github.io/node-mongodb-native/6.5/interfaces/DeleteOptions.html)

Example usage where we are removing a user by uid:
```typescript
import MyMongo from './Mongo';

await MyMongo.query('users').removeOne({uid: {$eq: 'd8d61fa6-61e9-4794-84d4-f3280b413dfc'}});
```

Note: **⚠️ Careful: This operation removes data from a collection and is irreversible**


### removeMany (query:Filter<Document>, options:DeleteOptions = {}):Promise<DeleteResult>
Remove **all documents matching the provided query**, this method requires you to pass a filter to define which documents you want to remove. **By design** this library **does not allow passing an empty query**.

Check out the following for an overview of [DeleteOptions](https://mongodb.github.io/node-mongodb-native/6.5/interfaces/DeleteOptions.html)

Example usage where we are deleting all inactive users that were deleted before 2020:
```typescript
import MyMongo from './Mongo';

await MyMongo.query('users').removeMany({
    is_active: {$eq: false},
    deleted_at: {$lt: new Date('2020-01-01T00:00:00.000Z')},
});
```

Note: **⚠️ Careful: This operation removes data from a collection and is irreversible**


### updateOne (query:Filter<Document>, data:UpdateFilter<Document>, options:UpdateOptions = {}):Promise<UpdateResult>
Update the first document matching the provided query, this method requires you to pass a filter to define which document you want to update as well as the update you want to apply to the matched document. **By design** this library **does not allow passing an empty query**.

Check out the following for an overview of [UpdateOptions](https://mongodb.github.io/node-mongodb-native/6.5/interfaces/UpdateOptions.html)

Example usage where we are pushing a record into an array as well as incrementing a counter and patching an updated timestamp:
```typescript
import MyMongo from './Mongo';

await MyMongo.query('users').updateOne(
    {uid: {$eq: '67388bee-e41b-4d26-b514-f66a6e21c3e2'}},
    {
        $push: {items: {name: 'Margherita Pizza', quantity: 1, price: 8}},
        $inc: {total: 8},
        $set: {updated_at: new Date()},
    }
);
```


### updateMany (query:Filter<Document>, data:UpdateFilter<Document>, options:UpdateOptions = {}):Promise<UpdateResult>
Update all documents matching the provided query, this method requires you to pass a filter to define which documents you want to update as well as the update you want to apply to the matched documents. **By design** this library **does not allow passing an empty query**.

Check out the following for an overview of [UpdateOptions](https://mongodb.github.io/node-mongodb-native/6.5/interfaces/UpdateOptions.html)

Example usage where we are updating all inactive user records that dont have a deleted\_at timestamp with a deleted\_at timestamp:
```typescript
import MyMongo from './Mongo';

await MyMongo.query('users').updateMany(
    {
        is_active: {$eq: false}
        deleted_at: {$exists: false}
    },
    {$set: {deleted_at: new Date()}}
);
```


### insertMany (documents:Document[]):Promise<BulkWriteResult>
Insert one or multiple documents into a specific collection, this method requires you to pass an array of documents. Take note that this method will automatically dedupe the provided array. 

Example usage where we are inserting two new users into a user collection:
```typescript
import guid     from '@valkyriestudios/utils/hash/guid';
import MyMongo  from './Mongo';

await MyMongo.query('users').insertMany([
    {uid: guid(), first_name: 'Peter', last_name: 'Vermeulen', created_at: new Date()},
    {uid: guid(), first_name: 'Jack', last_name: 'Bauer', created_at: new Date()},
]);
```


### bulkOps (fn:BulkOperatorFunction, sorted:boolean = false):Promise<BulkWriteResult>
Run bulk operations against a collection, this method requires you to pass a function which gets called with a bulk operator, by default this applies an unordered bulk operation, pass true as the second parameter to do an ordered bulk operation. 

For more info on the difference between unordered and ordered bulk operations check out [this article](https://www.mongodb.com/docs/manual/reference/method/js-bulk/).

Example usage where we are running multiple different updates to a series of users:
```typescript
import MyMongo from './Mongo';

const users = [
    {uid: '802bdba3-fd47-4b11-80ce-6d690e9b36b2', update: {first_name: 'Jake'}},
    {uid: 'beaebc8a-c9c7-4b75-be10-ad604281b6fb', update: {last_name: 'Stevens'}},
    {uid: 'a5b2bce2-dda7-43fa-bb52-62b33f96f0cd', update: {first_name: 'Bob', last_name: 'Rogers'}}
];

await MyMongo.query('users').bulkOps(bulk_op => {
    for (const el of users) {
        bulk_op.find({uid: el.uid}).updateOne({$set: {...el.update, updated_at: new Date()}});
    }
});
```


## Contributors
- [Peter Vermeulen](https://www.linkedin.com/in/petervermeulen1/)