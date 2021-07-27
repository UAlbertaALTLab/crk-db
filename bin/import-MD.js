#!/usr/bin/env node

import importMD from '../lib/import/MD.js';
import program  from 'commander';

program
.arguments(`<mdPath> <databasePath> [fstPath]`)
.usage(`convert-md <mdPath> <databasePath> [fstPath]`)
.action(importMD);

program.parse(process.argv);
