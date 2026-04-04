/**
 * storage.js — 保存・読込モジュール
 *
 * ローカル保存 (LocalStorage) を常に行い、
 * GAS エンドポイントが設定されている場合は非同期でクラウド同期する。
 * GAS が失敗してもゲームは止まらない。
 */
const Storage = (() => {
  const KEY        = 'magic_garden_v2';
  const CONFIG_KEY = 'magic_garden_gas_config';  // GAS設定（ゲームデータとは別保存）
  const DEFAULT_ENDPOINT = 'https://script.google.com/macros/s/AKfycbx9gWYwh1lbqpSlNJBFm5dvtPejACyAScbA-dO8TWPYtQ_AxFj4KtYNnLnVVG778jxk/exec';

  // ─── GAS 設定 ─────────────────────────────────────────────────────────────

  function getConfig() {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      const saved = raw ? JSON.parse(raw) : {};
      return {
        endpoint: saved.endpoint || DEFAULT_ENDPOINT,
        playerId: saved.playerId || ''
      };
    } catch (_) {
      return { endpoint: DEFAULT_ENDPOINT, playerId: '' };
    }
  }

  function setConfig(endpoint, playerId) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ endpoint, playerId }));
  }

  function isConfigured() {
    const c = getConfig();
    return !!(c.endpoint && c.playerId);
  }

  // ─── ローカル保存 ─────────────────────────────────────────────────────────

  function saveLocal(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
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
      console.error('[Storage] Local load failed:', e);
      return null;
    }
  }

  // ─── GAS クラウド保存（非同期・失敗は無視） ────────────────────────────────

  async function saveCloud(state) {
    const { endpoint, playerId } = getConfig();
    if (!endpoint || !playerId) return;
    try {
      // no-cors: プリフライトなしで送信（GASのCORS制限を回避）
      // Content-Type を省略すると text/plain 扱いになりプリフライト不要
      await fetch(endpoint, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ action: 'save', playerId, data: state })
      });
    } catch (e) {
      console.warn('[Storage] Cloud save failed (offline?):', e.message);
    }
  }

  async function loadCloud() {
    const { endpoint, playerId } = getConfig();
    if (!endpoint || !playerId) return null;
    try {
      const res = await fetch(`${endpoint}?action=load&playerId=${encodeURIComponent(playerId)}`);
      const json = await res.json();
      if (json.ok && json.data) return migrate(json.data);
    } catch (e) {
      console.warn('[Storage] Cloud load failed (offline?):', e.message);
    }
    return null;
  }

  // ─── 疎通テスト ───────────────────────────────────────────────────────────

  async function ping(endpoint) {
    try {
      const res  = await fetch(`${endpoint}?action=ping`);
      const json = await res.json();
      return json.ok === true;
    } catch (_) {
      return false;
    }
  }

  // ─── 公開 API ─────────────────────────────────────────────────────────────

  /**
   * セーブ: ローカルに即保存 + クラウドにバックグラウンド同期
   */
  function save(state) {
    const ok = saveLocal(state);
    saveCloud(state);   // await しない（ゲームをブロックしない）
    return ok;
  }

  /**
   * ロード: ローカルから即座に返す（起動を止めない）
   */
  function load() {
    return loadLocal();
  }

  /**
   * クラウドから手動で引き継ぎ（非同期）
   * UI の「クラウドから読込」ボタン用
   * @returns {Promise<object|null>}  取得したデータ、なければ null
   */
  async function pullFromCloud() {
    const data = await loadCloud();
    if (data) {
      saveLocal(data);   // ローカルにも反映
      return data;
    }
    return null;
  }

  function clear() {
    localStorage.removeItem(KEY);
  }

  // ─── バージョンマイグレーション ───────────────────────────────────────────

  function migrate(data) {
    if (!data || !data.version) return data;
    // 将来のバージョンアップ時はここに変換処理を追加
    return data;
  }

  return { save, load, pullFromCloud, clear, getConfig, setConfig, isConfigured, ping };
})();
