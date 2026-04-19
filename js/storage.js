/**
 * storage.js — 保存・読込モジュール v4.0
 *
 * 保存の優先順位:
 *  1. LocalStorage（即時・同期）← 常に実行
 *  2. Firebase Auth SDK（推奨）← FirebaseAuth が初期化済みの場合
 *  3. Firebase REST / GAS（フォールバック）← SDK未使用時
 *
 * debounce 自動同期:
 *  - save() を呼ぶたびにローカルは即保存
 *  - クラウドは 2 秒後にまとめて送信（連続操作でも1回に間引き）
 *  - 失敗時は最大3回リトライ（5s/15s/30s）
 *
 * 依存: firebase_auth.js (任意 — なくても動く)
 */
const Storage = (() => {
  const KEY        = 'magic_garden_v2';
  const CONFIG_KEY = 'magic_garden_gas_config';
  const DEFAULT_ENDPOINT = 'https://script.google.com/macros/s/AKfycbx9gWYwh1lbqpSlNJBFm5dvtPejACyAScbA-dO8TWPYtQ_AxFj4KtYNnLnVVG778jxk/exec';
  const URL_SAFE_BYTES = 6500;
  const DEBOUNCE_MS    = 2000;   // クラウド同期の間引き時間

  // ─── 同期ステータス ─────────────────────────────────────────────────────
  let _syncStatus    = 'idle';
  let _syncCallbacks = [];
  let _retryQueue    = null;
  let _retryCount    = 0;
  let _retryTimer    = null;
  let _debounceTimer = null;    // debounce 用タイマー
  const MAX_RETRY    = 3;
  const RETRY_DELAYS = [5000, 15000, 30000];

  function _setSyncStatus(s) {
    if (_syncStatus === s) return;
    _syncStatus = s;
    _syncCallbacks.forEach(fn => { try { fn(s); } catch(_){} });
  }

  function onSyncStatusChange(fn) { _syncCallbacks.push(fn); fn(_syncStatus); }
  function getSyncStatus() { return _syncStatus; }

  // ─── GAS/REST 設定 ────────────────────────────────────────────────────

  function getConfig() {
    try {
      const raw   = localStorage.getItem(CONFIG_KEY);
      const saved = raw ? JSON.parse(raw) : {};
      return {
        type:     saved.type     || 'firebase',
        endpoint: saved.endpoint || DEFAULT_ENDPOINT,
        playerId: saved.playerId || ''
      };
    } catch (_) { return { type: 'firebase', endpoint: DEFAULT_ENDPOINT, playerId: '' }; }
  }

  function setConfig(endpoint, playerId, type) {
    const cfg = getConfig();
    localStorage.setItem(CONFIG_KEY, JSON.stringify({
      type:     type     || cfg.type || 'firebase',
      endpoint: endpoint || cfg.endpoint,
      playerId: playerId || cfg.playerId
    }));
  }

  function isConfigured() {
    // Firebase Auth が使える場合は常に「設定済み」
    if (typeof FirebaseAuth !== 'undefined' && FirebaseAuth.isReady()) return true;
    const c = getConfig();
    return !!(c.endpoint && c.playerId);
  }

  // ─── ローカル保存（即時・二重保存） ──────────────────────────────────────

  function saveLocal(state) {
    try {
      const payload = JSON.stringify(state);
      localStorage.setItem(KEY, payload);
      localStorage.setItem(KEY + '_backup', payload);
      return true;
    } catch(e) {
      console.error('[Storage] Local save failed:', e);
      return false;
    }
  }

  function loadLocal() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return migrate(JSON.parse(raw));
    } catch(e) {
      // バックアップから復旧
      try {
        const bk = localStorage.getItem(KEY + '_backup');
        if (bk) return migrate(JSON.parse(bk));
      } catch(_) {}
      return null;
    }
  }

  // ─── クラウド保存（debounce + リトライ） ─────────────────────────────────

  async function _doSaveCloud(state) {
    _setSyncStatus('syncing');

    // ① Firebase Auth SDK 経由（推奨）
    if (typeof FirebaseAuth !== 'undefined' && FirebaseAuth.isReady()) {
      try {
        await FirebaseAuth.saveData(state);
        _retryQueue = null;
        _retryCount = 0;
        _setSyncStatus('ok');
        return;
      } catch(e) {
        console.warn('[Storage] Firebase SDK save failed:', e.message);
        // Firebase が失敗した場合はリトライキューへ
      }
    } else {
      // ② REST API フォールバック（Firebase REST or GAS）
      const { endpoint, playerId, type } = getConfig();
      if (endpoint && playerId) {
        const ok = await _trySaveRest(type, endpoint, playerId, state);
        if (ok) {
          _retryQueue = null;
          _retryCount = 0;
          _setSyncStatus('ok');
          return;
        }
      } else {
        _setSyncStatus('idle');
        return;
      }
    }

    // 失敗 → リトライキュー
    _retryQueue = state;
    _retryCount = 0;
    _setSyncStatus('retry');
    _scheduleRetry();
  }

  function _scheduleRetry() {
    if (_retryTimer) clearTimeout(_retryTimer);
    if (_retryCount >= MAX_RETRY || !_retryQueue) {
      if (_retryCount >= MAX_RETRY) { _setSyncStatus('error'); }
      return;
    }
    const delay = RETRY_DELAYS[_retryCount] || 30000;
    _retryTimer = setTimeout(async () => {
      if (!_retryQueue) return;
      _retryCount++;
      await _doSaveCloud(_retryQueue);
    }, delay);
  }

  // ─── REST API (Firebase REST / GAS) ──────────────────────────────────────

  async function _trySaveRest(type, endpoint, playerId, state) {
    try {
      if (type === 'firebase') return await _saveFirebaseRest(endpoint, playerId, state);
      else                     return await _saveGasRest(endpoint, playerId, state);
    } catch(e) {
      console.warn('[Storage] REST save failed:', e.message);
      return false;
    }
  }

  async function _saveFirebaseRest(endpoint, playerId, state) {
    const url = `${endpoint.replace(/\/$/, '')}/players/${encodeURIComponent(playerId)}.json`;
    const res = await fetch(url, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state), signal: AbortSignal.timeout(10000)
    });
    return res.ok;
  }

  async function _saveGasRest(endpoint, playerId, state) {
    const jsonStr = JSON.stringify(state);
    const encoded = encodeURIComponent(jsonStr);
    if (encoded.length <= URL_SAFE_BYTES) {
      const url = `${endpoint}?action=save&playerId=${encodeURIComponent(playerId)}&data=${encoded}`;
      const res  = await fetch(url, { signal: AbortSignal.timeout(12000) });
      const json = await res.json();
      return json.ok === true;
    }
    // チャンク分割
    const SIZE = 4000;
    const chunks = Math.ceil(jsonStr.length / SIZE);
    for (let i = 0; i < chunks; i++) {
      const url = `${endpoint}?action=saveChunk&playerId=${encodeURIComponent(playerId)}&chunk=${i}&total=${chunks}&data=${encodeURIComponent(jsonStr.slice(i*SIZE,(i+1)*SIZE))}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!(await res.json()).ok) return false;
      if (i < chunks - 1) await _sleep(200);
    }
    return true;
  }

  // ─── クラウド読込 ─────────────────────────────────────────────────────────

  async function loadCloud() {
    // Firebase Auth SDK 経由
    if (typeof FirebaseAuth !== 'undefined' && FirebaseAuth.isReady()) {
      try {
        const data = await FirebaseAuth.loadData();
        return data ? migrate(data) : null;
      } catch(e) {
        console.warn('[Storage] Firebase SDK load failed:', e.message);
      }
    }
    // REST フォールバック
    const { endpoint, playerId, type } = getConfig();
    if (!endpoint || !playerId) return null;
    try {
      if (type === 'firebase') {
        const url = `${endpoint.replace(/\/$/, '')}/players/${encodeURIComponent(playerId)}.json`;
        const res  = await fetch(url, { signal: AbortSignal.timeout(10000) });
        const data = await res.json();
        return data ? migrate(data) : null;
      } else {
        const res  = await fetch(`${endpoint}?action=load&playerId=${encodeURIComponent(playerId)}`, { signal: AbortSignal.timeout(12000) });
        const json = await res.json();
        return json.ok && json.data ? migrate(json.data) : null;
      }
    } catch(e) {
      console.warn('[Storage] REST load failed:', e.message);
      return null;
    }
  }

  // ─── 疎通テスト ───────────────────────────────────────────────────────────

  async function ping(endpoint, type) {
    if (typeof FirebaseAuth !== 'undefined' && FirebaseAuth.isReady()) {
      return await FirebaseAuth.ping();
    }
    const t = type || getConfig().type;
    try {
      if (t === 'firebase') {
        const res = await fetch(`${endpoint.replace(/\/$/, '')}/.json`, { signal: AbortSignal.timeout(8000) });
        return res.ok;
      } else {
        const res  = await fetch(`${endpoint}?action=ping`, { signal: AbortSignal.timeout(8000) });
        const json = await res.json();
        return json.ok === true;
      }
    } catch(_) { return false; }
  }

  // ─── 公開 API ─────────────────────────────────────────────────────────────

  /**
   * セーブ:
   *  - ローカル保存: 即時
   *  - クラウド同期: 2秒後（debounce — 連続保存を1回にまとめる）
   */
  function save(state) {
    const ok = saveLocal(state);

    // debounce: 2秒以内の連続 save() はまとめて1回のクラウド同期に
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(() => {
      _doSaveCloud(state);
      _debounceTimer = null;
    }, DEBOUNCE_MS);

    return ok;
  }

  function load() { return loadLocal(); }

  async function pullFromCloud() {
    const data = await loadCloud();
    if (data) { saveLocal(data); return data; }
    return null;
  }

  function diagnose() {
    const raw    = localStorage.getItem(KEY);
    const config = getConfig();
    const fbReady = typeof FirebaseAuth !== 'undefined' && FirebaseAuth.isReady();
    return {
      localDataSize:  raw ? raw.length : 0,
      urlEncodedSize: raw ? encodeURIComponent(raw).length : 0,
      hasLocal:       !!raw,
      backupExists:   !!localStorage.getItem(KEY + '_backup'),
      isConfigured:   isConfigured(),
      firebaseAuthReady: fbReady,
      firebaseUser:   fbReady ? FirebaseAuth.getUserLabel() : 'N/A',
      backendType:    config.type,
      syncStatus:     _syncStatus,
      retryCount:     _retryCount,
      debounceActive: !!_debounceTimer
    };
  }

  function clear() {
    localStorage.removeItem(KEY);
    localStorage.removeItem(KEY + '_backup');
  }

  // ─── マイグレーション ─────────────────────────────────────────────────────

  function migrate(data) {
    if (!data) return data;
    if (data.formation && !Array.isArray(data.formation)) {
      data.formation = Object.values(data.formation);
    }
    if (data.daily && !data.daily.hasOwnProperty('claimed')) {
      data.daily.claimed = {};
    }
    return data;
  }

  function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  return {
    save, load, pullFromCloud, clear,
    getConfig, setConfig, isConfigured,
    ping, getSyncStatus, onSyncStatusChange, diagnose
  };
})();
