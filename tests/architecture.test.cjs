const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

// Exercise real TypeScript domain/store/service code without loading native UI
// modules into Node. Native adapters are the only mocked dependencies.
function loader(mocks = {}, globals = {}) {
  const cache = new Map();
  function load(relative) {
    const file = path.resolve(__dirname, '..', relative);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
      fileName: file,
    }).outputText;
    const nativeRequire = createRequire(file);
    const localRequire = specifier => {
      if (specifier in mocks) return mocks[specifier];
      if (specifier.startsWith('.')) {
        const resolved = path.resolve(path.dirname(file), specifier);
        const source = [resolved + '.ts', resolved + '.tsx', path.join(resolved, 'index.ts')].find(candidate => fs.existsSync(candidate));
        if (!source) throw new Error(`Could not resolve ${specifier} from ${file}`);
        return load(path.relative(path.resolve(__dirname, '..'), source));
      }
      return nativeRequire(specifier);
    };
    vm.runInNewContext(compiled, { module, exports: module.exports, require: localRequire, Date, console, setTimeout, clearTimeout, ...globals }, { filename: file });
    return module.exports;
  }
  return load;
}

const load = loader();
const engine = load('src/utils/cycleCalculator.ts');
const dates = load('src/utils/cycleDates.ts');
const { predictMonth } = load('src/utils/calendarPrediction.ts');

test('pair invitations use native cryptographic bytes rather than Math.random', async () => {
  let requested;
  const loadPairing = loader({
    './supabase': { isSupabaseConfigured: false },
    './auth': {},
    '../store/useCycleStore': {},
    'expo-crypto': { getRandomBytesAsync: async count => { requested = count; return new Uint8Array([0, 31, 32, 255, 4, 5]); } },
  });
  const code = await loadPairing('src/services/pairing.ts').randomPairCode();
  assert.equal(requested, 6);
  assert.equal(code.length, 6);
  assert.match(code, /^[A-HJ-NP-Z2-9]{6}$/);
});

test('concurrent pairing requests share one anonymous sign-in and keep existing identities', async () => {
  let signIns = 0;
  let user = null;
  const loadAuth = loader({
    './supabase': { isSupabaseConfigured: true, supabase: { auth: {
      getSession: async () => ({ data: { session: user ? { user } : null }, error: null }),
      signInAnonymously: async () => { signIns++; user = { id: 'authenticated-user' }; return { data: { user }, error: null }; },
    } } },
  });
  const auth = loadAuth('src/services/auth.ts');
  assert.deepEqual(await Promise.all([auth.getAuthenticatedUserId(), auth.getAuthenticatedUserId()]), ['authenticated-user', 'authenticated-user']);
  assert.equal(signIns, 1);
  assert.equal(await auth.getAuthenticatedUserId(), 'authenticated-user');
  assert.equal(signIns, 1);
});

async function syncHarness({ row, error = null, role = 'partner' } = {}) {
  const store = storeHarness();
  await store.persist.rehydrate();
  store.setState({ userRole: role, coupleId: 'couple-a', lastPeriodStartDate: '2026-09-01' });
  const events = {};
  let cleanup;
  let removed = false;
  const channel = {
    on: (_kind, filter, callback) => { events[filter.table] = callback; return channel; },
    subscribe: callback => { callback('SUBSCRIBED'); return channel; },
  };
  const hookStore = selector => selector(store.getState());
  hookStore.getState = store.getState;
  hookStore.setState = store.setState;
  const loadSync = loader({
    'react': { useEffect: effect => { cleanup = effect(); }, useState: initial => [initial, () => {}] },
    'react-native': { AppState: { addEventListener: () => ({ remove() {} }) } },
    '../services/supabase': { isSupabaseConfigured: true, supabase: {
      from: () => ({ select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: row ?? null, error }) }),
      channel: () => channel, removeChannel: async () => { removed = true; },
    } },
    '../services/auth': { getAuthenticatedUserId: async () => 'current-user' },
    '../store/useCycleStore': { useCycleStore: hookStore },
    './useStoreHydrated': { useStoreHydrated: () => true },
  });
  loadSync('src/hooks/useSupabaseSync.ts').useSupabaseSync();
  // Flush authentication, read, subscription and the subscribed catch-up.
  for (let i = 0; i < 20; i++) await Promise.resolve();
  return { store, events, cleanup: () => { cleanup(); }, removed: () => removed };
}

test('data-free revocation event clears the partner even though the cycle UPDATE is no longer readable', async () => {
  const harness = await syncHarness({ row: { id: 'couple-a', partner_uuid: 'current-user', cycle_start_date: '2026-09-01' } });
  assert.equal(harness.store.getState().partnerAccessVerified, true);
  harness.events.couple_access({ new: { couple_id: 'couple-a', member_uuid: 'another-user', active: false } });
  assert.equal(harness.store.getState().coupleId, 'couple-a');
  harness.events.couple_access({ new: { couple_id: 'couple-a', member_uuid: 'current-user', active: false } });
  assert.equal(harness.store.getState().coupleId, null);
  assert.equal(harness.store.getState().partnerAccessRevoked, true);
  // A late queued cycle event cannot restore access.
  harness.events.couples({ new: { id: 'couple-a', partner_uuid: 'current-user', cycle_start_date: '2026-09-01' } });
  assert.equal(harness.store.getState().coupleId, null);
  harness.cleanup();
  assert.equal(harness.removed(), true);
});

test('RLS denial clears old pairs but network failures only lock access, without pretending consent was revoked', async () => {
  const denied = await syncHarness();
  assert.equal(denied.store.getState().coupleId, null);
  assert.equal(denied.store.getState().partnerAccessRevoked, true);
  denied.cleanup();
  const offline = await syncHarness({ error: { message: 'offline' } });
  assert.equal(offline.store.getState().coupleId, 'couple-a');
  assert.equal(offline.store.getState().partnerAccessVerified, false);
  assert.equal(offline.store.getState().partnerAccessRevoked, false);
  offline.cleanup();
});

test('authenticated identity mismatches cannot expose another partner’s persisted cycle cache', async () => {
  const harness = await syncHarness({ row: { id: 'couple-a', partner_uuid: 'different-user', cycle_start_date: '2026-08-01' } });
  assert.equal(harness.store.getState().coupleId, null);
  assert.equal(harness.store.getState().partnerAccessVerified, false);
  assert.notEqual(harness.store.getState().lastPeriodStartDate, '2026-08-01');
  harness.cleanup();
});

test('Her revocation preserves her cycle and only clears the pair after server confirmation', async () => {
  let resolve;
  const store = storeHarness(undefined, null, () => new Promise(done => { resolve = done; }));
  await store.persist.rehydrate();
  store.setState({ userRole: 'her', coupleId: 'couple-a', partnerConnected: true, pairCode: 'K7M2PQ',
    lastPeriodStartDate: '2026-09-01', cycleLength: 31, shareCalendarWithPartner: true });
  const request = store.getState().revokePartner();
  assert.equal(store.getState().partnerConnected, true);
  resolve(true);
  assert.equal(await request, true);
  assert.equal(store.getState().coupleId, null);
  assert.equal(store.getState().shareCalendarWithPartner, false);
  assert.equal(store.getState().pairCode, '');
  assert.equal(store.getState().lastPeriodStartDate, '2026-09-01');
  assert.equal(store.getState().cycleLength, 31);
});

test('failed revocation preserves membership; Partner cannot invoke owner revocation', async () => {
  let calls = 0;
  const store = storeHarness(undefined, null, async () => { calls++; return false; });
  await store.persist.rehydrate();
  store.setState({ userRole: 'her', coupleId: 'couple-a', partnerConnected: true });
  assert.equal(await store.getState().revokePartner(), false);
  assert.equal(store.getState().coupleId, 'couple-a');
  store.setState({ userRole: 'partner' });
  assert.equal(await store.getState().revokePartner(), false);
  assert.equal(calls, 1);
});

test('a late revocation response cannot unlink a newly created pair', async () => {
  let resolve;
  const store = storeHarness(undefined, null, () => new Promise(done => { resolve = done; }));
  await store.persist.rehydrate();
  store.setState({ userRole: 'her', coupleId: 'couple-a' });
  const request = store.getState().revokePartner();
  store.getState().setCoupleId('couple-b');
  resolve(true);
  await request;
  assert.equal(store.getState().coupleId, 'couple-b');
});

test('revoked Partner is purged of biological data, consent, SOS and scheduled reminder preference', async () => {
  const store = storeHarness();
  await store.persist.rehydrate();
  store.setState({ userRole: 'partner', coupleId: 'couple-a', partnerConnected: true,
    lastPeriodStartDate: '2026-09-01', cycleLength: 31, periodLength: 7,
    loggedSymptomsToday: ['cramps'], activeSOS: { type: 'chocolate' }, shareCalendarWithPartner: true,
    calendarConsentVerified: true, partnerAccessVerified: true, empathyReminderEnabled: true });
  store.getState().unlinkCouple();
  assert.equal(store.getState().userRole, 'partner');
  assert.equal(store.getState().coupleId, null);
  assert.equal(store.getState().partnerAccessRevoked, true);
  assert.equal(store.getState().partnerAccessVerified, false);
  assert.equal(store.getState().empathyReminderEnabled, false);
  assert.equal(store.getState().activeSOS, null);
  assert.equal(store.getState().loggedSymptomsToday.length, 0);
  assert.equal(store.getState().shareCalendarWithPartner, false);
  assert.notEqual(store.getState().lastPeriodStartDate, '2026-09-01');
});

test('period override updates locally before the network and retries without accepting an old remote anchor', async () => {
  let resolve;
  let fail = true;
  const store = storeHarness(() => fail ? new Promise(done => { resolve = done; }) : Promise.resolve(true));
  await store.persist.rehydrate();
  store.setState({ userRole: 'her', coupleId: 'couple-a', lastPeriodStartDate: '2026-08-01' });
  const save = store.getState().setCycleData('2026-09-01', 31, 7);
  assert.equal(store.getState().lastPeriodStartDate, '2026-09-01');
  assert.equal(store.getState().pendingCycleSync, true);
  resolve(false);
  assert.equal(await save, false);
  store.getState().applyRemoteCouple({ id: 'couple-a', cycle_start_date: '2026-08-01', cycle_length: 28, period_length: 5 });
  assert.equal(store.getState().lastPeriodStartDate, '2026-09-01');
  assert.equal(store.getState().cycleLength, 31);
  fail = false;
  assert.equal(await store.getState().flushCycleSync(), true);
  assert.equal(store.getState().pendingCycleSync, false);
});

test('partner and malformed dates cannot override the biological engine', async () => {
  let writes = 0;
  const store = storeHarness(async () => { writes++; return true; });
  await store.persist.rehydrate();
  store.setState({ userRole: 'partner', coupleId: 'couple-a' });
  assert.equal(await store.getState().setCycleData('2026-09-01'), false);
  store.setState({ userRole: 'her' });
  assert.equal(await store.getState().setCycleData('2026-02-30'), false);
  assert.equal(writes, 0);
});

test('hydration cannot unlock premium or grant stale partner membership', async () => {
  const persisted = JSON.stringify({ state: { userRole: 'partner', isPremium: true, partnerAccessVerified: true }, version: 0 });
  const store = storeHarness(undefined, persisted);
  await store.persist.rehydrate();
  assert.equal(store.getState().isPremium, false);
  assert.equal(store.getState().partnerAccessVerified, false);
  const saved = store.persist.getOptions().partialize(store.getState());
  assert.equal('isPremium' in saved, false);
  assert.equal('partnerAccessVerified' in saved, false);
});

function purchasesHarness({ key = 'appl_test', expoGo = false, active = false, cancel = false, price = 23.99, currency = 'USD', subscriptionPeriod = 'P1Y' } = {}) {
  const premiumChanges = [];
  const calls = [];
  let listener;
  const info = () => ({ entitlements: { active: active ? { sway_premium: { isActive: true } } : {} } });
  const annual = { identifier: '$rc_annual', product: { priceString: '$23.99', price, currencyCode: currency, pricePerMonthString: '$2.00', subscriptionPeriod } };
  const sdk = {
    isConfigured: async () => false,
    configure: options => calls.push(options),
    addCustomerInfoUpdateListener: callback => { listener = callback; },
    getCustomerInfo: async () => info(),
    getOfferings: async () => ({ current: { annual, monthly: null } }),
    purchasePackage: async pkg => { calls.push(pkg); if (cancel) throw { userCancelled: true }; return { customerInfo: info() }; },
    restorePurchases: async () => info(),
  };
  const loadPurchases = loader({
    'expo-constants': { default: { executionEnvironment: expoGo ? 'storeClient' : 'standalone' }, __esModule: true, ExecutionEnvironment: { StoreClient: 'storeClient' } },
    'react-native': { Platform: { OS: 'ios' } },
    './revenuecatNative': { loadRealPurchases: async () => { calls.push('native'); return sdk; } },
    '../store/useCycleStore': { useCycleStore: { getState: () => ({ setPremium: premium => premiumChanges.push(premium) }) } },
  }, { process: { env: { EXPO_PUBLIC_REVENUECAT_API_KEY: key } } });
  return { ...loadPurchases('src/services/revenuecat.ts'), calls, premiumChanges,
    setActive: value => { active = value; }, expire: () => { active = false; listener(info()); } };
}

test('missing keys and Expo Go never load native purchases or simulate a premium unlock', async () => {
  for (const options of [{ key: undefined }, { expoGo: true }]) {
    // Explicit absence must bypass the default helper key.
    const harness = purchasesHarness(options.key === undefined && !options.expoGo ? { key: '' } : options);
    assert.equal(await harness.initializePurchases(), false);
    assert.ok(!harness.calls.includes('native'));
    await assert.rejects(harness.getOfferings());
    assert.equal(await harness.purchasePackage({ identifier: 'anything' }), 'unavailable');
    assert.ok(harness.premiumChanges.every(value => value === false));
  }
});

test('RevenueCat configures exactly once and offerings use real localized prices without mock fallbacks', async () => {
  const harness = purchasesHarness();
  await Promise.all([harness.initializePurchases(), harness.initializePurchases()]);
  assert.equal(harness.calls.filter(call => typeof call === 'object' && call.apiKey).length, 1);
  const offerings = await harness.getOfferings();
  assert.equal(offerings.annual.priceString, '$23.99');
  assert.equal(offerings.annual.perMonth, '$2.00');
  assert.equal(offerings.monthly, null);
  assert.equal(await harness.purchasePackage(offerings.annual), 'failed');
  assert.equal(harness.premiumChanges.at(-1), false);
});

test('only verified active entitlement unlocks; restore and listener expiry reconcile premium', async () => {
  const harness = purchasesHarness({ active: true });
  await harness.initializePurchases();
  assert.equal(harness.premiumChanges.at(-1), true);
  const offerings = await harness.getOfferings();
  assert.equal(await harness.purchasePackage(offerings.annual), 'purchased');
  assert.equal(await harness.restorePurchases(), true);
  harness.expire();
  assert.equal(harness.premiumChanges.at(-1), false);
});

test('user-cancelled purchases do not report a transaction failure or unlock premium', async () => {
  const harness = purchasesHarness({ cancel: true });
  const offerings = await harness.getOfferings();
  assert.equal(await harness.purchasePackage(offerings.annual), 'cancelled');
  assert.ok(harness.premiumChanges.every(value => value === false));
});

test('custom Lottie asset is a local looping vector animation, with no external image dependencies', () => {
  const asset = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/sway-loading.json'), 'utf8'));
  assert.equal(asset.fr, 60);
  assert.equal(asset.w, 240);
  assert.equal(asset.h, 240);
  assert.equal(asset.op - asset.ip, 120);
  assert.equal(asset.assets.length, 0);
  assert.equal(asset.layers.length, 4);
});

test('date-only keys preserve local dates and reject malformed or impossible dates', () => {
  assert.equal(dates.toDateKey(new Date(2026, 8, 30, 0, 5)), '2026-09-30');
  for (const input of ['2026-02-30', '2026-13-01', 'bad', '2026-9-1', '2026-09-01T00:00:00Z']) assert.equal(dates.parseDateKey(input), null);
  assert.equal(dates.toDateKey(dates.parseDateKey('2024-02-29')), '2024-02-29');
});

test('cycle inputs reject future dates, fractions, and out-of-range lengths', () => {
  assert.equal(dates.isValidCycleData('2025-01-01', 28, 5), true);
  for (const [start, cycle, period] of [['2999-01-01', 28, 5], ['bad', 28, 5], ['2025-01-01', 19, 5], ['2025-01-01', 46, 5], ['2025-01-01', 28.5, 5], ['2025-01-01', 28, 11]]) {
    assert.equal(dates.isValidCycleData(start, cycle, period), false);
  }
});

test('default phase boundaries and countdown agree with next period date', () => {
  for (const [day, phase] of [[1, 'menstrual'], [5, 'menstrual'], [6, 'follicular'], [12, 'follicular'], [13, 'ovulatory'], [16, 'ovulatory'], [17, 'luteal'], [28, 'luteal'], [29, 'menstrual']]) {
    assert.equal(engine.determineCyclePhase(day, 28, 5), phase);
  }
  assert.equal(engine.generateEmpathyBrief('2026-09-01', 28, 5, '2026-09-28').daysUntilNextPeriod, 1);
});

test('all supported cycle and period lengths have four nonempty phases that sum to the cycle', () => {
  for (let cycle = 20; cycle <= 45; cycle++) {
    for (let period = 1; period <= 10; period++) {
      const lengths = engine.getPhaseLengths(cycle, period);
      assert.equal(Object.values(lengths).reduce((sum, n) => sum + n, 0), cycle);
      assert.ok(Object.values(lengths).every(n => n > 0));
      for (let day = 1; day <= cycle; day++) assert.equal(engine.determineCyclePhase(day, cycle, period), engine.determineCyclePhase(day + cycle, cycle, period));
    }
  }
  assert.equal(engine.determineCyclePhase(20, 35, 5), 'ovulatory');
});

test('predictions wrap dates before the anchor instead of marking them all menstrual', () => {
  const predictions = predictMonth('2026-09-01', '2026-09-15', 28, 5);
  assert.equal(predictions['2026-09-14'].cycleDay, 28);
  assert.equal(predictions['2026-09-14'].phase, 'luteal');
  assert.equal(predictions['2026-09-15'].cycleDay, 1);
  assert.equal(predictions['2026-09-01'].phase, 'ovulatory');
});

test('leap months and adjacent month cells are covered with the same dashboard predictions', () => {
  const predictions = predictMonth('2024-02-01', '2024-01-25', 31, 7);
  assert.ok(predictions['2024-02-29']);
  assert.ok(predictions['2024-01-26']);
  assert.ok(predictions['2024-03-06']);
  for (const [date, prediction] of Object.entries(predictions)) {
    const brief = engine.generateEmpathyBrief('2024-01-25', 31, 7, date);
    assert.equal(prediction.phase, brief.phase);
    assert.equal(prediction.cycleDay, brief.cycleDay);
  }
});

test('invalid persisted lengths cannot create NaN dashboard metrics', () => {
  const brief = engine.generateEmpathyBrief('bad', 0, -1);
  assert.ok(Number.isFinite(brief.cycleDay));
  assert.ok(Number.isFinite(brief.energyLevel));
  assert.ok(Number.isFinite(brief.daysUntilNextPeriod));
  assert.equal(Object.keys(predictMonth('bad', 'bad', 28, 5)).length, 0);
});

test('calendar-day arithmetic remains stable across daylight saving transitions', () => {
  assert.equal(engine.calculateCycleDay('2026-03-07', '2026-03-09'), 3);
  assert.equal(engine.calculateCycleDay('2026-10-31', '2026-11-02'), 3);
});

function storeHarness(push = async () => true, persisted = null, revoke = async () => true, leave = async () => true) {
  const storage = { getItem: async () => persisted, setItem: async () => {}, removeItem: async () => {} };
  const loadStore = loader({ '@react-native-async-storage/async-storage': storage, '../services/coupleSync': { pushCoupleUpdate: push },
    '../services/coupleAccess': { revokePartnerAccess: revoke, leaveCouple: leave, acknowledgeSOS: async () => {} },
    '../services/supabase': { isSupabaseConfigured: true } });
  return loadStore('src/store/useCycleStore.ts').useCycleStore;
}

test('calendar consent defaults private and only Her can change it', async () => {
  let pushes = 0;
  const store = storeHarness(async () => { pushes++; return true; });
  await store.persist.rehydrate();
  assert.equal(store.getState().shareCalendarWithPartner, false);
  store.getState().setUserRole('partner');
  assert.equal(await store.getState().setShareCalendarWithPartner(true), false);
  assert.equal(pushes, 0);
  store.getState().setUserRole('her');
  assert.equal(await store.getState().setShareCalendarWithPartner(true), true);
  assert.equal(store.getState().shareCalendarWithPartner, true);
});

test('failed consent revocation reports failure and preserves acknowledged server state', async () => {
  const store = storeHarness(async () => false);
  await store.persist.rehydrate();
  store.setState({ userRole: 'her', coupleId: 'couple-a', shareCalendarWithPartner: true });
  assert.equal(await store.getState().setShareCalendarWithPartner(false), false);
  assert.equal(store.getState().shareCalendarWithPartner, true);
});

test('remote consent is applied without echoing writes and stale couple events are ignored', async () => {
  let pushes = 0;
  const store = storeHarness(async () => { pushes++; return true; });
  await store.persist.rehydrate();
  store.setState({ userRole: 'partner', coupleId: 'couple-a' });
  store.getState().applyRemoteCouple({ id: 'couple-a', partner_uuid: 'partner', share_calendar_with_partner: true });
  assert.equal(store.getState().shareCalendarWithPartner, true);
  assert.equal(store.getState().calendarConsentVerified, true);
  store.getState().applyRemoteCouple({ id: 'couple-b', share_calendar_with_partner: false });
  assert.equal(store.getState().shareCalendarWithPartner, true);
  store.getState().applyRemoteCouple({ id: 'couple-a', share_calendar_with_partner: false });
  assert.equal(store.getState().shareCalendarWithPartner, false);
  assert.equal(pushes, 0);
  store.getState().setCoupleId('couple-b');
  assert.equal(store.getState().calendarConsentVerified, false);
  assert.equal(store.getState().shareCalendarWithPartner, false);
});

test('hydration cannot trust a previously verified calendar consent', async () => {
  const persisted = JSON.stringify({ state: { userRole: 'partner', shareCalendarWithPartner: true, calendarConsentVerified: true, cycleLength: 0, lastPeriodStartDate: 'bad' }, version: 0 });
  const store = storeHarness(undefined, persisted);
  await store.persist.rehydrate();
  assert.equal(store.getState().calendarConsentVerified, false);
  assert.equal(store.getState().cycleLength, 28);
  assert.ok(dates.parseDateKey(store.getState().lastPeriodStartDate));
  assert.equal('calendarConsentVerified' in store.persist.getOptions().partialize(store.getState()), false);
});

function notificationHarness({ granted = true, canAskAgain = true, platform = 'android' } = {}) {
  const calls = [];
  const notifications = {
    setNotificationHandler() {},
    AndroidImportance: { DEFAULT: 3 }, AndroidNotificationVisibility: { PRIVATE: 0 },
    IosAuthorizationStatus: { PROVISIONAL: 3, EPHEMERAL: 4 }, SchedulableTriggerInputTypes: { DAILY: 'daily' },
    setNotificationChannelAsync: async () => { calls.push('channel'); },
    getPermissionsAsync: async () => { calls.push('permissions'); return { granted, canAskAgain }; },
    requestPermissionsAsync: async () => { calls.push('request'); return { granted: true }; },
    scheduleNotificationAsync: async request => { calls.push(JSON.parse(JSON.stringify(request))); return request.identifier; },
    cancelScheduledNotificationAsync: async id => { calls.push({ cancel: id }); },
  };
  const loadNotifications = loader({ 'react-native': { Platform: { OS: platform } }, 'expo-notifications': notifications });
  return { ...loadNotifications('src/services/empathyNotifications.ts'), calls };
}

test('daily reminders create the Android channel before permissions and reuse one identifier', async () => {
  const service = notificationHarness();
  await service.configureEmpathyReminder(true, 8, 15);
  await service.configureEmpathyReminder(true, 21, 30);
  assert.deepEqual(service.calls.slice(0, 2), ['channel', 'permissions']);
  const requests = service.calls.filter(call => typeof call === 'object' && call.trigger);
  assert.equal(requests[0].identifier, requests[1].identifier);
  assert.deepEqual(requests[1].trigger, { type: 'daily', hour: 21, minute: 30, channelId: 'empathy-reminders' });
  assert.equal(requests[1].content.data.kind, 'empathy-reminder');
  assert.ok(!/luteal|menstrual|ovulatory|follicular/i.test(requests[1].content.body));
});

test('startup reconciliation never prompts and clears reminders when permission is denied', async () => {
  const service = notificationHarness({ granted: false });
  assert.equal(await service.configureEmpathyReminder(true, 9, 0), false);
  assert.ok(!service.calls.includes('request'));
  assert.equal(service.calls.at(-1).cancel, service.EMPATHY_REMINDER_ID);
});

test('explicit opt-in can request permission; disabling cancels only the Sway reminder', async () => {
  const service = notificationHarness({ granted: false });
  assert.equal(await service.configureEmpathyReminder(true, 9, 0, true), true);
  assert.ok(service.calls.includes('request'));
  await service.configureEmpathyReminder(false, 9, 0);
  assert.deepEqual(service.calls.at(-1), { cancel: service.EMPATHY_REMINDER_ID });
});

test('permanently denied permission does not prompt again; web never calls native APIs', async () => {
  const denied = notificationHarness({ granted: false, canAskAgain: false });
  assert.equal(await denied.configureEmpathyReminder(true, 9, 0, true), false);
  assert.ok(!denied.calls.includes('request'));
  const web = notificationHarness({ platform: 'web' });
  assert.equal(await web.configureEmpathyReminder(true, 9, 0), false);
  assert.equal(await web.configureEmpathyReminder(false, 9, 0), true);
  assert.equal(web.calls.length, 0);
});

test('serialized reminder changes leave cancellation as the last operation', async () => {
  const service = notificationHarness();
  await Promise.all([service.configureEmpathyReminder(true, 9, 0), service.configureEmpathyReminder(true, 10, 0), service.configureEmpathyReminder(false, 10, 0)]);
  assert.deepEqual(service.calls.at(-1), { cancel: service.EMPATHY_REMINDER_ID });
  await assert.rejects(service.configureEmpathyReminder(true, 25, 0), /valid reminder time/);
});

test('ring marker stays circular, on-track and inside the viewport for every valid cycle', () => {
  const { cycleRingGeometry } = load('src/utils/cycleRingGeometry.ts');
  for (let length = 20; length <= 45; length++) for (let day = 1; day <= length; day++) {
    const g = cycleRingGeometry(day, length);
    assert.ok(Math.abs(Math.hypot(g.cx - g.center, g.cy - g.center) - g.radius) < 1e-10);
    const outer = g.markerRadius + g.markerStroke / 2;
    assert.ok(g.cx - outer >= 0 && g.cy - outer >= 0 && g.cx + outer <= g.size && g.cy + outer <= g.size);
    assert.ok(g.strokeWidth <= g.size / 10);
    assert.deepEqual(cycleRingGeometry(day + length, length), g);
  }
  const top = cycleRingGeometry(1, 28);
  const right = cycleRingGeometry(8, 28);
  const bottom = cycleRingGeometry(15, 28);
  const left = cycleRingGeometry(22, 28);
  assert.equal(top.cx, top.center);
  assert.ok(Math.abs(right.cy - right.center) < 1e-10);
  assert.equal(bottom.cy, bottom.center + bottom.radius);
  assert.ok(Math.abs(left.cx - (left.center - left.radius)) < 1e-10);
  for (const g of [cycleRingGeometry(NaN, 0), cycleRingGeometry(-3, 28, 80, 1000), cycleRingGeometry(3, NaN, NaN, NaN)]) {
    assert.ok(Object.values(g).every(Number.isFinite));
  }
});

test('symptom data forms exactly three rows of three and preserves existing IDs', () => {
  const { DAILY_SYMPTOMS, SYMPTOM_ROWS } = load('src/utils/symptoms.ts');
  assert.equal(DAILY_SYMPTOMS.length, 9);
  assert.equal(new Set(DAILY_SYMPTOMS.map(s => s.id)).size, 9);
  assert.equal(SYMPTOM_ROWS.length, 3);
  assert.ok(SYMPTOM_ROWS.every(row => row.length === 3));
  for (const id of ['cramps', 'fatigue', 'bloating', 'brainfog', 'glowing']) assert.ok(DAILY_SYMPTOMS.some(s => s.id === id));
});

test('Her do/dont guidance comes from each predicted phase and differs from partner tips', () => {
  for (const day of [1, 8, 14, 25]) {
    const target = new Date(2026, 8, day);
    const her = engine.generateEmpathyBrief('2026-09-01', 28, 5, target, 'her');
    const partner = engine.generateEmpathyBrief('2026-09-01', 28, 5, target);
    assert.equal(her.phase, partner.phase);
    assert.equal(her.doList.length, 3);
    assert.equal(her.dontList.length, 3);
    assert.ok(her.dontList.every(item => item.startsWith('Don’t ')));
    assert.notDeepEqual(her.doList, partner.doList);
    assert.ok(!her.doList.some(item => /bring it to her|compliment her|her plate/.test(item)));
  }
});

test('advertised subscription prices are fixed and reject wrong currency, amount and interval', async () => {
  const pricing = load('src/utils/subscriptionPricing.ts');
  assert.equal(pricing.PASS_PRICING.monthly.price, 2.99);
  assert.equal(pricing.PASS_PRICING.annual.price, 23.99);
  assert.equal(pricing.ANNUAL_SAVINGS_PERCENT, 33);
  for (const options of [{ price: 45 }, { currency: 'EUR' }, { subscriptionPeriod: 'P1M' }]) {
    const harness = purchasesHarness(options);
    const offerings = await harness.getOfferings();
    assert.equal(await harness.purchasePackage(offerings.annual), 'price_mismatch');
    assert.ok(!harness.calls.some(call => call?.product));
  }
});

test('a tampered native package cannot override the current RevenueCat product', async () => {
  const harness = purchasesHarness({ active: true });
  const offerings = await harness.getOfferings();
  const realProduct = offerings.annual.nativePackage;
  const tampered = { ...offerings.annual, nativePackage: { product: { price: 99 } } };
  assert.equal(await harness.purchasePackage(tampered), 'purchased');
  assert.equal(harness.calls.at(-1), realProduct);
});

test('partner self-unlink waits for confirmation and preserves membership on failure', async () => {
  let resolve;
  const store = storeHarness(undefined, null, undefined, () => new Promise(done => { resolve = done; }));
  await store.persist.rehydrate();
  store.setState({ userRole: 'partner', coupleId: 'couple-a', partnerConnected: true, loggedSymptomsToday: ['bloating'], empathyReminderEnabled: true });
  const request = store.getState().leavePartner();
  assert.equal(store.getState().partnerConnected, true);
  resolve(false);
  assert.equal(await request, false);
  assert.equal(store.getState().coupleId, 'couple-a');
  const confirmed = store.getState().leavePartner();
  resolve(true);
  assert.equal(await confirmed, true);
  assert.equal(store.getState().coupleId, null);
  assert.equal(store.getState().loggedSymptomsToday.length, 0);
  assert.equal(store.getState().empathyReminderEnabled, false);
  store.setState({ userRole: 'her', coupleId: 'couple-a' });
  assert.equal(await store.getState().leavePartner(), false);
});

test('Her reminders persist independently and validate native clock values', async () => {
  const store = storeHarness();
  await store.persist.rehydrate();
  assert.equal(store.getState().cycleReminderEnabled, false);
  store.getState().setUserRole('her');
  store.getState().setCycleReminder(true, 20, 15);
  assert.equal(store.getState().cycleReminderHour, 20);
  assert.equal(store.getState().cycleReminderMinute, 15);
  assert.equal(store.getState().empathyReminderEnabled, false);
  store.getState().setCycleReminder(true, 25, 80);
  assert.equal(store.getState().cycleReminderMinute, 15);
  const saved = store.persist.getOptions().partialize(store.getState());
  const restored = storeHarness(undefined, JSON.stringify({ state: saved, version: 0 }));
  await restored.persist.rehydrate();
  assert.equal(restored.getState().cycleReminderEnabled, true);
  assert.equal(restored.getState().cycleReminderHour, 20);
});

test('Her notifications schedule, reschedule and cancel their own stable identifier', async () => {
  const service = notificationHarness({ granted: false });
  assert.equal(await service.configureCycleReminder(true, 20, 0, true), true);
  assert.ok(service.calls.includes('request'));
  const request = service.calls.find(call => call?.trigger);
  assert.equal(request.identifier, service.CYCLE_REMINDER_ID);
  assert.equal(request.content.data.kind, 'cycle-reminder');
  assert.ok(/Log your symptoms today/.test(request.content.body));
  assert.ok(!/luteal|menstrual|ovulatory|follicular/.test(request.content.body));
  assert.deepEqual(request.trigger, { type: 'daily', hour: 20, minute: 0, channelId: 'cycle-reminders' });
  await service.configureCycleReminder(false, 20, 0);
  assert.deepEqual(service.calls.at(-1), { cancel: service.CYCLE_REMINDER_ID });
  const denied = notificationHarness({ granted: false, canAskAgain: false });
  assert.equal(await denied.configureCycleReminder(true, 20, 0, true), false);
  assert.ok(!denied.calls.includes('request'));
});

// Structural UI checks exercise the real TSX with native adapters mocked. They
// validate layout ownership, copy and access gating, not native pixels or FPS.
function uiHarness(state = {}) {
  const React = require('react');
  const colors = new Proxy({}, { get: () => '#123456' });
  const useStore = selector => selector ? selector(state) : state;
  useStore.getState = () => state;
  useStore.subscribe = () => () => {};
  const navigated = [];
  const mocks = {
    react: { ...React, useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}], useEffect() {}, useRef: value => ({ current: value }), useMemo: fn => fn(), useCallback: fn => fn },
    'react-native': { View: 'View', Text: 'Text', ScrollView: 'ScrollView', Pressable: 'Pressable', TextInput: 'TextInput', Switch: 'Switch', ActivityIndicator: 'ActivityIndicator', Platform: { OS: 'ios' }, StyleSheet: { create: s => s, absoluteFill: { position: 'absolute' } } },
    'lucide-react-native': new Proxy({}, { get: (_, key) => key }),
    '@react-navigation/native': { useNavigation: () => ({ navigate: (...args) => navigated.push(args) }) },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-blur': { BlurView: 'BlurView', BlurTargetView: 'BlurTargetView' },
    'expo-haptics': {},
    '../components': Object.fromEntries(['Screen', 'Card', 'Header', 'SOSModal', 'PaywallTriggerBanner', 'CycleRing'].map(key => [key, key])),
    '../theme': { useThemeStyles: factory => ({ colors, styles: factory(colors) }), useTheme: () => ({ colors }), typography: new Proxy({}, { get: () => ({ fontSize: 12, lineHeight: 18 }) }), spacing: {}, radius: {}, elevation: {} },
    'react-native-calendars': { Calendar: 'Calendar' },
    '../store/useCycleStore': { useCycleStore: useStore },
    '../hooks/useToday': { useToday: () => '2026-09-01' },
    '../services/revenuecat': { getOfferings: async () => ({}), purchasePackage() {}, restorePurchases() {} },
    '../services/supabase': { isSupabaseConfigured: false },
    '../services/empathyNotifications': {},
    '../services/pairing': {},
    '../components/PressableScale': { PressableScale: 'PressableScale' },
    './PressableScale': { PressableScale: 'PressableScale' },
    '../components/SwayLogo': { SwayLogo: 'SwayLogo' },
    './SwayLogo': { SwayLogo: 'SwayLogo' },
    'react-native-svg': { __esModule: true, default: 'Svg', Circle: 'Circle', G: 'G' },
    '../components/NativeDateTimeField': { NativeDateTimeField: 'NativeDateTimeField' },
    '../components/CycleEditButton': { CycleEditButton: 'CycleEditButton' },
    '../components/HerDailyInsights': { HerDailyInsights: 'HerDailyInsights' },
    '../components/DisconnectPartnerButton': { DisconnectPartnerButton: 'DisconnectPartnerButton' },
  };
  const loadUI = loader(mocks, { process: { env: {} } });
  return { render: (file, name, props) => loadUI(file)[name](props), navigated };
}
function descendants(node) {
  if (Array.isArray(node)) return node.flatMap(descendants);
  if (!node || typeof node !== 'object') return [];
  return [node, ...descendants(node.props?.children)];
}
function textContent(node) {
  if (Array.isArray(node)) return node.map(textContent).join('');
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return node?.props ? textContent(node.props.children) : '';
}

test('paywall scroll owns benefits and both price cards; safe-area footer is its sibling', () => {
  const ui = uiHarness({ isPremium: false });
  const tree = ui.render('src/screens/PaywallScreen.tsx', 'PaywallScreen');
  const children = tree.props.children;
  const scroll = children.find(child => child?.type === 'ScrollView');
  const footer = children.find(child => child?.type === 'SafeAreaView');
  assert.equal(scroll.props.style.flex, 1);
  assert.ok(/Premium benefits/.test(textContent(scroll)));
  assert.ok(/Monthly/.test(textContent(scroll)) && /Annual/.test(textContent(scroll)));
  assert.ok(/\$2\.99/.test(textContent(scroll)) && /\$23\.99/.test(textContent(scroll)));
  assert.ok(!textContent(scroll).includes('Continue with Couple’s Pass'));
  assert.ok(textContent(footer).includes('Continue with Couple’s Pass'));
  assert.deepEqual([...footer.props.edges], ['bottom']);
  assert.equal(footer.props.style.flexShrink, 0);
});

test('hormone card immediately follows the ring; nine equally weighted symptom cells have accessible checked states', () => {
  const ui = uiHarness({ userRole: 'her', lastPeriodStartDate: '2026-09-01', cycleLength: 28, periodLength: 5, loggedSymptomsToday: ['bloating'] });
  const tree = ui.render('src/screens/HerDashboard.tsx', 'HerDashboard');
  const scroll = descendants(tree).find(node => node.type === 'ScrollView');
  assert.ok(textContent(scroll.props.children[0]).includes('Today’s rhythm'));
  assert.ok(textContent(scroll.props.children[1]).includes('Today’s hormone insights'));
  const cells = descendants(scroll).filter(node => node.props?.accessibilityRole === 'checkbox');
  assert.equal(cells.length, 9);
  assert.equal(cells.filter(node => node.props.accessibilityState.checked).length, 1);
  assert.ok(cells.every(node => node.props.style({ pressed: false })[0].flex === 1));
  assert.ok(!descendants(tree).some(node => typeof node.type === 'string' && node.type.includes('Animated')));
});

test('paired partner Settings expose disconnect only, while unlinked Settings expose pair-code entry', () => {
  for (const connected of [true, false]) {
    const ui = uiHarness({ userRole: 'partner', partnerConnected: connected, lastPeriodStartDate: '2026-09-01', cycleLength: 28, periodLength: 5 });
    const tree = ui.render('src/screens/SettingsScreen.tsx', 'SettingsScreen');
    const disconnect = descendants(tree).filter(node => node.type === 'DisconnectPartnerButton');
    assert.equal(disconnect.length, connected ? 1 : 0);
    assert.equal(textContent(tree).includes('Enter pair code'), !connected);
  }
});

test('free Her insights never render premium text underneath blur; paid users receive both dynamic lists', () => {
  const brief = { doList: ['PRIVATE_DO_SENTINEL'], dontList: ['PRIVATE_DONT_SENTINEL'] };
  const free = uiHarness({ isPremium: false }).render('src/components/HerDailyInsights.tsx', 'HerDailyInsights', { brief });
  assert.ok(!textContent(free).includes('PRIVATE_'));
  assert.ok(textContent(free).includes('Unlock Insights'));
  assert.equal(descendants(free).filter(node => node.type === 'BlurView').length, 1);
  const paid = uiHarness({ isPremium: true }).render('src/components/HerDailyInsights.tsx', 'HerDailyInsights', { brief });
  assert.ok(textContent(paid).includes('PRIVATE_DO_SENTINEL'));
  assert.ok(textContent(paid).includes('PRIVATE_DONT_SENTINEL'));
  assert.equal(descendants(paid).filter(node => node.type === 'BlurView').length, 0);
});

test('Her settings include an independent daily native time picker', () => {
  const ui = uiHarness({ userRole: 'her', lastPeriodStartDate: '2026-09-01', cycleLength: 28, periodLength: 5,
    cycleReminderEnabled: true, cycleReminderHour: 20, cycleReminderMinute: 15 });
  const tree = ui.render('src/screens/SettingsScreen.tsx', 'SettingsScreen');
  const picker = descendants(tree).find(node => node.type === 'NativeDateTimeField' && node.props.label === 'Cycle reminder time');
  assert.equal(picker.props.mode, 'time');
  assert.equal(picker.props.value.getHours(), 20);
  assert.equal(picker.props.value.getMinutes(), 15);
  assert.ok(textContent(tree).includes('DAILY CYCLE CHECK-IN'));
});

test('shared partner calendar refers to her phase rather than your cycle details', () => {
  const ui = uiHarness({ userRole: 'partner', lastPeriodStartDate: '2026-09-01', cycleLength: 28, periodLength: 5 });
  const tree = ui.render('src/components/CycleCalendar.tsx', 'CycleCalendar');
  assert.ok(textContent(tree).includes('She is estimated to be in her menstrual phase.'));
  assert.ok(textContent(tree).includes('Her cycle day'));
  assert.ok(!textContent(tree).includes('your latest cycle details'));
});

test('reminder taps route Her to logging and wait for verified partner access before opening a brief', () => {
  const state = { userRole: 'partner', coupleId: 'couple-a', partnerAccessVerified: false };
  const navigated = [];
  let cleared = 0;
  const hook = loader({
    react: {}, 'react-native': { Platform: { OS: 'ios' } },
    'expo-notifications': { clearLastNotificationResponse: () => cleared++ },
    '../store/useCycleStore': { useCycleStore: { getState: () => state } },
    '../services/empathyNotifications': {},
    '../navigation/navigationRef': { navigationRef: { isReady: () => true, navigate: (...args) => navigated.push(args) } },
  })('src/hooks/useEmpathyNotifications.ts');
  const response = kind => ({ notification: { request: { content: { data: { kind } } } } });
  hook.openEmpathyBrief(response('empathy-reminder'));
  assert.equal(navigated.length, 0);
  assert.equal(cleared, 0);
  state.partnerAccessVerified = true;
  hook.openEmpathyBrief(response('empathy-reminder'));
  assert.equal(navigated[0][1].screen, 'Brief');
  state.userRole = 'her';
  hook.openEmpathyBrief(response('cycle-reminder'));
  assert.equal(navigated[1][1].screen, 'Tracker');
  state.userRole = 'partner';
  state.coupleId = null;
  hook.openEmpathyBrief(response('empathy-reminder'));
  assert.equal(navigated.length, 2);
});

test('shared header wordmark has no trailing connection dot; status indicator lives beside connection copy', () => {
  const tree = uiHarness().render('src/components/Header.tsx', 'Header', { partnerConnected: true });
  const left = tree.props.children[0];
  assert.equal(textContent(left), 'Sway');
  assert.equal(left.props.children.length, 2);
  assert.equal(left.props.children[0].type, 'SwayLogo');
  assert.ok(textContent(tree.props.children[1]).includes('Connected'));
});

test('SVG ring uses a square viewBox and uniform aspect ratio with marker outside the rotated group', () => {
  const tree = uiHarness().render('src/components/CycleRing.tsx', 'CycleRing', { currentDay: 1, cycleLength: 28, periodLength: 5, phaseTitle: 'Menstrual / Inner Winter' });
  const svg = descendants(tree).find(node => node.type === 'Svg');
  assert.equal(svg.props.viewBox, '0 0 220 220');
  assert.equal(svg.props.preserveAspectRatio, 'xMidYMid meet');
  const marker = svg.props.children[1];
  assert.equal(marker.type, 'Circle');
  assert.equal(marker.props.cx, 110);
  assert.equal(marker.props.cy, 13);
  assert.equal(marker.props.r, 10);
  assert.equal(marker.props.strokeWidth, 2);
});

test('bounded month predictions stay inexpensive for repeated navigation (host CPU, not device FPS)', () => {
  const started = performance.now();
  let days = 0;
  for (let index = 0; index < 1000; index++) {
    const month = dates.toDateKey(new Date(2026, index % 12, 1));
    const predictions = predictMonth(month, '2026-09-01', 28, 5);
    const count = Object.keys(predictions).length;
    assert.ok(count >= 42 && count <= 45);
    days += count;
  }
  console.log(`Prediction benchmark: ${days} calendar cells in ${(performance.now() - started).toFixed(1)}ms on host CPU.`);
});
