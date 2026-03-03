import {
  execFile,
  type ExecFileOptionsWithStringEncoding,
  type PromiseWithChild,
} from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const promisifiedExecFile = promisify(execFile);

/**
 * Executes a command as a child process and returns a promise that resolves with the command's output.
 *
 * @param file - The command to run.
 * @param args - List of string arguments.
 * @param options - Options for child_process.execFile.
 * @returns A promise that resolves with the command's stdout and stderr.
 */
export function asyncExecFile(
  file: string,
  args: string[] | undefined | null,
  options: ExecFileOptionsWithStringEncoding = {}
): PromiseWithChild<{
  stdout: string;
  stderr: string;
}> {
  if (options.shell) {
    return promisifiedExecFile([file, ...(args ?? [])].join(' '), options);
  }
  return promisifiedExecFile(file, args, options);
}

/**
 * Creates a function that resolves relative paths based on a given module URL.
 *
 * This is useful when you want to resolve file paths relative to the file where
 * the function is called, by passing in `import.meta.url` from the caller module.
 *
 * @param metaUrl - `import.meta.url`
 * @returns A function that resolves a relative path to an absolute one.
 *
 * @example
 * ```ts
 * const resolve = createRelativeResolver(import.meta.url);
 * const configPath = resolve('./config.json'); // Absolute path
 * ```
 */
export function createRelativeResolver(metaUrl: string) {
  return (relativePath: string) => {
    return path.resolve(path.dirname(fileURLToPath(metaUrl)), relativePath);
  };
}

/**
 * Creates a CLI executor function for a given command or script path.
 *
 * @param cli - The CLI script or executable.
 * @returns A function that runs the CLI with specified arguments and returns a Promise with the result.
 *
 * @example
 * ```ts
 * const run = createCliExecutor('./bin/tool.ts');
 * await run(['--version']);
 * ```
 */
function createCliExecutor(cli: string) {
  return (
    params: string[] = [],
    options: ExecFileOptionsWithStringEncoding = {}
  ) =>
    asyncExecFile('bun', ['run', cli, ...params], {
      shell: true,
      ...options,
    });
}

// Constants
const testDist = process.env.TEST_DIST === 'true';
export const resolve = createRelativeResolver(import.meta.url);
export const cliExecutor = createCliExecutor(
  resolve(testDist ? './dist/index.js' : './src/index.ts')
);
export const TMP_PROJECT_DIR = resolve('tests/__fixture__');
