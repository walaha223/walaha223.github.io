/**
 * Tests Node — couche API PWE en mode démo (sans navigateur).
 * Usage : node pwe/tests/pwe-api.test.mjs
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const fs = require('fs');

function loadScripts() {
  const root = join(__dirname, '../js');
  const sandbox = {
    URLSearchParams,
    window: {
      PWE_SUPABASE: { demo: true },
      PWE_MOCK: null,
      PWE_DIAG: {},
      supabase: null,
      localStorage: {
        _data: {},
        getItem(k) {
          return this._data[k] ?? null;
        },
        setItem(k, v) {
          this._data[k] = String(v);
        },
        removeItem(k) {
          delete this._data[k];
        },
      },
      sessionStorage: {
        _data: {},
        getItem(k) {
          return this._data[k] ?? null;
        },
        setItem(k, v) {
          this._data[k] = String(v);
        },
        removeItem(k) {
          delete this._data[k];
        },
      },
      location: { search: '', hash: '', pathname: '/pwe/' },
      history: { replaceState() {} },
      document: {
        querySelector() {
          return null;
        },
        querySelectorAll() {
          return [];
        },
        getElementById() {
          return null;
        },
        body: { classList: { add() {}, remove() {} } },
      },
      setTimeout(fn) {
        fn();
        return 0;
      },
    },
  };
  sandbox.window = sandbox.window;
  vm.runInNewContext(fs.readFileSync(join(root, 'mock-data.js'), 'utf8'), sandbox);
  sandbox.window.PWE_MOCK = sandbox.window.PWE_MOCK;
  sandbox.sessionStorage = sandbox.window.sessionStorage;
  sandbox.localStorage = sandbox.window.localStorage;
  sandbox.window.sessionStorage = sandbox.sessionStorage;
  sandbox.window.localStorage = sandbox.localStorage;
  vm.runInNewContext(fs.readFileSync(join(root, 'pwe-api.js'), 'utf8'), sandbox);
  sandbox.window.PweApi.init();
  return sandbox.window.PweApi;
}

const Api = loadScripts();
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

assert(Api.getMode() === 'demo', 'init démo');
assert(Api.isDemo(), 'isDemo true');

const schoolId = 'sch-faso-kanu';
const dash = await Api.fetchDashboard(schoolId);
assert(typeof dash.studentsCount === 'number', 'dashboard studentsCount');
assert(Array.isArray(dash.todos), 'dashboard todos');
assert(dash.studentsCount > 0, 'dashboard effectif démo > 0');

const classes = await Api.fetchClasses(schoolId);
assert(classes.length > 0, 'classes démo non vides');
assert(classes.every((c) => c.schoolId === schoolId || !c.schoolId), 'classes scopées école');

const students = await Api.fetchStudents(schoolId);
assert(students.length > 0, 'élèves démo non vides');

const profile = await Api.fetchSchoolProfile({
  school: { id: schoolId },
});
assert(profile.name?.includes('Faso') || profile.name?.length > 0, 'profil école démo');

const stats = await Api.fetchStatistics(schoolId);
assert(stats.students_active != null, 'statistiques élèves actifs');

const storeModules = await Api.fetchStoreModules();
assert(Array.isArray(storeModules), 'catalogue WalahaStore');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
