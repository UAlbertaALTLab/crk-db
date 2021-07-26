#!/usr/bin/env node

import convert from '../lib/convert/MD.js';
import program from 'commander';

program
.arguments(`<inputPath> <outputPath>`)
.usage(`convert-md <inputPath> <outputPath>`)
.action(convert);

program.parse(process.argv);
