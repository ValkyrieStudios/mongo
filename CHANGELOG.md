# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic
Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Improved
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
