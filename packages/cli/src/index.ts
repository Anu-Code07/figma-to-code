#!/usr/bin/env node
import { Command } from 'commander';
import { loginCommand } from './commands/login.js';
import { importCommand } from './commands/import.js';
import { syncCommand } from './commands/sync.js';
import { previewCommand } from './commands/preview.js';
import { tokensCommand } from './commands/tokens.js';
import { watchCommand } from './commands/watch.js';
import { generateCommand } from './commands/generate.js';
import { registerAllGenerators } from './register-generators.js';

registerAllGenerators();

const program = new Command();

program
  .name('design2code')
  .description('AI Design Compiler — transform Figma designs into production-ready code')
  .version('0.1.0');

program.addCommand(loginCommand);
program.addCommand(importCommand);
program.addCommand(syncCommand);
program.addCommand(previewCommand);
program.addCommand(tokensCommand);
program.addCommand(watchCommand);
program.addCommand(generateCommand);

program.parse();
