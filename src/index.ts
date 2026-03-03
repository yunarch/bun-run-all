#!/usr/bin/env node
import { styleText } from 'node:util';
import { Command } from 'commander';
import { runParallel, runSequential } from './utils';

/**
 * Creates a new instance of the base program with custom help and output configurations.
 *
 * @returns the base program instance.
 */
function createBaseProgram() {
  const program = new Command();
  program
    .configureHelp({
      styleTitle: (str) => styleText('bold', str),
      styleCommandText: (str) => styleText('cyan', str),
      styleCommandDescription: (str) => styleText('magenta', str),
      styleDescriptionText: (str) => styleText('italic', str),
      styleOptionText: (str) => styleText('green', str),
      styleArgumentText: (str) => styleText('yellow', str),
      styleSubcommandText: (str) => styleText('blue', str),
    })
    .configureOutput({
      outputError: (str, write) => {
        write(styleText('red', str));
      },
    });
  return program;
}

// Main program execution
await createBaseProgram()
  .name('bun-run-all')
  .description(
    'Run given package scripts in parallel or sequential by using bun.'
  )
  .argument('<scripts...>', "A list of package scripts' names.")
  .option(
    '-c, --continue-on-error',
    'Continue executing other/subsequent tasks even if a task threw an error'
  )
  .option('-p, --parallel', 'Run a group of tasks in parallel.')
  .option('-s, --sequential', 'Run a group of tasks sequentially.')
  .option('-t, --time', 'Report execution time for each task.')
  .addHelpText(
    'after',
    `
Example usage:
${styleText('dim', '$')} \
${styleText('cyan', 'bun-run-all')} \
${styleText('yellow', 'script1')} \
${styleText('yellow', 'script2')}

@deprecated
Bun >=1.3.9 supports this functionality natively:
https://bun.sh/blog/bun-v1.3.9#bun-run-parallel-and-bun-run-sequential
`
  )
  .action(
    async (
      scripts: string[],
      options: {
        continueOnError?: boolean;
        parallel?: boolean;
        sequential?: boolean;
        time?: boolean;
      }
    ) => {
      try {
        console.log(styleText('magenta', '\n🚀 bun-run-all\n'));
        const sequential = options.sequential ?? false;
        const parallel = options.parallel ?? !sequential;
        const continueOnError = options.continueOnError ?? false;
        const reportTime = options.time ?? false;
        if (parallel === sequential) {
          console.error(
            'You cannot use both --parallel and --sequential options at the same time.'
          );
          process.exit(1);
        }
        if (sequential) {
          const exitCode = await runSequential(scripts, {
            continueOnError,
            reportTime,
          });
          process.exit(exitCode);
        }
        const exitCode = await runParallel(scripts, {
          continueOnError,
          reportTime,
        });
        process.exit(exitCode);
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
    }
  )
  .parseAsync(process.argv);
