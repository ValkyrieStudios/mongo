# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic
Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.0] - 2024-04-27
### Improved
- **deps**: Upgrade @valkyriestudios/validator to 9.1.1
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
