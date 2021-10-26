#!/usr/bin/env node

import convert from '../lib/convert/CW.js';
import program from 'commander';

program
.arguments(`<inputPath> [outputPath]`)
.usage(`convert-cw <inputPath> [outputPath]`)
.action(convert);

program.parse(process.argv);
