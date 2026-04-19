/**
 * storage.js — 保存・読込モジュール v3.0
 *
 * 対応バックエンド:
 *  1. Firebase Realtime Database（推奨）
 *     - 無料・ブラウザのみで設定可能・URL制限なし・高速
 *     - PUT/GET で保存/読込（完全CORS対応）
 *  2. Google Apps Script（GAS）
 *     - 既存設定ユーザー向け（PropertiesService版）
 *
 * 信頼性機能:
 *  - ローカル保存: localStorage + backup key の二重保存
 *  - クラウド: 失敗時に最大3回リトライ（指数バックオフ）
 *  - ページを閉じる直前・タブ非表示時の自動保存は game側/UI側で行う
 *  - sync状態変化コールバック（UIインジケーター用）
 *  - diagnose() でデバッグ情報取得可能
 */
const Storage = (() => {
  const KEY        = 'magic_garden_v2';
  const CONFIG_KEY = 'magic_garden_gas_config';
  const DEFAULT_ENDPOINT = 'https://script.google.com/macros/s/AKfycbx9gWYwh1lbqpSlNJBFm5dvtPejACyAScbA-dO8TWPYtQ_AxFj4KtYNnLnVVG778jxk/exec';
  const URL_SAFE_BYTES   = 6500;  // GAS GET URLの安全上限

  // ─── 同期ステータス ─────────────────────────────────────────────────────
  let _syncStatus    = 'idle';
  let _syncCallbacks = [];
  let _retryQueue    = null;
  let _retryCount    = 0;
  let _retryTimer    = null;
  const MAX_RETRY    = 3;
  const RETRY_DELAYS = [5000, 15000, 30000];

  function _setSyncStatus(s) {
    if (_syncStatus === s) return;
    _syncStatus = s;
    _syncCallbacks.forEach(fn => { try { fn(s); } catch(_){} });
  }

  function onSyncStatusChange(fn) {
    _syncCallbacks.push(fn);
    fn(_syncStatus);
  }

  function getSyncStatus() { return _syncStatus; }

  // ─── GAS 設定 ─────────────────────────────────────────────────────────────

  function getConfig() {
    try {
      const raw   = localStorage.getItem(CONFIG_KEY);
      const saved = raw ? JSON.parse(raw) : {};
      return {
        type:     saved.type     || 'gas',   // 'gas' | 'firebase'
        endpoint: saved.endpoint || DEFAULT_ENDPOINT,
        playerId: saved.playerId || ''
      };
    } catch (_) {
      return { type: 'gas', endpoint: DEFAULT_ENDPOINT, playerId: '' };
    }
  }

  function setConfig(endpoint, playerId, type) {
    const cfg = getConfig();
    localStorage.setItem(CONFIG_KEY, JSON.stringify({
      type:     type     || cfg.type || 'gas',
      endpoint: endpoint || cfg.endpoint,
      playerId: playerId || cfg.playerId
    }));
  }

  function isConfigured() {
    const c = getConfig();
    return !!(c.endpoint && c.playerId);
  }

  // ─── ローカル保存（同期・二重保存） ──────────────────────────────────────

  function saveLocal(state) {
    try {
      const payload = JSON.stringify(state);
      localStorage.setItem(KEY, payload);
      localStorage.setItem(KEY + '_backup', payload);   // バックアップ
      return true;
    } catch (e) {
      console.error('[Storage] Local save failed:', e);
      return false;
    }
  }

  function loadLocal() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return migrate(JSON.parse(raw));
    } catch (e) {
      // メインが壊れていればバックアップから復旧
      console.error('[Storage] Main load failed, trying backup...');
      try {
        const backup = localStorage.getItem(KEY + '_backup');
        if (backup) return migrate(JSON.parse(backup));
      } catch (_) {}
      return null;
    }
  }

  // ─── クラウド保存（バックエンド自動選択） ────────────────────────────────

  async function saveCloud(state) {
    const { endpoint, playerId, type } = getConfig();
    if (!endpoint || !playerId) return;

    _setSyncStatus('syncing');
    const ok = await _trySave(type, endpoint, playerId, state);

    if (ok) {
      _retryQueue = null;
      _retryCount = 0;
      _setSyncStatus('ok');
    } else {
      _retryQueue = { type, endpoint, playerId, state };
      _retryCount = 0;
      _setSyncStatus('retry');
      _scheduleRetry();
    }
  }

  async function _trySave(type, endpoint, playerId, state) {
    try {
      if (type === 'firebase') {
        return await _saveFirebase(endpoint, playerId, state);
      } else {
        return await _saveGas(endpoint, playerId, state);
      }
    } catch (e) {
      console.warn('[Storage] Save attempt failed:', e.message);
      return false;
    }
  }

  // ── Firebase Realtime Database ──
  async function _saveFirebase(endpoint, playerId, state) {
    // endpoint例: https://myproject-default-rtdb.firebaseio.com
    const url = `${endpoint.replace(/\/$/, '')}/players/${encodeURIComponent(playerId)}.json`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(state),
      signal:  AbortSignal.timeout(10000)
    });
    return res.ok;
  }

  async function _loadFirebase(endpoint, playerId) {
    const url = `${endpoint.replace(/\/$/, '')}/players/${encodeURIComponent(playerId)}.json`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data ? migrate(data) : null;
  }

  // ── GAS (PropertiesService) ──
  async function _saveGas(endpoint, playerId, state) {
    const jsonStr = JSON.stringify(state);
    const encoded = encodeURIComponent(jsonStr);

    if (encoded.length <= URL_SAFE_BYTES) {
      const url = `${endpoint}?action=save`
        + `&playerId=${encodeURIComponent(playerId)}`
        + `&data=${encoded}`;
      const res  = await fetch(url, { signal: AbortSignal.timeout(12000) });
      const json = await res.json();
      return json.ok === true;
    } else {
      // URLが長すぎる場合はチャンク分割
      console.warn('[Storage] Data too large for single URL, chunking...');
      return await _saveGasChunked(endpoint, playerId, jsonStr);
    }
  }

  async function _saveGasChunked(endpoint, playerId, jsonStr) {
    const SIZE = 4000;
    const chunks = Math.ceil(jsonStr.length / SIZE);
    for (let i = 0; i < chunks; i++) {
      const chunk  = encodeURIComponent(jsonStr.slice(i * SIZE, (i+1) * SIZE));
      const url    = `${endpoint}?action=saveChunk`
        + `&playerId=${encodeURIComponent(playerId)}`
        + `&chunk=${i}&total=${chunks}&data=${chunk}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
      const json = await res.json();
      if (!json.ok) return false;
      if (i < chunks - 1) await _sleep(200);
    }
    return true;
  }

  async function _loadGas(endpoint, playerId) {
    const res  = await fetch(
      `${endpoint}?action=load&playerId=${encodeURIComponent(playerId)}`,
      { signal: AbortSignal.timeout(12000) }
    );
    const json = await res.json();
    return json.ok && json.data ? migrate(json.data) : null;
  }

  // ─── リトライ ─────────────────────────────────────────────────────────────

  function _scheduleRetry() {
    if (_retryTimer) clearTimeout(_retryTimer);
    if (_retryCount >= MAX_RETRY || !_retryQueue) {
      if (_retryCount >= MAX_RETRY) {
        console.warn('[Storage] Max retries reached.');
        _setSyncStatus('error');
      }
      return;
    }
    const delay = RETRY_DELAYS[_retryCount] || 30000;
    _retryTimer = setTimeout(async () => {
      if (!_retryQueue) return;
      const { type, endpoint, playerId, state } = _retryQueue;
      _retryCount++;
      const ok = await _trySave(type, endpoint, playerId, state);
      if (ok) {
        _retryQueue = null;
        _retryCount = 0;
        _setSyncStatus('ok');
      } else {
        _scheduleRetry();
      }
    }, delay);
  }

  // ─── クラウド読込 ─────────────────────────────────────────────────────────

  async function loadCloud() {
    const { endpoint, playerId, type } = getConfig();
    if (!endpoint || !playerId) return null;
    try {
      if (type === 'firebase') {
        return await _loadFirebase(endpoint, playerId);
      } else {
        return await _loadGas(endpoint, playerId);
      }
    } catch (e) {
      console.warn('[Storage] Cloud load failed:', e.message);
      return null;
    }
  }

  // ─── 疎通テスト ───────────────────────────────────────────────────────────

  async function ping(endpoint, type) {
    const t = type || getConfig().type;
    try {
      if (t === 'firebase') {
        // Firebase: .json にGETして200ならOK（データがnullでもOK）
        const res = await fetch(
          `${endpoint.replace(/\/$/, '')}/.json`,
          { signal: AbortSignal.timeout(8000) }
        );
        return res.ok;
      } else {
        const res  = await fetch(`${endpoint}?action=ping`, { signal: AbortSignal.timeout(8000) });
        const json = await res.json();
        return json.ok === true;
      }
    } catch (_) {
      return false;
    }
  }

  // ─── 公開 API ─────────────────────────────────────────────────────────────

  function save(state) {
    const ok = saveLocal(state);
    saveCloud(state);
    return ok;
  }

  function load() {
    return loadLocal();
  }

  async function pullFromCloud() {
    const data = await loadCloud();
    if (data) {
      saveLocal(data);
      return data;
    }
    return null;
  }

  function diagnose() {
    const raw    = localStorage.getItem(KEY);
    const config = getConfig();
    return {
      localDataSize:  raw ? raw.length : 0,
      urlEncodedSize: raw ? encodeURIComponent(raw).length : 0,
      urlSafe:        raw ? encodeURIComponent(raw).length <= URL_SAFE_BYTES : true,
      hasLocal:       !!raw,
      backupExists:   !!localStorage.getItem(KEY + '_backup'),
      isConfigured:   isConfigured(),
      backendType:    config.type,
      endpoint:       config.endpoint ? config.endpoint.slice(0, 50) + '...' : 'none',
      playerId:       config.playerId || 'none',
      syncStatus:     _syncStatus,
      retryCount:     _retryCount,
      hasRetryQueue:  !!_retryQueue
    };
  }

  function clear() {
    localStorage.removeItem(KEY);
    localStorage.removeItem(KEY + '_backup');
  }

  // ─── バージョンマイグレーション ───────────────────────────────────────────

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
    save,
    load,
    pullFromCloud,
    clear,
    getConfig,
    setConfig,
    isConfigured,
    ping,
    getSyncStatus,
    onSyncStatusChange,
    diagnose
  };
})();
