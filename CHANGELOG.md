# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic
Versioning](https://semver.org/spec/v2.0.0.html).

## [2.5.0] - 2025-05-29
### Added
- **deps**: (dev) vitest@3.1.4
- **deps**: (dev) @vitest/coverage-v8@3.1.4

### Improved
- **sys**: Migrate to vitest
- **misc**: Package.json exports block will now link to cjs/esm built files
- **cicd**: @valkyriestudios/mongo now has two builds, one for cjs and one for esm, this ensures further tree shaking can take place in runtimes/build systems that support this while ensuring legacy systems using CommonJS are not impacted
- **cicd**: @valkyriestudios/mongo will now run lint/types/test jobs against the latest bun runtime as well (in addition to already testing node 20 and 22)
- **deps**: Upgrade @types/node to 22.15.24
- **deps**: Upgrade @valkyriestudios/utils to 12.39.0
- **deps**: Upgrade @valkyriestudios/validator to 10.5.0
- **deps**: Upgrade eslint to 9.27.0
- **deps**: Upgrade typescript-eslint to 8.33.0

### Removed
- **deps**: nyc

## [2.4.0] - 2025-05-08
### Improved
- **misc**: Updated license to include all contributors portion and add license badge to readme
- **misc**: Improved on CI, bundle existing lint/coverage/test workflows in one ci workflow, add types, audit, publish jobs
- **deps**: Upgrade @types/node to 22.15.16
- **deps**: Upgrade @valkyriestudios/utils to 12.36.0
- **deps**: Upgrade @valkyriestudios/validator to 10.3.0
- **deps**: Upgrade eslint to 9.26.0
- **deps**: Upgrade mongodb to 6.16.0
- **deps**: Upgrade typescript to 5.8.3
- **deps**: Upgrade typescript-eslint to 8.32.0

## [2.3.0] - 2025-03-23
### Added
- **feat**: Add possibility to work with auth mechanism properties in uri connect (for more, [see release](https://www.mongodb.com/community/forums/t/mongodb-nodejs-driver-6-15-0-released/315891)).
Work with provider chain from AWS SDK:
```typescript
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

const mongo = new Mongo({
    uri: "...",
    auth_mechanism_properties: {
        AWS_CREDENTIAL_PROVIDER: fromNodeProviderChain(),
    },
});
```

Provide as async function:
```typescript
const mongo = new Mongo({
    uri: "...",
    auth_mechanism_properties: {
        AWS_CREDENTIAL_PROVIDER: async () => {
            return {
                accessKeyId: process.env.ACCESS_KEY_ID,
                secretAccessKey: process.env.SECRET_ACCESS_KEY,
            };
        },
    },
});
```

### Improved
- **deps**: Upgrade @types/node to 22.13.11
- **deps**: Upgrade @valkyriestudios/utils to 12.35.0
- **deps**: Upgrade @valkyriestudios/validator to 10.2.0
- **deps**: Upgrade eslint to 9.23.0
- **deps**: Upgrade mongodb to 6.15.0
- **deps**: Upgrade typescript-eslint to 8.27.0

## [2.2.0] - 2025-03-09
### Improved
- **deps**: Upgrade @types/node to 22.13.10
- **deps**: Upgrade @valkyriestudios/utils to 12.34.0
- **deps**: Upgrade @valkyriestudios/validator to 10.1.0
- **deps**: Upgrade eslint to 9.22.0
- **deps**: Upgrade mongodb to 6.14.2
- **deps**: Upgrade typescript to 5.8.2
- **deps**: Upgrade typescript-eslint to 8.26.0

## [2.1.0] - 2025-02-23
### Improved
- **deps**: Upgrade @types/node to 22.13.5
- **deps**: Upgrade @valkyriestudios/validator to 10.0.1
- **deps**: Upgrade eslint to 9.21.0
- **deps**: Upgrade mongodb to 6.13.1
- **deps**: Upgrade typescript-eslint to 8.24.1

## [2.0.0] - 2025-02-16
### Added
- **feat**: You can now pass your own log function as part of the options to a mongo instance. This log function will receive an object containing level, fn, msg, (optional) err and data. Important to note that **logging will only happen if debug is passed as true**. Here's an example log function:
```typescript
const mongo = new Mongo({
    ...
    debug: true,
    logger: function (log:LogObject) {
        console.log('[' + log.level + '] ' + log.fn + ': ' + log.msg);
    },
});
```
- **feat**: You can now control which levels get logged by passing an array of levels as options. The four available levels are `debug`, `info`, `warn`, `error`. For Example:
```typescript
const mongo = new Mongo({
    ...
    debug: true,
    debug_levels: ['warn', 'error'], // Only warn and error logs get logged
});
```
- **feat**: Query@insertOne - Added ability to run a single insertion

### Improved
- **dx**: Added an exports block to package.json
- **feat**: Query@findOne now makes use of native findOne rather than an aggregation pipeline
- **feat**: Query@count will now make use of the countDocuments interface instead of count as the latter is deprecated.
- **deps**: Upgrade @valkyriestudios/utils to 12.31.1
- **deps**: Upgrade @valkyriestudios/validator to 10.0.0
- **deps**: Upgrade mongodb to 6.13.0
- **deps**: Upgrade @types/node to 22.13.4
- **deps**: Upgrade eslint to 9.20.1
- **deps**: Upgrade typescript to 5.7.3
- **deps**: Upgrade typescript-eslint to 8.24.0

### Breaking
- **feat**: Query@bulkOps will now return null rather than throw on system failure, instead logging the error to the new logger interface
- **feat**: Query@aggregate will now return an empty array rather than throw on system failure, instead logging the error to the new logger interface
- **feat**: Query@removeOne will now return a boolean true/false if the operation was successful. System failures will now be logged to the new logger interface
- **feat**: Query@removeMany will now return a boolean true/false if the operation was successful. System failures will now be logged to the new logger interface
- **feat**: Query@updateOne will now return a boolean true/false if the operation was successful. System failures will now be logged to the new logger interface
- **feat**: Query@updateMany will now return a boolean true/false if the operation was successful. System failures will now be logged to the new logger interface
- **feat**: Query@insertMany will now return a boolean true/false if the operation was successful. System failures will now be logged to the new logger interface

## [1.22.0] - 2024-11-30
### Improved
- **deps**: Upgrade @valkyriestudios/utils to 12.29.0
- **deps**: Upgrade @valkyriestudios/validator to 9.29.0
- **deps**: Upgrade mongodb to 6.11.0
- **deps**: Upgrade @types/node to 22.10.1
- **deps**: Upgrade eslint to 9.16.0
- **deps**: Upgrade typescript to 5.7.2
- **deps**: Upgrade typescript-eslint to 8.16.0

## [1.21.0] - 2024-11-03
### Improved
- **deps**: Upgrade @valkyriestudios/utils to 12.27.1
- **deps**: Upgrade @valkyriestudios/validator to 9.28.0
- **deps**: Upgrade @types/node to 22.8.7
- **deps**: Upgrade eslint to 9.14.0
- **deps**: Upgrade mongodb to 6.10.0
- **deps**: Upgrade typescript-eslint to 8.12.2

## [1.20.0] - 2024-10-12
### Added
- **feat**: Query@count - Added count as a utility method to the Query baseclass
```typescript
/* No filters */
const totalRecords = await MyMongo.query('users').count();

/* With filters */
const activeUsers = await MyMongo.query('users').count({
    isActive: {$eq: true},
});

/* With aggregation pipeline: Important to note that a '$count' stage will automatically be injected here */
const activeUsers = await MyMongo.query('users').count([
    {$match: {
        isActive: {$eq: true},
        type: {$exists: true},
    }},
]);
```

### Improved
- **dx**: Query now listens to a generic passed to it and as such can be made type-safe on find/update/remove method calls. Important Note: This doet not work yet for projection type-safety in findOne
```typescript
type User = {
    uid: string;
    firstName: string;
    lastName: string;
    type: 'user' | 'admin';
    isActive: boolean;
};

const instance = MyMongo.query<User>('users');

/* Typescript will complain here as 'hello' is not a valid value for boolean */
instance.findOne({isActive: {$eq: 'hello'}});

/* Typescript will complain here as 'hello' is not a valid value for boolean */
instance.removeOne({isActive: {$eq: 'hello'}});

/* Typescript will complain here as 0 is not a valid value for isActive */
instance.updateMany(
    {isActive: {$eq: 0}},
    {$set: {firstName: 'Peter'}}
);

/* Typescript will complain here as false is not a valid value for firstName */
instance.updateMany(
    {isActive: {$eq: false}},
    {$set: {firstName: false}}
);

/* The result here will be typed as User */
const user = instance.findOne({uid: {$eq: '123456'}});
```
- **perf**: Improved on regex efficiency regarding validation of mongo uri in new uri connect options (1.19.0)
- **deps**: Upgrade @types/node to 20.16.11
- **deps**: Upgrade typescript to 5.6.3
- **deps**: Upgrade typescript-eslint to 8.8.1

## [1.19.0] - 2024-10-06
### Added
- **feat**: Added support for uri-based connections
```typescript
/* Pass uri to connect */
const mongo = new Mongo({uri: 'mongodb+srv://.../myDb?...'});

/* Pass directly from process, for example */
const mongo = new Mongo({uri: process.env.MONGO_URI});

/* Important Note, IF the uri does not have a db as part of its path it NEEDS to be passed as part of the config */
const mongo = new Mongo({uri: process.env.MONGO_URI, db: 'myDb'});

/* You can also pass additional options */
const mongo = new Mongo({
    uri: process.env.MONGO_URI,
    db: 'myDb',
    pool_size: 20,
    debug: true,
});
```
- **feat**: You can now pass `connect_timeout_ms` as a config variable when instantiating a Mongo instance (default remains at `10000` milliseconds)
- **feat**: You can now pass `socket_timeout_ms` as a config variable when instantiating a Mongo instance (default remains at `0` milliseconds)
- **deps**: typescript-eslint 8.8.0 (dev deps for eslint 9.x)

### Improved
- **misc**: Migrate to eslint 9.x
- **deps**: Upgrade @valkyriestudios/utils to 12.25.1
- **deps**: Upgrade @valkyriestudios/validator to 9.27.0
- **deps**: Upgrade mongodb to 6.9.0
- **deps**: Upgrade @types/node to 20.16.10
- **deps**: Upgrade eslint to 9.12.0
- **deps**: Upgrade nyc to 17.1.0
- **deps**: Upgrade typescript to 5.6.2
- **deps**: Upgrade typescript-eslint to 8.8.0

### Removed
- **deps**: @typescript-eslint/eslint-plugin
- **deps**: @typescript-eslint/parser

## [1.18.0] - 2024-09-07
### Improved
- **deps**: Upgrade @valkyriestudios/utils to 12.22.0
- **deps**: Upgrade @valkyriestudios/validator to 9.24.0
- **deps**: Upgrade @types/node to 20.16.5
- **deps**: Upgrade mongodb to 6.8.1

## [1.17.0] - 2024-08-18
### Improved
- **deps**: Upgrade @valkyriestudios/utils to 12.20.0
- **deps**: Upgrade @valkyriestudios/validator to 9.23.0
- **deps**: Upgrade @types/node to 22.4.0
- **sys**: Automated test runs are now run against node 18.x, 20.x and 22.x instead of only 20.x

## [1.16.0] - 2024-08-10
### Improved
- **perf**: Minor performance improvement of insertMany by working with new options in valkyrie utils regarding dedupe filtering
- **perf**: Minor performance improvement of aggregate by working with new options in valkyrie utils regarding dedupe filtering
- **perf**: Minor performance improvements thanks to using chain operators
- **deps**: Upgrade @valkyriestudios/utils to 12.19.0
- **deps**: Upgrade @valkyriestudios/validator to 9.22.0

## [1.15.0] - 2024-08-05
### Improved
- **deps**: Upgrade @valkyriestudios/utils to 12.18.0
- **deps**: Upgrade @types/node to 20.14.14
- **deps**: Upgrade @typescript-eslint/eslint-plugin to 7.18.0
- **deps**: Upgrade @typescript-eslint/parser to 7.18.0
- **deps**: Upgrade esbuild-register to 3.6.0
- **deps**: Upgrade typescript to 5.5.4
## [1.14.0] - 2024-07-21
### Improved
- **deps**: Upgrade @valkyriestudios/validator to 9.20.0

## [1.13.0] - 2024-07-21
### Improved
- **deps**: Upgrade @valkyriestudios/validator to 9.19.0
- **deps**: Upgrade @types/node to 20.14.11
- **deps**: Upgrade @typescript-eslint/eslint-plugin to 7.16.1
- **deps**: Upgrade @typescript-eslint/parser to 7.16.1

## [1.12.0] - 2024-07-05
### Improved
- **deps**: Upgrade mongodb to 6.8.0
- **deps**: Upgrade @valkyriestudios/validator to 9.15.0
- **deps**: Upgrade @types/node to 20.14.0
- **deps**: Upgrade @typescript-eslint/eslint-plugin to 7.15.0
- **deps**: Upgrade @typescript-eslint/parser to 7.15.0
- **deps**: Upgrade typescript to 5.5.3
- **deps**: Upgrade nyc to 17.0.0

## [1.11.0] - 2024-06-02
### Improved
- **deps**: Upgrade @valkyriestudios/validator to 9.14.0
- **deps**: Upgrade @types/node to 20.13.0
- **deps**: Upgrade @typescript-eslint/eslint-plugin to 7.11.0
- **deps**: Upgrade @typescript-eslint/parser to 7.11.0
- **deps**: Upgrade mongodb to 6.7.0

## [1.10.0] - 2024-05-27
### Improved
- **deps**: Upgrade @valkyriestudios/validator to 9.12.0
- **deps**: Upgrade @typescript-eslint/eslint-plugin to 7.10.0
- **deps**: Upgrade @typescript-eslint/parser to 7.10.0

## [1.9.0] - 2024-05-18
### Improved
- **deps**: Upgrade @valkyriestudios/validator to 9.11.0
- **deps**: Upgrade @types/node to 20.12.12
- **deps**: Upgrade @typescript-esint/eslint-plugin to 7.9.0
- **deps**: Upgrade @typescript-eslint/parser to 7.9.0
- **deps**: Upgrade mongodb to 6.6.2

## [1.8.0] - 2024-05-11
### Added
- **feat**: Query@findOne

### Improved
- **deps**: Upgrade @valkyriestudios/validator to 9.10.0
- **deps**: Upgrade @types/node to 20.12.11
- **deps**: Upgrade mongodb to 6.6.1

## [1.7.0] - 2024-05-01
### Improved
- **deps**: Upgrade @valkyriestudios/validator to 9.9.0
- **deps**: Upgrade @typescript-eslint/eslint-plugin to 7.8.0
- **deps**: Upgrade @typescript-eslint/parser to 7.8.0

## [1.6.0] - 2024-04-27
### Improved
- **deps**: Upgrade @valkyriestudios/validator to 9.7.0
- **deps**: Upgrade @typescript-eslint/eslint-plugin to 7.7.1
- **deps**: Upgrade @typescript-eslint/parser to 7.7.1

## [1.5.0] - 2024-04-18
### Improved
- sys: Mongo is now exported as a named export to allow for working with non-modularized setups, for example:
```typescript
/* Only available way previously */
import Mongo from '@valkyriestudios/mongo';

/* Now also possible */
import {Mongo} from '@valkyriestudios/mongo';
```
- **deps**: Upgrade @valkyriestudios/validator to 9.6.0
- **misc**: Make readme more descriptive, add additional examples

## [1.4.0] - 2024-04-16
### Improved
- **sys**: Update npmignore to ignore most files except for built files

## [1.3.0] - 2024-04-16
### Improved
- **deps**: Upgrade @valkyriestudios/validator to 9.5.0
- **deps**: Upgrade @typescript-eslint/eslint-plugin to 7.7.0
- **deps**: Upgrade @typescript-eslint/parser to 7.7.0

## [1.2.0] - 2024-04-15
### Improved
- **misc**: Reduce internal operations during validity check for collection structure

## [1.1.0] - 2024-04-15
### Improved
- **sys**: Ensure license is correctly flagged as MIT in package.json
- **sys**: Move LICENSE into LICENSE.md

## [1.0.0] - 2024-04-15
