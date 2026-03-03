import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { asyncExecFile, TMP_PROJECT_DIR } from './test-utils';

await writeFile(
  path.join(TMP_PROJECT_DIR, 'package.json'),
  JSON.stringify({
    private: true,
    name: 'bun-run-all-test-package',
    scripts: {
      'test-success-1': 'exit 0',
      'test-success-2': 'exit 0',
      'test-failure': 'exit 1',
      'test-failure-2': 'exit 1',
      'test-echo': `bun -e "console.log('hello-from-script')"`,
      'test-stderr-fail': `bun -e "console.error('error-output'); process.exit(1)"`,
    },
  })
);
await asyncExecFile('bun', ['run', 'format:all', 'tests/__fixture__']);
