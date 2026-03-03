import { describe, expect, it } from 'bun:test';
import { cliExecutor, TMP_PROJECT_DIR } from '../test-utils';

/**
 * Executes the CLI with the given arguments and collects stdout.
 *
 * @param cliArgs - The CLI arguments to pass to the executor.
 * @returns The collected stdout output and exit code.
 */
export async function collectOutput(cliArgs: string[]) {
  const execution = cliExecutor(cliArgs, {
    cwd: TMP_PROJECT_DIR,
  });
  const result = await new Promise<{ stdout: string; exitCode: number | null }>(
    (resolve) => {
      let data = '';
      let resolved = false;
      const done = (exitCode: number | null) => {
        if (!resolved) {
          resolved = true;
          resolve({ stdout: data, exitCode });
        }
      };
      execution.child.stdout?.on('data', (chunk: Buffer | string) => {
        data += chunk.toString();
      });
      execution.child.on('close', (code) => done(code));
      setTimeout(() => {
        execution.child.kill();
        done(null);
      }, 15_000);
    }
  );
  execution.catch(() => {
    execution.child.kill();
  });
  return result;
}

// Tests
describe('bun-run-all', () => {
  it('throws an error when no scripts argument is provided', () => {
    expect(cliExecutor()).rejects.toThrow(
      "error: missing required argument 'scripts'"
    );
  });

  it('throws an error when --parallel and --sequential are used together', () => {
    expect(
      cliExecutor(['--parallel', '--sequential', 'some-script'])
    ).rejects.toThrow(
      'You cannot use both --parallel and --sequential options at the same time'
    );
  });

  it('displays usage and available options with --help', async () => {
    const { stdout } = await cliExecutor(['--help']);
    expect(stdout).toContain('Usage: bun-run-all [options] <scripts...>');
    expect(stdout).toContain('-p, --parallel');
    expect(stdout).toContain('-s, --sequential');
    expect(stdout).toContain('-c, --continue-on-error');
    expect(stdout).toContain('-t, --time');
  });

  describe('parallel execution (default)', () => {
    it('exits with code 0 and reports success for a single passing script', async () => {
      const { stdout, exitCode } = await collectOutput([
        '--parallel',
        'test-success-1',
      ]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('test-success-1:');
      expect(stdout).toContain('1 successful');
      expect(stdout).toContain('-- 1 total');
      expect(stdout).not.toContain('Finished in');
    });

    it('exits with code 0 and reports elapsed time when --time is enabled', async () => {
      const { stdout } = await collectOutput([
        '--time',
        'test-success-1',
        'test-success-2',
      ]);
      expect(stdout).toContain('test-success-1:');
      expect(stdout).toContain('test-success-2:');
      expect(stdout).toContain('2 successful');
      expect(stdout).toContain('-- 2 total');
      expect(stdout).toContain('Finished in');
    });

    it('exits with non-zero code and reports failure when a script fails', async () => {
      const { stdout, exitCode } = await collectOutput([
        '--continue-on-error',
        'test-failure',
        'test-success-1',
      ]);
      expect(exitCode).not.toBe(0);
      expect(stdout).toContain('test-failure:');
      expect(stdout).toContain('test-success-1:');
      expect(stdout).toContain('1 failed');
      expect(stdout).toContain('1 successful');
      expect(stdout).toContain('-- 2 total');
    });

    it('aborts immediately when a script fails without --continue-on-error', async () => {
      const { stdout, exitCode } = await collectOutput([
        'test-failure',
        'test-success-1',
      ]);
      expect(exitCode).not.toBe(0);
      expect(stdout).not.toContain('Tasks:');
    });

    it('prefixes and displays script stdout output', async () => {
      const { stdout } = await collectOutput(['test-echo']);
      expect(stdout).toContain('test-echo:');
      expect(stdout).toContain('hello-from-script');
    });

    it('captures and displays script stderr output', async () => {
      const { stdout } = await collectOutput([
        '--continue-on-error',
        'test-stderr-fail',
      ]);
      expect(stdout).toContain('test-stderr-fail:');
      expect(stdout).toContain('error-output');
    });
  });

  describe('sequential execution (--sequential)', () => {
    it('exits with code 0 and runs scripts in order for multiple passing scripts', async () => {
      const { stdout, exitCode } = await collectOutput([
        '--sequential',
        'test-success-1',
        'test-success-2',
      ]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('test-success-1:');
      expect(stdout).toContain('test-success-2:');
      expect(stdout).toContain('2 successful');
      expect(stdout).toContain('-- 2 total');
    });

    it('exits with code 0 and reports elapsed time per script when --time is enabled', async () => {
      const { stdout } = await collectOutput([
        '--sequential',
        '--time',
        'test-success-1',
        'test-success-2',
      ]);
      expect(stdout).toContain('test-success-1:');
      expect(stdout).toContain('test-success-2:');
      expect(stdout).toContain('2 successful');
      expect(stdout).toContain('-- 2 total');
      expect(stdout).toContain('Finished in');
    });

    it('exits with non-zero code and reports failure when a script fails', async () => {
      const { stdout, exitCode } = await collectOutput([
        '--sequential',
        '--continue-on-error',
        'test-failure',
        'test-success-1',
      ]);
      expect(exitCode).not.toBe(0);
      expect(stdout).toContain('test-failure:');
      expect(stdout).toContain('test-success-1:');
      expect(stdout).toContain('1 failed');
      expect(stdout).toContain('1 successful');
      expect(stdout).toContain('-- 2 total');
    });

    it('aborts immediately when a script fails without --continue-on-error', async () => {
      const { stdout, exitCode } = await collectOutput([
        '--sequential',
        'test-failure',
        'test-success-1',
      ]);
      expect(exitCode).not.toBe(0);
      expect(stdout).not.toContain('Tasks:');
      expect(stdout).not.toContain('test-success-1:');
    });
  });
});
