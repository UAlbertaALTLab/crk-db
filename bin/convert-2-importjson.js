#!/usr/bin/env node

import convert from '../lib/convert/dlx2importjson.js';
import program from 'commander';

program
.arguments(`<inputPath> <outputPath>`)
.usage(`convert-2-importjson <inputPath> <outputPath>`)
.action(convert);

program.parse(process.argv);
