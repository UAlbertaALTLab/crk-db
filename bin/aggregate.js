#!/usr/bin/env node

import aggregate from '../lib/aggregate/index.js';
import program   from 'commander';

program
.arguments(`<dbPath> <dbPath>`)
.usage(`aggregate-db <dbPath> <dbPath>`)
.action(aggregate);

program.parseAsync(process.argv);
