/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const data = new Map();
let failNext = false;
const storage = {
  async getItem(key) {
    return data.get(key) ?? null;
  },
  async setItem(key, value) {
    await new Promise((resolve) => setTimeout(resolve, 2));
    if (failNext) {
      failNext = false;
      throw new Error('disk full');
    }
    data.set(key, value);
  },
  async removeItem(key) {
    data.delete(key);
  },
};
const cache = new Map();
function load(filename) {
  const file = path.resolve(root, filename);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const localRequire = (id) => {
    if (id === '@react-native-async-storage/async-storage') return storage;
    if (id === 'react-native') return { Platform: { OS: 'web' } };
    if (id === 'expo-task-manager') return {};
    if (id.startsWith('@/')) return load(id.slice(2) + '.ts');
    if (id.startsWith('.'))
      return load(path.relative(root, path.resolve(path.dirname(file), id + '.ts')));
    return require(id);
  };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(
    localRequire,
    module,
    module.exports,
  );
  return module.exports;
}
const { appendLocations } = load('utils/tracking.ts');
const { haversineDistance } = load('utils/location.ts');
const { formatDateShort, formatDistance } = load('utils/format.ts');
const { settingsSchema, tripSchema, createId } = load('utils/validation.ts');
const { storageTransaction, writeStoredValue } = load('utils/storage.ts');
const tracking = load('utils/backgroundLocation.ts');
const point = (timestamp, longitude = 0) => ({
  timestamp,
  longitude,
  latitude: 0,
  speed: 20,
  accuracy: 5,
});
const state = () => ({
  isTracking: true,
  startTime: 1000,
  distance: 0,
  routePoints: [],
  lastPoint: null,
});

test('GPS duplicates and delayed samples cannot double-count distance', () => {
  const first = appendLocations(state(), [point(1000), point(61000, 0.01)]);
  const duplicate = appendLocations(first, [point(1000), point(61000, 0.01)]);
  assert.equal(duplicate.distance, first.distance);
  assert.equal(duplicate.routePoints.length, 2);
});
test('legitimate segments longer than half a mile are counted', () => {
  const result = appendLocations(state(), [point(1000), point(61000, 0.01)]);
  assert.ok(result.distance > 0.5 && result.distance < 0.8);
});
test('bad accuracy, invalid coordinates, old fixes and implausible jumps are rejected', () => {
  const result = appendLocations(state(), [
    point(0),
    point(1000),
    { ...point(2000), latitude: NaN },
    { ...point(3000), accuracy: 100 },
    point(4000, 100),
  ]);
  assert.equal(result.routePoints.length, 1);
  assert.equal(result.distance, 0);
});
test('batched samples are processed chronologically and capped at 5000', () => {
  const result = appendLocations(
    state(),
    Array.from({ length: 5002 }, (_, i) => point(1000 + i * 1000)).reverse(),
  );
  assert.equal(result.routePoints.length, 5000);
  assert.equal(result.lastPoint.timestamp, 5002000);
});
test('stopped recordings ignore late location callbacks', () => {
  const stopped = { ...state(), isTracking: false };
  assert.equal(appendLocations(stopped, [point(1000)]), stopped);
});
test('antipodal distance is finite and unit conversion is correct', () => {
  assert.ok(Number.isFinite(haversineDistance(90, 0, -90, 180)));
  assert.equal(formatDistance(1, '0.01', 'km'), '1.61');
});
test('date labels use calendar dates, including future dates', () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(23, 59, 59);
  assert.equal(formatDateShort(yesterday.getTime()), 'Yesterday');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  assert.notEqual(formatDateShort(tomorrow.getTime()), 'Today');
});
test('old settings receive missing default fields without erasing preferences', () => {
  const settings = settingsSchema.parse({ rounding: '0.01' });
  assert.equal(settings.distanceUnit, 'miles');
  assert.equal(settings.rounding, '0.01');
});
test('invalid saved trips are rejected before reaching reports', () => {
  assert.equal(
    tripSchema.safeParse({ id: 'bad', purpose: '__proto__', distance: NaN }).success,
    false,
  );
});
test('rapid creation has unique identifiers', () => {
  assert.equal(new Set(Array.from({ length: 1000 }, createId)).size, 1000);
});
test('serialized storage updates preserve order and recover after failed writes', async () => {
  await Promise.all([writeStoredValue('order', [1]), writeStoredValue('order', [1, 2])]);
  assert.deepEqual(JSON.parse(data.get('order')), [1, 2]);
  failNext = true;
  await assert.rejects(writeStoredValue('order', [3]));
  await writeStoredValue('order', [4]);
  assert.deepEqual(JSON.parse(data.get('order')), [4]);
});
test('concurrent foreground/background fixes share a transaction and stopping preserves a draft', async () => {
  await tracking.persistState(state());
  await Promise.all([
    tracking.recordLocations([point(1000), point(61000, 0.01)]),
    tracking.recordLocations([point(61000, 0.01), point(121000, 0.02)]),
  ]);
  let saved = await tracking.getPersistedState();
  assert.equal(saved.routePoints.length, 3);
  const distance = saved.distance;
  await tracking.changeTrackingState((s) => ({
    ...s,
    isTracking: false,
    pendingTrip: {
      startTime: s.startTime,
      endTime: 121000,
      distance: s.distance,
      duration: 120,
      routePoints: s.routePoints,
    },
  }));
  await tracking.recordLocations([point(181000, 0.03)]);
  saved = await tracking.getPersistedState();
  assert.equal(saved.distance, distance);
  assert.equal(saved.pendingTrip.distance, distance);
  await tracking.clearPersistedState();
  assert.equal(await tracking.getPersistedState(), null);
});
test('corrupted tracking data surfaces an error and is preserved', async () => {
  data.set(tracking.TRACKING_STATE_KEY, '{broken');
  await assert.rejects(tracking.getPersistedState());
  assert.equal(data.get(tracking.TRACKING_STATE_KEY), '{broken');
});
test('a failed transaction does not block the next transaction', async () => {
  await assert.rejects(
    storageTransaction('test', async () => {
      throw new Error('failed');
    }),
  );
  assert.equal(await storageTransaction('test', async () => 42), 42);
});

test('CSV formulas are neutralized and HTML content is escaped', () => {
  // Export helpers are tested without launching platform share sheets.
  const original = require;
  const filename = path.join(root, 'utils/sharing.ts');
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const mockRequire = (name) =>
    name.startsWith('expo-') || name === 'react-native' ? {} : original(name);
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`)(
    mockRequire,
    module,
    module.exports,
  );
  assert.equal(module.exports.escapeCsv('=1+1'), '"\'=1+1"');
  assert.equal(module.exports.escapeCsv('a,"b"'), '"a,""b"""');
  assert.equal(module.exports.escapeHtml('<script>&'), '&lt;script&gt;&amp;');
});
