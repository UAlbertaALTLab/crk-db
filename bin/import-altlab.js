#!/usr/bin/env node

import importALTLab from '../lib/import/altlab.js';
import program      from 'commander';

program
.arguments(`<inputPath> <databasePath> [outputPath]`)
.usage(`import-altlab <inputPath> <databasePath> [outputPath]`)
.action(importALTLab);

program.parse(process.argv);
