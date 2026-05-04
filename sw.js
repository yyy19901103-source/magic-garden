/**
 * sw.js — まほうの庭 Service Worker (v94)
 *
 * 戦略:
 *  - install: クリティカル静的アセット（HTML/CSS/JS/UI icon/nav icon/character thumbs）を一括 pre-cache
 *  - fetch: cache-first（assets/* と CSS/JS）、ネット fallback で SWR
 *  - キャラ画像（hires/std/thumbs）はランタイムキャッシュ
 *  - バージョンが上がった時のみ古いキャッシュを破棄
 *
 * GitHub Pages 配下では scope = リポジトリパス。register 側で navigator.serviceWorker.register('./sw.js') 推奨。
 */

const SW_VERSION = 'mg-v94';
const STATIC_CACHE  = `${SW_VERSION}-static`;
const RUNTIME_CACHE = `${SW_VERSION}-runtime`;

// 全キャラID（generals_data.js より生成・28体）
const CHAR_IDS = [
  'aquaria','arca','arcana','aria','blaze','choco','coral','fafnir','flame','frost',
  'galdo','grimoire','iris','lancelot','lily','longjan','lucifer','luna','nyx','popo',
  'rockus','seraphina','shadow','sylphia','terra','volkhan','windel','zephyr'
];

// install 時に確実に焼くもの（容量を抑えるため必要最小限）
const PRECACHE_URLS = [
  './',
  './index.html',
  // 画像（軽い 256×384 thumb）
  ...CHAR_IDS.map(id => `./assets/characters/thumbs/${id}.webp`),
  // ナビアイコン (5枚)
  './assets/nav-icons/home.webp',
  './assets/nav-icons/adventure.webp',
  './assets/nav-icons/generals.webp',
  './assets/nav-icons/gacha.webp',
  './assets/nav-icons/codex.webp',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      // 失敗を全体エラーにしないため individual fetch + put
      Promise.all(PRECACHE_URLS.map(async (url) => {
        try {
          const resp = await fetch(url, { cache: 'reload' });
          if (resp.ok) await cache.put(url, resp);
        } catch (e) {
          // 1ファイル失敗してもオフラインキャッシュは進める
        }
      }))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE && k.startsWith('mg-'))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // 同一オリジン以外（Google Fonts など）はネットワーク優先で無視
  if (url.origin !== location.origin) return;

  // CSS / JS / WebP / PNG / フォントは cache-first + ネットワーク追記
  const isStaticAsset =
    /\.(?:webp|png|jpg|jpeg|svg|ico|css|js|woff2?|ttf|otf)(?:\?.*)?$/i.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) {
          // 背景でネット更新（SWR）— 失敗無視
          fetch(req).then((resp) => {
            if (resp && resp.ok) caches.open(RUNTIME_CACHE).then((c) => c.put(req, resp.clone())).catch(()=>{});
          }).catch(()=>{});
          return cached;
        }
        return fetch(req).then((resp) => {
          if (resp && resp.ok) {
            const respClone = resp.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, respClone)).catch(()=>{});
          }
          return resp;
        });
      })
    );
    return;
  }

  // HTML はネット優先・失敗時キャッシュ（オフライン対応）
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
  }
});
