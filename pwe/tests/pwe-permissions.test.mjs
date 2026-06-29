/**
 * Tests Node — matrice permissions PWE (sans navigateur).
 * Usage : node pwe/tests/pwe-permissions.test.mjs
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

function loadPwePermissions() {
  const code = require('fs').readFileSync(
    join(__dirname, '../js/pwe-permissions.js'),
    'utf8'
  );
  const sandbox = { window: {} };
  vm.runInNewContext(code, sandbox);
  return sandbox.window.PwePermissions;
}

const P = loadPwePermissions();
let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    return;
  }
  failed += 1;
  console.error('✗', msg);
}

assert(P.canViewRoute('school_owner', 'store'), 'promoteur voit WalahaStore');
assert(!P.canViewRoute('school_accountant', 'store'), 'comptable ne voit pas WalahaStore');
assert(P.canWriteRoute('school_secretary', 'students'), 'secrétaire écrit élèves');
assert(!P.canWriteRoute('school_secretary', 'store'), 'secrétaire ne gère pas le store');
assert(P.canViewRoute('teacher', 'homework'), 'enseignant voit devoirs');
assert(!P.canViewRoute('teacher', 'fees'), 'enseignant ne voit pas frais');
assert(P.canPerform('teacher', 'manage_reports'), 'enseignant gère bulletins');
assert(!P.canPerform('teacher', 'manage_fees'), 'enseignant ne gère pas frais');

const sections = P.filterNavSections('school_accountant', [
  {
    section: 'Admin',
    items: [
      { route: 'fees', label: 'Frais' },
      { route: 'store', label: 'Store' },
      { route: 'students', label: 'Élèves' },
    ],
  },
]);
assert(sections[0].items.length === 1 && sections[0].items[0].route === 'fees', 'nav comptable filtrée');

console.log(`${passed} test(s) OK${failed ? `, ${failed} échec(s)` : ''}`);
process.exit(failed ? 1 : 0);
