import program from "commander";
import assignParadigms from "../lib/aggregate/paradigm-assignment.js";

program
  .arguments(`<inputPath> <outputPath>`)
  .usage(`assign-paradigms <inputPath> <outputPath>`)
  .action(assignParadigms);

program.parse(process.argv);
