import program         from "commander";
import assignParadigms from "../lib/aggregate/assignParadigms.js";

program
.arguments(`<inputPath> <outputPath>`)
.usage(`assign-paradigms <inputPath> <outputPath>`)
.action(assignParadigms);

program.parse(process.argv);
