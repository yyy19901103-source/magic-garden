/**
 * main.js — UI制御・イベントバインド・起動処理
 * 4タブ: ホーム / 冒険 / 副将 / ガチャ
 */
const UI = (() => {

  // ─── ユーティリティ ─────────────────────────────────────────────────────

  const $ = id => document.getElementById(id);
  const show = id => { const e=$(id); if(e) e.classList.remove('hidden'); };
  const hide = id => { const e=$(id); if(e) e.classList.add('hidden'); };
  const showTemp = (id, ms=2000) => { show(id); setTimeout(() => hide(id), ms); };

  function makePortrait(def, size='md') {
    const sizeClass = size === 'lg' ? 'portrait-lg' : 'portrait-md';
    return `
      <div class="portrait ${sizeClass} rarity-${def.rarity}" style="background:${def.gradient}">
        <span class="portrait-emoji">${def.emoji}</span>
        <img src="assets/characters/${def.id}.png"
             onload="this.classList.add('loaded')" onerror="this.remove()">
        <span class="rarity-badge badge-${def.rarity}">${def.rarity}</span>
      </div>`;
  }

  // ─── プレイヤー名表示 ────────────────────────────────────────────────────

  function updatePlayerName() {
    const el = $('player-name');
    if (el) el.textContent = Game.getState().player.name || 'まほうつかい';
  }

  // ─── リソースバー更新（全タブ共通） ────────────────────────────────────

  // ─── LINE通知 ──────────────────────────────────────────────────────────────

  const LINE_NOTIFY_URL = 'https://line-claude-bot-ymn6.onrender.com/line-notify';
  const LINE_UID_KEY    = 'magic_garden_line_uid';
  let _lineUserId         = localStorage.getItem(LINE_UID_KEY) || '';
  let _staminaNotifyArmed = false; // スタミナ<maxだった → 満タン到達で通知

  async function _sendLineNotify(event, message) {
    if (!_lineUserId) return;
    try {
      await fetch(LINE_NOTIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: _lineUserId, event, message }),
      });
    } catch(_) { /* ネットワーク失敗は無視 */ }
  }

  // ─── スタミナ秒単位タイマー用 ────────────────────────────────────────────
  let _staminaTimerIv = null;

  function _fmtSec(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2,'0')}`;
  }

  function _updateStaminaTimer() {
    const timerEl = $('stamina-timer');
    if (!timerEl) return;
    const st = Game.getStamina();
    if (st.current >= st.max) {
      // スタミナ満タン到達 → LINE通知（アームされていた場合のみ）
      if (_staminaNotifyArmed) {
        _staminaNotifyArmed = false;
        _sendLineNotify('stamina_full');
      }
      timerEl.classList.add('hidden');
      timerEl.textContent = '';
      if (_staminaTimerIv) { clearInterval(_staminaTimerIv); _staminaTimerIv = null; }
      return;
    }
    _staminaNotifyArmed = true; // 満タンでない → 次に満タンになったら通知
    timerEl.classList.remove('hidden');
    const toFull = st.secsToFull;
    if (toFull > 0) {
      const h = Math.floor(toFull / 3600);
      const remain = toFull % 3600;
      timerEl.textContent = h > 0
        ? `満タン ${h}h${_fmtSec(remain)}`
        : `満タン ${_fmtSec(remain)}`;
    }
  }

  function updateResourceBar() {
    const r = Game.getState().resources;
    $('coins').textContent    = Math.floor(r.coins).toLocaleString();
    $('crystals').textContent = Math.floor(r.crystals);
    const st   = Game.getStamina();
    const stEl = $('stamina-display');
    if (stEl) {
      const pct = Math.min(100, Math.round(st.current / st.max * 100));
      stEl.innerHTML = `
        <span class="st-label">⚡ ${st.current}/${st.max}</span>
        <span class="st-bar-wrap"><span class="st-bar-fill" style="width:${pct}%"></span></span>`;
      stEl.title = st.current < st.max
        ? `次回+1まで${st.nextRegenMin}分`
        : '満タン！';
      stEl.classList.toggle('stamina-low', st.current <= 5);
    }
    // タイマー即時更新 & 定期更新セットアップ
    _updateStaminaTimer();
    if (st.current < st.max && !_staminaTimerIv) {
      _staminaTimerIv = setInterval(_updateStaminaTimer, 1000);
    }
  }

  // ─── タブ切替 ───────────────────────────────────────────────────────────

  function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === tabName));
    document.querySelectorAll('.tab-panel').forEach(p =>
      p.classList.toggle('active', p.id === `tab-${tabName}`));

    if (tabName === 'home')      HomeTab.update();
    if (tabName === 'adventure') AdventureTab.update();
    if (tabName === 'generals')  GeneralsTab.update();
    if (tabName === 'gacha')     GachaTab.update();
    if (tabName === 'zukan')     ZukanTab.update();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ホームタブ
  // ═══════════════════════════════════════════════════════════════════════════

  const HomeTab = {
    update() {
      this.renderFormation();
      this.renderDashboard();
      this.renderDailyTasks();
      this.renderWeeklyTasks();
    },

    renderDashboard() {
      const el = $('home-dashboard');
      if (!el) return;

      // クラウドセーブ未設定バナー
      const banner = $('cloud-save-banner');
      if (banner) {
        const dismissed = sessionStorage.getItem('cloud_banner_dismissed') === '1';
        banner.classList.toggle('hidden', Storage.isConfigured() || dismissed);
      }

      const state   = Game.getState();
      const cleared = state.progress.clearedStages.length;
      const total   = getAllStageIds().length;
      const pct     = Math.round(cleared / total * 100);
      const power   = Math.floor(Game.calcTeamPower());
      const rate    = Math.floor(Game.getIdleRate());
      const genCnt  = Object.keys(state.generals).length;

      // ステージクリア進捗バー付きチップ
      const clearBar = `<div class="dash-progress-wrap">
        <div class="dash-progress-bar" style="width:${pct}%"></div>
      </div><span class="dash-pct">${pct}%</span>`;

      el.innerHTML = `
        <div class="dash-chip dash-chip--clear">
          <span class="dash-icon">🏆</span>
          <span class="dash-val">${cleared}<span class="dash-total">/${total}</span></span>
          <span class="dash-lbl">クリア</span>
          ${clearBar}
        </div>
        <div class="dash-chip dash-chip--power">
          <span class="dash-icon">⚔️</span>
          <span class="dash-val">${power >= 10000 ? (power/1000).toFixed(1)+'K' : power.toLocaleString()}</span>
          <span class="dash-lbl">戦力</span>
        </div>
        <div class="dash-chip dash-chip--idle">
          <span class="dash-icon">🪙</span>
          <span class="dash-val">${rate}</span>
          <span class="dash-lbl">毎分収益</span>
        </div>
        <div class="dash-chip dash-chip--generals">
          <span class="dash-icon">👥</span>
          <span class="dash-val">${genCnt}<span class="dash-total">/12</span></span>
          <span class="dash-lbl">副将</span>
        </div>`;
    },

    renderFormation() {
      const el = $('formation-display');
      if (!el) return;
      const state = Game.getState();
      el.innerHTML = '';
      state.formation.forEach((gid, i) => {
        const slot = document.createElement('div');
        slot.className = 'formation-slot';
        if (gid && state.generals[gid]) {
          const def   = Game.getGeneralDef(gid);
          const gs    = state.generals[gid];
          const stats = Game.getCharStats(gid);
          const power = Math.floor(stats.hp*0.1 + stats.atk*2 + stats.def*1.5 + stats.spd);
          const starsStr = '⭐'.repeat(gs.stars || 1);
          slot.innerHTML = `
            ${makePortrait(def,'md')}
            <div class="slot-name">${def.name}</div>
            <div class="slot-lv">Lv.${gs.level} <span style="font-size:9px;color:var(--gold)">${starsStr}</span></div>
            <div class="slot-power">💪${power.toLocaleString()}</div>`;
          slot.style.cursor = 'pointer';
          slot.addEventListener('click', () => {
            switchTab('generals');
            GeneralsTab.showDetail(gid);
          });
        } else {
          slot.innerHTML = `<div class="slot-empty">＋<br><small>未編成</small></div>`;
          slot.style.cursor = 'pointer';
          slot.addEventListener('click', () => switchTab('generals'));
        }
        el.appendChild(slot);
      });
    },

    renderDailyTasks() {
      const el = $('daily-tasks');
      if (!el) return;
      el.innerHTML = '';
      const tasks = Game.getDailyTasks();

      // 達成率バッジ更新
      const badge = $('daily-badge');
      if (badge) {
        const claimed = tasks.filter(t => t.isClaimed).length;
        badge.textContent = `${claimed}/${tasks.length}`;
        badge.classList.toggle('badge-complete', claimed === tasks.length);
      }

      tasks.forEach(task => {
        const div = document.createElement('div');
        div.className = `daily-task ${task.isClaimed ? 'done' : ''}`;
        const hasProgress = task.id === 'battle' || task.id === 'boss';
        const progressBar = hasProgress
          ? `<div class="task-progress-wrap"><div class="task-progress-bar" style="width:${(task.progress/task.target*100)}%"></div></div>`
          : '';
        const rewardText = task.reward.coins
          ? `+${task.reward.coins}🪙` : `+${task.reward.crystals}💎`;

        let rightHtml;
        if (task.isClaimed) {
          rightHtml = `<span class="task-reward done">✓</span>`;
        } else if (task.isDone) {
          rightHtml = `<button class="btn-claim" data-task="${task.id}">${rewardText} 受取</button>`;
        } else {
          rightHtml = `<span class="task-reward">${rewardText}</span>`;
        }

        div.innerHTML = `
          <span class="task-icon">${task.icon}</span>
          <div class="task-info">
            <span class="task-label">${task.label}</span>
            ${hasProgress ? `<span class="task-count">${task.progress}/${task.target}</span>` : ''}
            ${progressBar}
          </div>
          ${rightHtml}`;
        el.appendChild(div);
      });

      el.querySelectorAll('.btn-claim[data-task]').forEach(btn => {
        btn.addEventListener('click', () => {
          const r = Game.claimDailyTask(btn.dataset.task);
          if (r.success) { updateResourceBar(); this.renderDailyTasks(); this.renderWeeklyTasks(); }
        });
      });
    },

    renderWeeklyTasks() {
      const el = $('weekly-tasks');
      if (!el) return;
      el.innerHTML = '';

      // リセット日（次の月曜）を表示
      const label = $('weekly-reset-label');
      if (label) {
        const now   = new Date();
        const daysToMon = (8 - now.getDay()) % 7 || 7;
        const reset = new Date(now);
        reset.setDate(now.getDate() + daysToMon);
        label.textContent = `リセット: ${reset.getMonth()+1}/${reset.getDate()}`;
      }

      Game.getWeeklyTasks().forEach(task => {
        const div = document.createElement('div');
        div.className = `daily-task weekly-task ${task.isClaimed ? 'done' : ''}`;
        const pct      = Math.round(task.progress / task.target * 100);
        const progressBar = `<div class="task-progress-wrap"><div class="task-progress-bar weekly-bar" style="width:${pct}%"></div></div>`;
        const rewardText  = task.reward.crystals
          ? `+${task.reward.crystals}💎` : `+${task.reward.coins.toLocaleString()}🪙`;

        let rightHtml;
        if (task.isClaimed) {
          rightHtml = `<span class="task-reward done">✓</span>`;
        } else if (task.isDone) {
          rightHtml = `<button class="btn-claim weekly-claim" data-task="${task.id}">${rewardText} 受取</button>`;
        } else {
          rightHtml = `<span class="task-reward">${rewardText}</span>`;
        }

        div.innerHTML = `
          <span class="task-icon">${task.icon}</span>
          <div class="task-info">
            <span class="task-label">${task.label}</span>
            <span class="task-count">${task.progress}/${task.target}</span>
            ${progressBar}
          </div>
          ${rightHtml}`;
        el.appendChild(div);
      });

      el.querySelectorAll('.weekly-claim').forEach(btn => {
        btn.addEventListener('click', () => {
          const r = Game.claimWeeklyTask(btn.dataset.task);
          if (r.success) { updateResourceBar(); this.renderWeeklyTasks(); }
        });
      });
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 冒険タブ
  // ═══════════════════════════════════════════════════════════════════════════

  const AdventureTab = {
    currentChapter: 0,
    isBossTab: false,

    update() { this.isBossTab ? this.renderBossSection() : this.renderChapter(); },

    _switchView(isBoss) {
      this.isBossTab = isBoss;
      const stageList = $('stage-list');
      const bossSection = $('daily-boss-section');
      if (stageList)   stageList.classList.toggle('hidden', isBoss);
      if (bossSection) bossSection.classList.toggle('hidden', !isBoss);

      document.querySelectorAll('.chapter-tab').forEach(btn => {
        const bossBtnMatch = isBoss && btn.dataset.boss;
        const chapterBtnMatch = !isBoss && parseInt(btn.dataset.chapter) === this.currentChapter;
        btn.classList.toggle('active', bossBtnMatch || chapterBtnMatch);
      });
    },

    renderChapter() {
      this._switchView(false);
      const ch = STAGES_DATA[this.currentChapter];
      if (!ch) return;
      const cleared = Game.getState().progress.clearedStages;
      const allIds  = getAllStageIds();

      const el = $('stage-list');
      if (!el) return;
      el.innerHTML = '';

      // 章背景バナー
      const bgNames = ['ch1_forest', 'ch2_castle', 'ch3_temple', 'ch4_dragon', 'ch5_sky'];
      const bgName = bgNames[this.currentChapter] || 'ch1_forest';
      const banner = document.createElement('div');
      banner.className = 'chapter-banner';
      banner.innerHTML = `
        <img src="assets/backgrounds/${bgName}.png" alt="${ch.name}" onerror="this.style.display='none'">
        <div class="chapter-banner-title">${ch.name}</div>`;
      el.appendChild(banner);

      // ステージボス画像マップ
      const stageBossImg = {
        '1-5': 'boss_ancient_tree', '2-3': 'boss_demon_king',
        '3-6': 'boss_ancient_goddess', '4-6': 'boss_dragon_king', '5-5': 'boss_sky_guardian'
      };

      ch.stages.forEach(stage => {
        const idx       = allIds.indexOf(stage.id);
        const isCleared = cleared.includes(stage.id);
        const isNext    = idx === 0 || cleared.includes(allIds[idx - 1]);
        const isLocked  = !isCleared && !isNext;

        const div = document.createElement('div');
        div.className = `stage-item ${isCleared?'cleared':''} ${isNext&&!isCleared?'available':''} ${isLocked?'locked':''} ${stage.isBoss?'boss':''}`;

        const statusIcon = isCleared ? '⭐' : isNext ? '▶' : '🔒';
        const btnHtml = !isLocked
          ? `<button class="btn-battle" data-stage="${stage.id}">⚔️ 戦闘</button>`
          : `<button class="btn-battle" disabled>🔒</button>`;

        const bossKey = stageBossImg[stage.id];
        const bossImgHtml = bossKey
          ? `<img src="assets/bosses/${bossKey}.png" class="stage-boss-img" alt="${stage.name}" onerror="this.style.display='none'">`
          : '';

        div.innerHTML = `
          <span class="stage-status">${statusIcon}</span>
          ${bossImgHtml}
          <div class="stage-info">
            <div class="stage-name">${stage.isBoss?'👑 ':''}${stage.id} ${stage.name}</div>
            <div class="stage-enemies">${stage.enemies.map(e=>e.emoji).join(' ')}</div>
          </div>
          ${btnHtml}`;
        el.appendChild(div);
      });

      el.querySelectorAll('.btn-battle[data-stage]').forEach(btn => {
        btn.addEventListener('click', () => this.handleBattle(btn.dataset.stage));
      });
    },

    renderBossSection() {
      this._switchView(true);
      const bossState = Game.getDailyBossState();
      const attemptsEl = $('boss-attempts-text');
      if (attemptsEl) attemptsEl.textContent = `本日の挑戦: ${bossState.attemptsLeft}回残り（3回/日）`;

      const el = $('boss-cards');
      if (!el) return;
      el.innerHTML = '';
      const dailyImgMap = { 'boss_easy': 'daily_easy', 'boss_normal': 'daily_normal', 'boss_hard': 'daily_hard' };
      DAILY_BOSS_DATA.forEach(boss => {
        const card = document.createElement('div');
        const disabled = bossState.attemptsLeft <= 0;
        card.className = `boss-card boss-${boss.difficulty}`;
        const bossImg = dailyImgMap[boss.id] || '';
        const imgHtml = bossImg
          ? `<img src="assets/bosses/${bossImg}.png" class="boss-card-img" alt="${boss.name}" onerror="this.outerHTML='<span class=\\'boss-emoji\\'>${boss.emoji}</span>'">`
          : `<span class="boss-emoji">${boss.emoji}</span>`;
        card.innerHTML = `
          <div class="boss-card-header">
            ${imgHtml}
            <div>
              <div class="boss-name">${boss.name}</div>
              <div class="boss-difficulty-label">難易度：${boss.label}</div>
            </div>
          </div>
          <div class="boss-rewards">
            <span class="boss-reward-chip">🪙 ${boss.rewards.coins[0].toLocaleString()}〜</span>
            <span class="boss-reward-chip">💎 +${boss.rewards.crystals}</span>
            <span class="boss-reward-chip">${MATERIALS_DATA[boss.rewards.material]?.emoji} ×${boss.rewards.materialCount}</span>
          </div>
          <button class="btn-boss-fight" data-boss="${boss.id}" ${disabled ? 'disabled' : ''}>
            ${disabled ? '本日終了' : '⚔️ 挑戦する'}
          </button>`;
        el.appendChild(card);
      });

      el.querySelectorAll('.btn-boss-fight[data-boss]').forEach(btn => {
        btn.addEventListener('click', () => this.handleBossBattle(btn.dataset.boss));
      });
    },

    lastStageId: null,

    handleBattle(stageId) {
      const result = Game.battle(stageId);
      if (result.reason) {
        if (result.reason === 'no_team')    { alert('編成に副将を入れてください！'); return; }
        if (result.reason === 'no_stamina') { alert('スタミナが不足しています！　⚡ 5分ごとに1回復します。'); updateResourceBar(); return; }
        if (result.reason !== undefined && !result.win) { alert('エラー: ' + result.reason); return; }
      }
      this.lastStageId = stageId;
      updateResourceBar();
      this.renderChapter();
      HomeTab.renderDailyTasks();
      this.showBattleResult(stageId, result, false);
    },

    handleBossBattle(bossId) {
      const result = Game.battleBoss(bossId);
      if (result.reason === 'no_attempts') { alert('本日の挑戦回数が尽きました。明日また挑戦してください！'); return; }
      if (result.reason === 'no_team')     { alert('編成に副将を入れてください！'); return; }
      if (result.reason === 'no_stamina')  { alert('スタミナが不足しています！　日課ボスは⚡3消費します。'); updateResourceBar(); return; }
      updateResourceBar();
      this.renderBossSection();
      HomeTab.renderDailyTasks();
      this.showBattleResult(bossId, result, true);
    },

    showBattleResult(id, result, isBoss) {
      const win = result.win;

      // チャプター背景を result-panel に適用
      const resultPanel = document.querySelector('#battle-result .result-panel');
      const bgNames = ['ch1_forest', 'ch2_castle', 'ch3_temple', 'ch4_dragon', 'ch5_sky'];
      if (resultPanel && !isBoss && id && id.includes('-')) {
        const chIdx = parseInt(id[0]) - 1;
        const bg = bgNames[chIdx] || 'ch1_forest';
        resultPanel.style.backgroundImage = `linear-gradient(rgba(8,8,18,.88), rgba(8,8,18,.88)), url(assets/backgrounds/${bg}.png)`;
      } else if (resultPanel) {
        resultPanel.style.backgroundImage = '';
      }

      const banner = $('result-banner');
      banner.className = 'result-banner';         // クラス一旦リセット（再アニメ用）
      banner.textContent = win ? '🎉 勝利！' : '💀 敗北…';
      void banner.offsetWidth;                    // reflow で animation をリセット
      banner.classList.add(win ? 'win' : 'lose');

      const lootEl = $('result-loot');
      lootEl.innerHTML = '';
      if (win) {
        const loot = result.loot;
        if (loot.coins)    lootEl.innerHTML += `<span class="loot-chip">🪙 +${loot.coins.toLocaleString()}</span>`;
        if (loot.exp)      lootEl.innerHTML += `<span class="loot-chip">✨ EXP +${loot.exp}</span>`;
        if (loot.crystals) lootEl.innerHTML += `<span class="loot-chip">💎 +${loot.crystals}</span>`;
        if (loot.material) {
          const md = MATERIALS_DATA[loot.material];
          if (md) lootEl.innerHTML += `<span class="loot-chip">${md.emoji} ${md.name} ×${loot.materialCount||1}</span>`;
        }
        if (!isBoss) {
          loot.items?.forEach(inst => {
            const ed = EQUIPMENT_DATA[inst.defId];
            if (ed) lootEl.innerHTML += `<span class="loot-chip rarity-chip-${ed.rarity}">${ed.emoji} ${ed.name}</span>`;
          });
          if (loot.firstClear?.crystals) lootEl.innerHTML += `<span class="loot-chip first-clear">💎 初回 +${loot.firstClear.crystals}</span>`;
        }
        if (isBoss && result.attemptsLeft !== undefined) {
          lootEl.innerHTML += `<div class="loot-remaining">残り挑戦: ${result.attemptsLeft}回</div>`;
        }
        // レベルアップ通知
        if (!isBoss && loot.levelUps?.length > 0) {
          loot.levelUps.forEach(lu => {
            lootEl.innerHTML += `<span class="loot-chip level-up-chip">⬆️ ${lu.name} Lv.${lu.newLevel}!</span>`;
          });
        }
      }

      // バトル統計サマリー
      const statsEl = $('result-stats');
      if (statsEl) {
        const st = result.stats;
        if (st) {
          statsEl.innerHTML = `
            <span class="bstat">⏱ ${result.turns}ターン</span>
            <span class="bstat">⚔️ ${st.teamDmg.toLocaleString()}ダメ</span>
            ${st.skillCount > 0 ? `<span class="bstat">✨ スキル${st.skillCount}回</span>` : ''}`;
        } else {
          statsEl.innerHTML = `<span class="bstat">⏱ ${result.turns}ターン</span>`;
        }
      }

      const logEl = $('result-log');
      logEl.innerHTML = '';
      const highlights = BattleEngine.extractHighlights(result.log, 7);
      highlights.forEach((entry, i) => {
        setTimeout(() => {
          const div = document.createElement('div');
          div.className = `log-entry anim-fadein ${entry.isSkill?'log-skill':''} ${entry.type==='result'?'log-result':''}`;
          div.textContent = entry.text;
          logEl.appendChild(div);
          logEl.scrollTop = logEl.scrollHeight;
        }, i * 130);
      });

      // 全ログトグル（ハイライト以外のエントリがある場合のみ表示）
      const toggleBtn = $('result-log-toggle');
      if (toggleBtn) {
        const hasMore = result.log.length > highlights.length;
        if (hasMore) {
          toggleBtn.classList.remove('hidden');
          toggleBtn.classList.remove('open');
          toggleBtn.textContent = `📜 全ログを見る（${result.log.length}行） ▼`;
          // 重複バインド防止のためクローン置換
          const fresh = toggleBtn.cloneNode(true);
          toggleBtn.replaceWith(fresh);
          let expanded = false;
          fresh.addEventListener('click', () => {
            expanded = !expanded;
            fresh.classList.toggle('open', expanded);
            fresh.textContent = expanded
              ? '📜 折りたたむ ▲'
              : `📜 全ログを見る（${result.log.length}行） ▼`;
            if (expanded) {
              // 全エントリを追記
              logEl.innerHTML = '';
              result.log.forEach(entry => {
                const div = document.createElement('div');
                div.className = `log-entry ${entry.isSkill?'log-skill':''} ${entry.type==='result'?'log-result':''}`;
                div.textContent = entry.text;
                logEl.appendChild(div);
              });
              logEl.scrollTop = logEl.scrollHeight;
            } else {
              // ハイライトに戻す
              logEl.innerHTML = '';
              highlights.forEach(entry => {
                const div = document.createElement('div');
                div.className = `log-entry ${entry.isSkill?'log-skill':''} ${entry.type==='result'?'log-result':''}`;
                div.textContent = entry.text;
                logEl.appendChild(div);
              });
            }
          });
        } else {
          toggleBtn.classList.add('hidden');
        }
      }

      // 再挑戦ボタン（通常ステージの勝利時のみ）
      const retryBtn = $('result-retry');
      if (retryBtn) {
        if (!isBoss && win) {
          retryBtn.classList.remove('hidden');
          // イベントを毎回付け直す（クローン置換で重複防止）
          const fresh = retryBtn.cloneNode(true);
          retryBtn.replaceWith(fresh);
          fresh.addEventListener('click', () => {
            hide('battle-result');
            setTimeout(() => this.handleBattle(id), 80);
          });
        } else {
          retryBtn.classList.add('hidden');
        }
      }

      show('battle-result');
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 副将タブ
  // ═══════════════════════════════════════════════════════════════════════════

  const GeneralsTab = {
    _nameFilter:   '',
    _rarityFilter: 'all',

    update() {
      this.renderFormationEditor();
      this.renderGrid();
      // フィルター状態の同期
      const searchEl = $('generals-search');
      if (searchEl) searchEl.value = this._nameFilter;
      document.querySelectorAll('.rarity-filter-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.rarity === this._rarityFilter));
    },

    renderFormationEditor() {
      const el = $('formation-editor');
      if (!el) return;
      const state = Game.getState();
      el.innerHTML = '';
      state.formation.forEach((gid, i) => {
        const slot = document.createElement('div');
        slot.className = 'fe-slot';
        if (gid && state.generals[gid]) {
          const def = Game.getGeneralDef(gid);
          const gs  = state.generals[gid];
          slot.innerHTML = `
            ${makePortrait(def,'md')}
            <div class="fe-name">${def.name}</div>
            <div class="fe-lv">Lv.${gs.level}</div>`;
          slot.addEventListener('click', () => this.showDetail(gid));
        } else {
          slot.innerHTML = `<div class="fe-empty">＋</div>`;
        }
        el.appendChild(slot);
      });
    },

    renderGrid() {
      const el = $('generals-grid');
      if (!el) return;
      const state = Game.getState();
      const inFormation = state.formation;
      const total = Object.keys(state.generals).length;
      $('generals-count') && ($('generals-count').textContent = `(${total}体)`);

      // SSR→SR→R 順にソート
      const order = { SSR: 0, SR: 1, R: 2 };
      let sorted = Object.keys(state.generals).sort((a, b) => {
        const da = GENERALS_DATA[a], db = GENERALS_DATA[b];
        return (order[da.rarity] - order[db.rarity]) || (state.generals[b].level - state.generals[a].level);
      });

      // フィルター適用
      const nameQ  = (this._nameFilter || '').trim().toLowerCase();
      const rarQ   = this._rarityFilter;
      if (nameQ) {
        sorted = sorted.filter(gid => GENERALS_DATA[gid]?.name.toLowerCase().includes(nameQ));
      }
      if (rarQ && rarQ !== 'all') {
        sorted = sorted.filter(gid => GENERALS_DATA[gid]?.rarity === rarQ);
      }

      el.innerHTML = '';

      sorted.forEach(gid => {
        const def   = GENERALS_DATA[gid];
        const gs    = state.generals[gid];
        const stats = Game.getCharStats(gid);
        const power = stats ? Math.floor(stats.hp*0.1 + stats.atk*2 + stats.def*1.5 + stats.spd) : 0;
        const card  = document.createElement('div');
        card.className = `general-card rarity-${def.rarity}`;
        const starsStr = '⭐'.repeat(gs.stars || 1);
        const inFm  = inFormation.includes(gid);
        card.innerHTML = `
          ${makePortrait(def,'md')}
          ${inFm ? '<span class="formation-badge">編成中</span>' : ''}
          <div class="card-footer">
            <div class="card-name">${def.name}</div>
            <div class="card-lv">Lv.${gs.level} <span class="card-stars" style="font-size:9px">${starsStr}</span></div>
            <div class="card-power">⚔️${power >= 1000 ? (power/1000).toFixed(1)+'K' : power}</div>
          </div>`;
        card.addEventListener('click', () => this.showDetail(gid));
        el.appendChild(card);
      });
    },

    showDetail(gid) {
      const def   = GENERALS_DATA[gid];
      const gs    = Game.getState().generals[gid];
      const stats = Game.getCharStats(gid);
      const inFm  = Game.getState().formation.includes(gid);
      const expMax = Game.expToNext(gs.level);
      const expPct = Math.min(100, Math.floor(gs.exp / expMax * 100));
      const blInfo0  = Game.getBreakLimitInfo(gid);
      const isAtMaxLv = gs.level >= blInfo0.maxLevel;
      const lvCost   = Game.levelUpCost(gs.level);
      const hasCoins = !isAtMaxLv && Game.getState().resources.coins >= lvCost;

      const equips = gs.equips;
      const slotLabels = { weapon: '⚔️ 武器', armor: '🛡️ 防具', accessory: '💍 装飾' };
      const equipsHtml = Object.entries(slotLabels).map(([slot, label]) => {
        const iid  = equips[slot];
        const inst = iid ? Game.getState().inventory.equipment.find(e=>e.instanceId===iid) : null;
        const ed   = inst ? EQUIPMENT_DATA[inst.defId] : null;
        const enhTxt = inst && inst.enhanceLevel > 0 ? ` +${inst.enhanceLevel}` : '';
        return `<div class="equip-slot-row" data-general="${gid}" data-slot="${slot}" style="cursor:pointer;">
          <span class="equip-slot-label">${label}</span>
          <span class="equip-slot-val ${ed?'has-equip':''}">
            ${ed ? `${ed.emoji} ${ed.name}${enhTxt}` : '── タップして装備 ──'}
          </span>
          <span class="equip-slot-arrow">›</span>
        </div>`;
      }).join('');

      const stars   = gs.stars || 1;
      const shards  = gs.shards || 0;
      const awakenCost = Game.getAwakenCost(gid);
      const canAwaken  = awakenCost !== null && shards >= awakenCost;
      const starsHtml  = '⭐'.repeat(stars) + '☆'.repeat(6 - stars);
      const awakenHtml = stars < 6
        ? `<button class="btn btn-awaken" id="daw-btn" ${canAwaken?'':'disabled'}>
             覚醒 ${starsHtml}<br><small>欠片 ${shards}/${awakenCost}</small>
           </button>`
        : `<button class="btn btn-awaken" disabled>⭐ 最大覚醒 ⭐</button>`;

      const blInfo = Game.getBreakLimitInfo(gid);
      const breakHtml = blInfo.isMaxBreak
        ? `<button class="btn btn-break-limit" disabled>💎 限界突破完了 (Lv.${blInfo.maxLevel}上限)</button>`
        : `<button class="btn btn-break-limit" id="dbl-btn" ${blInfo.canBreak?'':'disabled'}>
             💎 限界突破 (${blInfo.breakCount+1}回目)<br>
             <small>欠片 ${blInfo.shards}/${blInfo.cost} → Lv.${blInfo.maxLevel+20}まで</small>
           </button>`;

      $('detail-body').innerHTML = `
        <div class="detail-top">
          <div class="detail-portrait-wrap">
            ${makePortrait(def,'lg')}
          </div>
          <div class="detail-meta">
            <h2 class="detail-name">${def.name}</h2>
            <p class="detail-title">${def.title}</p>
            <div class="detail-tags">
              <span class="tag tag-elem">${def.element}</span>
              <span class="tag tag-type">${def.typeName}</span>
            </div>
            <p class="detail-desc">${def.description}</p>
            <div class="detail-stars">${starsHtml}</div>
            <p class="detail-shards">欠片: ${shards}個</p>
          </div>
        </div>

        <div class="detail-level-block">
          <div class="level-row">
            <span class="level-num">Lv. <strong>${gs.level}</strong></span>
            <span class="exp-text">${gs.exp} / ${expMax} EXP</span>
          </div>
          <div class="exp-bar-wrap"><div class="exp-bar" style="width:${expPct}%"></div></div>
        </div>

        <div class="detail-stats">
          <div class="stat-box"><span>❤️ HP</span><strong>${stats.hp.toLocaleString()}</strong></div>
          <div class="stat-box"><span>⚔️ 攻撃</span><strong>${stats.atk.toLocaleString()}</strong></div>
          <div class="stat-box"><span>🛡️ 防御</span><strong>${stats.def.toLocaleString()}</strong></div>
          <div class="stat-box"><span>💨 速度</span><strong>${stats.spd}</strong></div>
        </div>

        <div class="detail-section">
          <h4 class="section-label">スキル</h4>
          ${def.skills.map((sk, idx) => {
            const skLv  = (gs.skillLevels?.[idx] ?? 1);
            const cost  = Game.getSkillUpgradeCost(gid, idx);
            const matMd = cost ? MATERIALS_DATA[cost.mat] : null;
            const have  = cost ? (Game.getState().inventory.materials[cost.mat] || 0) : 0;
            const canUp = cost && have >= cost.count;
            const skLvHtml = `<span class="skill-lv">Lv.${skLv}</span>`;
            const upBtn = cost
              ? `<button class="btn-skill-up" data-gid="${gid}" data-idx="${idx}" ${canUp?'':'disabled'}>
                   ▲ ${matMd?.emoji||'?'}×${cost.count} <small>(${have}/${cost.count})</small>
                 </button>`
              : `<span class="skill-lv-max">MAX</span>`;
            return `
            <div class="skill-row">
              <div class="skill-header">
                <span class="skill-name">${sk.name}</span>
                <div class="skill-right">
                  ${skLvHtml}
                  <span class="skill-sp">SP ${sk.sp}</span>
                </div>
              </div>
              <p class="skill-desc">${sk.description}</p>
              <div class="skill-upgrade-row">${upBtn}</div>
            </div>`;
          }).join('')}
        </div>

        <div class="detail-section">
          <h4 class="section-label">装備</h4>
          ${equipsHtml}
        </div>

        <div class="detail-actions">
          <button class="btn btn-levelup" id="dlv-btn" ${hasCoins?'':'disabled'}>
            ${isAtMaxLv ? `Lv.MAX (${blInfo0.maxLevel})` : `レベルアップ <small>(${lvCost.toLocaleString()}🪙)</small>`}
          </button>
          <button class="btn ${inFm?'btn-remove':'btn-add'}" id="dfm-btn">
            ${inFm ? '編成から外す' : '編成に入れる'}
          </button>
        </div>
        <div class="detail-actions" style="margin-top:8px;">
          ${awakenHtml}
        </div>
        <div class="detail-actions" style="margin-top:8px;">
          ${breakHtml}
        </div>`;

      show('general-detail');

      // 装備スロットをタップ → EquipPicker を開く
      $('detail-body').querySelectorAll('.equip-slot-row[data-slot]').forEach(row => {
        row.addEventListener('click', () => EquipPicker.open(row.dataset.general, row.dataset.slot));
      });

      $('dlv-btn').addEventListener('click', () => {
        const r = Game.levelUpGeneral(gid);
        if (r.success) { updateResourceBar(); this.showDetail(gid); this.renderGrid(); }
      });
      $('dfm-btn').addEventListener('click', () => {
        inFm ? Game.removeFromFormation(gid) : Game.addToFormation(gid);
        this.showDetail(gid);
        this.renderGrid();
        this.renderFormationEditor();
        HomeTab.renderFormation();
      });
      $('daw-btn')?.addEventListener('click', () => {
        const r = Game.awakenGeneral(gid);
        if (r.success) { this.showDetail(gid); this.renderGrid(); }
      });
      $('dbl-btn')?.addEventListener('click', () => {
        const r = Game.breakLimit(gid);
        if (r.success) { this.showDetail(gid); this.renderGrid(); }
        else if (r.reason === 'no_shards') alert(`欠片が不足しています。必要: ${r.needed}個`);
      });

      $('detail-body').querySelectorAll('.btn-skill-up[data-idx]').forEach(btn => {
        btn.addEventListener('click', () => {
          const r = Game.upgradeSkill(btn.dataset.gid, Number(btn.dataset.idx));
          if (r.success) { this.showDetail(gid); GachaTab.renderMaterials(); }
          else if (r.reason === 'no_materials') alert('素材が不足しています！');
        });
      });
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ガチャタブ
  // ═══════════════════════════════════════════════════════════════════════════

  const GachaTab = {
    _equipFilter: 'all',
    _equipSort:   'rarity',

    update() {
      const pity = Game.getState().progress.gachaPity;
      const CEIL = 90;
      const pct  = Math.round(pity / CEIL * 100);
      // 天井ゲージ更新
      const cntEl = $('pity-count');
      if (cntEl) cntEl.textContent = `残り${CEIL - pity}回`;
      const drawnEl = $('pity-drawn');
      if (drawnEl) drawnEl.textContent = `${pity}回消化`;
      const barEl = $('pity-bar');
      if (barEl) {
        barEl.style.width = pct + '%';
        // 残り少なくなるほど赤みが増すグラデーション
        barEl.style.background = pct >= 80
          ? 'linear-gradient(90deg,#f59e0b,#ef4444)'
          : pct >= 50
            ? 'linear-gradient(90deg,var(--primary),#f59e0b)'
            : 'linear-gradient(90deg,var(--primary),#ec4899)';
      }
      this.renderShop();
      this.renderEquipInventory();
      this.renderMaterials();
      this.updateButtons();
      // フィルターボタンの状態を同期
      document.querySelectorAll('.equip-filter-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.type === this._equipFilter));
      const sel = $('equip-sort-sel');
      if (sel) sel.value = this._equipSort;
    },

    updateButtons() {
      const cr = Game.getState().resources.crystals;
      const b1 = $('draw-1-btn');
      const b10 = $('draw-10-btn');
      if (b1)  b1.disabled  = cr < 30;
      if (b10) b10.disabled = cr < 280;
    },

    handleDraw(count) {
      const result = Game.draw(count);
      if (!result.success) {
        alert(`クリスタルが不足しています。必要: ${result.needed}💎`);
        return;
      }
      updateResourceBar();
      this.update();
      GeneralsTab.update();
      HomeTab.renderFormation();
      this.showGachaResult(result.results);
    },

    showGachaResult(results) {
      const el = $('gacha-result-cards');
      el.innerHTML = '';
      results.forEach(({ def, isNew }, i) => {
        const card = document.createElement('div');
        card.className = `gacha-card rarity-${def.rarity} card-reveal-hidden`;
        card.innerHTML = `
          ${makePortrait(def,'md')}
          <div class="gacha-card-name">${def.name}</div>
          <div class="gacha-card-sub">${isNew ? '🆕 NEW！' : `✨ 欠片 +5`}</div>`;
        el.appendChild(card);
        // 1枚ずつずらして回転リビール
        setTimeout(() => {
          card.classList.remove('card-reveal-hidden');
          if (def.rarity === 'SSR') card.classList.add('card-revealed');
        }, 60 + i * 110);
      });
      show('gacha-result');
    },

    renderMaterials() {
      const el = $('materials-list');
      if (!el) return;
      const mats    = Game.getState().inventory.materials;
      const recipes = Game.getSynthRecipes();
      const entries = Object.entries(mats).filter(([,v]) => v > 0);
      if (entries.length === 0) {
        el.innerHTML = '<p class="empty-msg">素材がありません。バトルで集めよう！</p>';
        return;
      }
      el.innerHTML = '';
      entries.forEach(([id, count]) => {
        const md = MATERIALS_DATA[id];
        if (!md) return;
        const recipe   = recipes.find(r => r.from === id);
        const canSynth = recipe && count >= recipe.cost;
        let synthBtn   = '';
        if (recipe) {
          const toLabel = recipe.to === '_crystals'
            ? `💎×${recipe.get}`
            : `${MATERIALS_DATA[recipe.to]?.emoji || '?'}×${recipe.get}`;
          synthBtn = `<button class="btn-synth" data-mat="${id}" ${canSynth ? '' : 'disabled'}>
            合成→${toLabel} <small>(×${recipe.cost})</small>
          </button>`;
        }
        const row = document.createElement('div');
        row.className = 'material-row';
        row.innerHTML = `
          <div class="material-chip-inner">
            <span class="mat-emoji">${md.emoji}</span>
            <span class="mat-name">${md.name}</span>
            <span class="mat-count">×${count}</span>
          </div>
          ${synthBtn}`;
        el.appendChild(row);
      });

      el.querySelectorAll('.btn-synth[data-mat]').forEach(btn => {
        btn.addEventListener('click', () => {
          const r = Game.synthesize(btn.dataset.mat);
          if (r.success) { updateResourceBar(); this.renderMaterials(); }
        });
      });
    },

    renderShop() {
      const el = $('shop-list');
      if (!el) return;
      const items  = Game.getShop();
      const coins  = Game.getState().resources.coins;
      el.innerHTML = '';
      items.forEach((item, idx) => {
        const ed  = item.def;
        if (!ed) return;
        const row = document.createElement('div');
        row.className = `shop-row rarity-${ed.rarity} ${item.sold ? 'shop-sold' : ''}`;
        const statsText = Object.entries(ed.stats)
          .map(([k, v]) => `${k.toUpperCase()}+${v}`).join(' ');
        const canBuy = !item.sold && coins >= item.price;
        row.innerHTML = `
          <span class="equip-emoji">${ed.emoji}</span>
          <div class="equip-info">
            <div class="equip-name">${ed.name} <span class="equip-rarity">${ed.rarity}</span></div>
            <div class="equip-stats">${statsText}</div>
          </div>
          <button class="btn-shop-buy" data-idx="${idx}" ${canBuy ? '' : 'disabled'}>
            ${item.sold ? '売切' : `${item.price.toLocaleString()}🪙`}
          </button>`;
        el.appendChild(row);
      });

      el.querySelectorAll('.btn-shop-buy[data-idx]').forEach(btn => {
        btn.addEventListener('click', () => {
          const r = Game.buyShopItem(Number(btn.dataset.idx));
          if (r.success) { updateResourceBar(); this.renderShop(); this.renderEquipInventory(); }
          else if (r.reason === 'no_coins') alert(`コインが不足しています。必要: ${r.needed?.toLocaleString()}🪙`);
        });
      });
    },

    renderEquipInventory() {
      const el = $('equip-inventory');
      if (!el) return;
      let equips = Game.getState().inventory.equipment;
      if (equips.length === 0) {
        el.innerHTML = '<p class="empty-msg">装備がありません。バトルで入手しよう！</p>';
        return;
      }

      // フィルター
      const filterType = this._equipFilter;
      if (filterType !== 'all') {
        equips = equips.filter(inst => {
          const ed = EQUIPMENT_DATA[inst.defId];
          return ed && ed.type === filterType;
        });
      }

      // ソート
      const rarityOrder = { SSR: 0, SR: 1, R: 2 };
      if (this._equipSort === 'rarity') {
        equips = equips.slice().sort((a, b) => {
          const ra = rarityOrder[EQUIPMENT_DATA[a.defId]?.rarity] ?? 9;
          const rb = rarityOrder[EQUIPMENT_DATA[b.defId]?.rarity] ?? 9;
          return ra - rb || b.enhanceLevel - a.enhanceLevel;
        });
      } else if (this._equipSort === 'enhance') {
        equips = equips.slice().sort((a, b) => b.enhanceLevel - a.enhanceLevel);
      }
      // 'new'はデフォルト順（追加順）

      if (equips.length === 0) {
        el.innerHTML = '<p class="empty-msg">この種類の装備はありません</p>';
        return;
      }

      el.innerHTML = '';
      equips.forEach(inst => {
        const ed = EQUIPMENT_DATA[inst.defId];
        if (!ed) return;
        const div = document.createElement('div');
        div.className = `equip-item rarity-${ed.rarity}`;
        const bonus = 1 + inst.enhanceLevel * 0.1;
        const statsText = Object.entries(ed.stats)
          .map(([k,v]) => `${k.toUpperCase()}+${Math.floor(v * bonus)}`)
          .join(' / ');
        const enhCost = Game.getEnhanceCost(inst.instanceId);
        const coins   = Game.getState().resources.coins;
        const isEquipped = Object.values(Game.getState().generals).some(gs =>
          Object.values(gs.equips).includes(inst.instanceId)
        );
        const enhLabel = inst.enhanceLevel >= 10
          ? '<span class="enhance-max">MAX</span>'
          : `<button class="btn-enhance" data-iid="${inst.instanceId}" ${coins >= enhCost ? '' : 'disabled'}>
               🔨 強化 <small>(${enhCost?.toLocaleString()}🪙)</small>
             </button>`;
        const sellBase = { R: 100, SR: 500, SSR: 2000 }[ed.rarity] || 100;
        const sellVal  = Math.floor(sellBase * (1 + inst.enhanceLevel * 0.5));
        const sellLabel = isEquipped
          ? '<span class="sell-equipped">装備中</span>'
          : `<button class="btn-sell" data-iid="${inst.instanceId}">売 ${sellVal.toLocaleString()}🪙</button>`;
        div.innerHTML = `
          <span class="equip-emoji">${ed.emoji}</span>
          <div class="equip-info">
            <div class="equip-name">
              ${ed.name}
              <span class="equip-rarity">${ed.rarity}</span>
              ${inst.enhanceLevel > 0 ? `<span class="enhance-badge">+${inst.enhanceLevel}</span>` : ''}
            </div>
            <div class="equip-stats">${statsText}</div>
          </div>
          <div class="equip-enhance-col">${enhLabel}</div>
          <div class="equip-sell-col">${sellLabel}</div>`;
        el.appendChild(div);
      });

      el.querySelectorAll('.btn-enhance[data-iid]').forEach(btn => {
        btn.addEventListener('click', () => {
          const r = Game.enhanceEquip(btn.dataset.iid);
          if (r.success) { updateResourceBar(); HomeTab.renderDailyTasks(); this.renderEquipInventory(); }
          else if (r.reason === 'no_coins') alert(`コインが不足しています。必要: ${r.needed?.toLocaleString()}🪙`);
        });
      });

      el.querySelectorAll('.btn-sell[data-iid]').forEach(btn => {
        btn.addEventListener('click', () => {
          const r = Game.sellEquip(btn.dataset.iid);
          if (r.success) { updateResourceBar(); this.renderEquipInventory(); }
        });
      });
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 装備ピッカー
  // ═══════════════════════════════════════════════════════════════════════════

  const EquipPicker = {
    _gid: null, _slot: null,

    open(gid, slot) {
      this._gid  = gid;
      this._slot = slot;
      const slotLabel = { weapon: '⚔️ 武器', armor: '🛡️ 防具', accessory: '💍 装飾' }[slot] || slot;
      $('equip-picker-title').textContent = `${slotLabel}を選ぶ`;
      this.render();
      show('equip-picker');
    },

    render() {
      const el = $('equip-picker-list');
      if (!el) return;
      const gs   = Game.getState().generals[this._gid];
      const equipped = gs?.equips[this._slot];
      const all  = Game.getState().inventory.equipment;
      // 対応タイプのみ
      const slotType = { weapon: 'weapon', armor: 'armor', accessory: 'accessory' }[this._slot];
      const items = all.filter(inst => {
        const ed = EQUIPMENT_DATA[inst.defId];
        return ed && ed.type === slotType;
      });

      el.innerHTML = '';

      // 「外す」行
      if (equipped) {
        const row = document.createElement('div');
        row.className = 'picker-row picker-unequip';
        row.innerHTML = `<span class="picker-emoji">✕</span><div class="picker-info"><div class="picker-name">外す</div></div>`;
        row.addEventListener('click', () => {
          Game.unequipItem(this._gid, this._slot);
          hide('equip-picker');
          GeneralsTab.showDetail(this._gid);
        });
        el.appendChild(row);
      }

      if (items.length === 0 && !equipped) {
        el.innerHTML += '<p class="empty-msg">この種類の装備がありません</p>';
        return;
      }

      items.forEach(inst => {
        const ed = EQUIPMENT_DATA[inst.defId];
        if (!ed) return;
        const isEquipped = inst.instanceId === equipped;
        const bonus = 1 + inst.enhanceLevel * 0.1;
        const statsText = Object.entries(ed.stats)
          .map(([k,v]) => `${k.toUpperCase()}+${Math.floor(v * bonus)}`).join(' ');
        const row = document.createElement('div');
        row.className = `picker-row rarity-${ed.rarity} ${isEquipped ? 'picker-active' : ''}`;
        row.innerHTML = `
          <span class="picker-emoji">${ed.emoji}</span>
          <div class="picker-info">
            <div class="picker-name">
              ${ed.name}
              ${inst.enhanceLevel > 0 ? `<span class="enhance-badge">+${inst.enhanceLevel}</span>` : ''}
              <span class="equip-rarity">${ed.rarity}</span>
            </div>
            <div class="equip-stats">${statsText}</div>
          </div>
          ${isEquipped ? '<span class="picker-check">✓</span>' : ''}`;
        row.addEventListener('click', () => {
          Game.equipItem(this._gid, this._slot, inst.instanceId);
          hide('equip-picker');
          GeneralsTab.showDetail(this._gid);
        });
        el.appendChild(row);
      });
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 図鑑タブ
  // ═══════════════════════════════════════════════════════════════════════════

  const ZukanTab = {
    update() {
      this.renderGenerals();
      this.renderStages();
      this.renderEquips();
    },

    renderGenerals() {
      const el = $('zukan-generals');
      if (!el) return;
      const state = Game.getState();
      const allDefs = Object.values(Game.getAllGeneralDefs());
      const total = allDefs.length;
      const owned = Object.keys(state.generals).length;
      $('zukan-count') && ($('zukan-count').textContent = `(${owned}/${total})`);

      el.innerHTML = '';
      const order = { SSR: 0, SR: 1, R: 2 };
      const sorted = allDefs.slice().sort((a, b) => order[a.rarity] - order[b.rarity]);

      sorted.forEach(def => {
        const gid     = def.id;
        const isOwned = !!state.generals[gid];
        const gs      = state.generals[gid];
        const card    = document.createElement('div');
        card.className = `zukan-card rarity-${def.rarity} ${isOwned ? '' : 'zukan-unknown'}`;
        const starsHtml = isOwned && gs.stars > 1 ? `<div class="zukan-stars">${'⭐'.repeat(gs.stars)}</div>` : '';
        card.innerHTML = `
          <div class="zukan-portrait" style="background:${isOwned ? def.gradient : 'var(--card)'}">
            <span style="font-size:26px;${isOwned ? '' : 'filter:grayscale(1) opacity(.3)'}">
              ${def.emoji}
            </span>
          </div>
          <div class="zukan-name">${isOwned ? def.name : '???'}</div>
          <span class="zukan-rarity badge-${def.rarity}">${def.rarity}</span>
          ${starsHtml}
          ${isOwned ? `<div class="zukan-lv">Lv.${gs.level}</div>` : ''}`;
        el.appendChild(card);
      });
    },

    renderStages() {
      const el = $('zukan-stages');
      if (!el) return;
      const cleared = Game.getState().progress.clearedStages;
      el.innerHTML = '';

      STAGES_DATA.forEach(chapter => {
        const total = chapter.stages.length;
        const done  = chapter.stages.filter(s => cleared.includes(s.id)).length;
        const pct   = Math.floor(done / total * 100);
        const div   = document.createElement('div');
        div.className = 'zukan-chapter';
        div.innerHTML = `
          <div class="zukan-chapter-header">
            <span class="zukan-ch-name">${chapter.name}</span>
            <span class="zukan-ch-count">${done}/${total}</span>
          </div>
          <div class="zukan-ch-bar-wrap">
            <div class="zukan-ch-bar" style="width:${pct}%"></div>
          </div>`;
        el.appendChild(div);
      });
    },

    renderEquips() {
      const el = $('zukan-equips');
      if (!el) return;
      const inventory = Game.getState().inventory.equipment;
      el.innerHTML = '';

      const order  = { SSR: 0, SR: 1, R: 2 };
      const sorted = Object.entries(EQUIPMENT_DATA).sort((a, b) =>
        order[a[1].rarity] - order[b[1].rarity]
      );

      sorted.forEach(([defId, ed]) => {
        const owned = inventory.some(i => i.defId === defId);
        const div   = document.createElement('div');
        div.className = `zukan-equip rarity-${ed.rarity} ${owned ? '' : 'zukan-unknown'}`;
        const statsText = Object.entries(ed.stats)
          .map(([k, v]) => `${k.toUpperCase()}+${v}`).join(' ');
        div.innerHTML = `
          <span class="equip-emoji" style="${owned ? '' : 'filter:grayscale(1) opacity(.3)'}">
            ${ed.emoji}
          </span>
          <div class="equip-info">
            <div class="equip-name">
              ${owned ? ed.name : '???'}
              <span class="equip-rarity">${ed.rarity}</span>
            </div>
            <div class="equip-stats">${owned ? statsText : '──'}</div>
          </div>`;
        el.appendChild(div);
      });
    }
  };

  // ─── イベントバインド ────────────────────────────────────────────────────

  function bindEvents() {
    // タブ
    document.querySelectorAll('.tab-btn').forEach(btn =>
      btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

    // プレイヤー名編集
    $('btn-edit-name')?.addEventListener('click', () => {
      const nameEl = $('player-name');
      if (!nameEl || nameEl.tagName === 'INPUT') return;  // 二重クリック防止
      const current = nameEl.textContent;
      const input = document.createElement('input');
      input.className = 'player-name-input';
      input.value     = current;
      input.maxLength = 12;
      nameEl.replaceWith(input);
      input.focus();
      input.select();
      let saved = false;
      const commit = () => {
        if (saved) return;
        saved = true;
        const newName = input.value.trim() || current;
        Game.setPlayerName(newName);
        const span = document.createElement('span');
        span.id = 'player-name';
        span.textContent = newName;
        input.replaceWith(span);
      };
      input.addEventListener('blur', commit, { once: true });
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter')  { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { input.value = current; input.blur(); }
      });
    });

    // 放置報酬受取
    $('collect-btn')?.addEventListener('click', () => {
      Game.collectIdleReward();
      hide('idle-reward');
      updateResourceBar();
      HomeTab.update();
    });

    // 保存
    $('save-btn')?.addEventListener('click', () => {
      if (Game.save()) showTemp('save-confirm', 2000);
    });

    // バトル結果閉じる
    $('result-close')?.addEventListener('click', () => {
      hide('battle-result');
      // ログトグルをリセット
      const tog = $('result-log-toggle');
      if (tog) { tog.classList.add('hidden'); tog.classList.remove('open'); }
    });

    // 章タブ（data-chapter / data-boss で判定）
    document.querySelectorAll('.chapter-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.boss) {
          AdventureTab.isBossTab = true;
          AdventureTab.renderBossSection();
        } else {
          AdventureTab.isBossTab = false;
          AdventureTab.currentChapter = parseInt(btn.dataset.chapter);
          AdventureTab.renderChapter();
        }
      });
    });

    // 副将詳細閉じる
    $('detail-close')?.addEventListener('click', () => hide('general-detail'));
    $('general-detail')?.addEventListener('click', e => {
      if (e.target === $('general-detail')) hide('general-detail');
    });

    // ガチャ
    $('draw-1-btn')?.addEventListener('click',  () => GachaTab.handleDraw(1));
    $('draw-10-btn')?.addEventListener('click', () => GachaTab.handleDraw(10));
    $('gacha-result-close')?.addEventListener('click', () => hide('gacha-result'));

    // 装備ピッカー
    $('equip-picker-close')?.addEventListener('click', () => hide('equip-picker'));
    $('equip-picker')?.addEventListener('click', e => {
      if (e.target === $('equip-picker')) hide('equip-picker');
    });

    // BGM — 初回クリックで起動して 🔇 表示、以降はトグル
    $('btn-bgm')?.addEventListener('click', () => {
      const btn = $('btn-bgm');
      if (!BGM.isRunning()) {
        BGM.start();
        btn.textContent = '🔇';
        btn.classList.remove('muted');
      } else {
        const muted = BGM.toggle();
        btn.textContent = muted ? '🔊' : '🔇';
        btn.classList.toggle('muted', muted);
      }
    });

    // ─── クラウドセーブ ──────────────────────────────────────────────────────
    $('btn-cloud-settings')?.addEventListener('click', () => CloudModal.open());
    $('cloud-close-btn')?.addEventListener('click',   () => hide('cloud-modal'));
    $('cloud-modal')?.addEventListener('click', e => {
      if (e.target === $('cloud-modal')) hide('cloud-modal');
    });
    $('cs-autostart-btn')?.addEventListener('click',      () => CloudModal.autoStart());
    $('firebase-config-apply')?.addEventListener('click', () => CloudModal.applyFirebaseConfig());
    $('cloud-save-btn')?.addEventListener('click',        () => CloudModal.saveGasConfig());
    $('cs-restore-btn')?.addEventListener('click',        () => CloudModal.restoreFromCode());
    $('cloud-pull-btn')?.addEventListener('click',        () => CloudModal.restoreFromCode());
    $('cs-advanced-toggle')?.addEventListener('click', () => {
      $('cs-advanced-form')?.classList.toggle('hidden');
    });
    $('cs-restore-toggle')?.addEventListener('click', () => {
      $('cs-restore-form')?.classList.toggle('hidden');
    });
    $('cs-copy-code')?.addEventListener('click', () => {
      const code = $('cs-player-code')?.textContent;
      if (code && code !== '----') {
        navigator.clipboard?.writeText(code).catch(() => {});
        CloudModal.setStatus('コードをコピーしました ✓', 'ok');
      }
    });

    // ─── LINE通知設定 ────────────────────────────────────────────────────────
    $('cs-line-toggle')?.addEventListener('click', () => {
      const form = $('cs-line-form');
      form?.classList.toggle('hidden');
      // 既存のUser IDがあれば入力欄に表示
      if (!form?.classList.contains('hidden') && _lineUserId) {
        const input = $('cs-line-userid');
        if (input) input.value = _lineUserId;
      }
    });
    $('cs-line-save-btn')?.addEventListener('click', async () => {
      const input  = $('cs-line-userid');
      const status = $('cs-line-status');
      const uid = (input?.value || '').trim();
      if (!uid.startsWith('U') || uid.length < 20) {
        if (status) { status.textContent = '⚠️ 正しいUser IDを入力してください（Uから始まる文字列）'; status.className = 'cs-line-status error'; }
        return;
      }
      _lineUserId = uid;
      localStorage.setItem(LINE_UID_KEY, uid);
      if (status) { status.textContent = '⏳ テスト通知を送信中...'; status.className = 'cs-line-status'; }
      // テスト通知を送って確認
      try {
        const r = await fetch(LINE_NOTIFY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: uid, event: 'custom', message: '✅ まほうの庭のLINE通知を設定しました！スタミナ満タン・日課リセット時にお知らせします🌸' }),
        });
        if (r.ok) {
          if (status) { status.textContent = '✅ 連携完了！LINEにテスト通知を送りました'; status.className = 'cs-line-status ok'; }
        } else {
          if (status) { status.textContent = '⚠️ 設定は保存しましたが通知送信に失敗しました'; status.className = 'cs-line-status error'; }
        }
      } catch(_) {
        if (status) { status.textContent = '✅ 設定を保存しました（オフライン）'; status.className = 'cs-line-status ok'; }
      }
    });

    // クラウドセーブバナー
    $('cloud-banner-setup')?.addEventListener('click', () => CloudModal.open());
    $('cloud-banner-dismiss')?.addEventListener('click', () => {
      $('cloud-save-banner')?.classList.add('hidden');
      sessionStorage.setItem('cloud_banner_dismissed', '1');
    });

    // 副将フィルターバー
    $('generals-search')?.addEventListener('input', e => {
      GeneralsTab._nameFilter = e.target.value;
      GeneralsTab.renderGrid();
    });
    document.querySelectorAll('.rarity-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        GeneralsTab._rarityFilter = btn.dataset.rarity;
        document.querySelectorAll('.rarity-filter-btn').forEach(b =>
          b.classList.toggle('active', b === btn));
        GeneralsTab.renderGrid();
      });
    });

    // 装備フィルターバー
    document.querySelectorAll('.equip-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        GachaTab._equipFilter = btn.dataset.type;
        document.querySelectorAll('.equip-filter-btn').forEach(b =>
          b.classList.toggle('active', b === btn));
        GachaTab.renderEquipInventory();
      });
    });
    $('equip-sort-sel')?.addEventListener('change', e => {
      GachaTab._equipSort = e.target.value;
      GachaTab.renderEquipInventory();
    });

  }

  // ─── ローディング ────────────────────────────────────────────────────────

  function runLoadingAnimation(cb) {
    const bar = $('loading-bar');
    if (!bar) { setTimeout(cb, 800); return; }
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 22 + 8;
      if (p >= 100) {
        p = 100; bar.style.width = '100%';
        clearInterval(iv); setTimeout(cb, 350);
      } else {
        bar.style.width = `${p}%`;
      }
    }, 110);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // クラウドセーブモーダル（シンプル版）
  // ═══════════════════════════════════════════════════════════════════════════

  const CloudModal = {

    open() {
      if ($('cloud-status')) { $('cloud-status').textContent = ''; $('cloud-status').className = 'cloud-status'; }
      const connected = Storage.isConfigured();
      $('cs-setup')?.classList.toggle('hidden', connected);
      $('cs-connected')?.classList.toggle('hidden', !connected);

      if (connected) {
        // 接続済み → 引き継ぎコード表示
        const playerId = Storage.getConfig().playerId ||
                         (typeof FirebaseAuth !== 'undefined' && FirebaseAuth.getUID?.()) || '---';
        const codeEl = $('cs-player-code');
        if (codeEl) codeEl.textContent = playerId.slice(0, 20);
        // GAS設定の既存値を反映
        $('cloud-endpoint') && ($('cloud-endpoint').value = Storage.getConfig().endpoint || '');
        $('cloud-playerid') && ($('cloud-playerid').value = Storage.getConfig().playerId || '');
      }
      show('cloud-modal');
    },

    // ワンタップ自動セットアップ（GASデフォルトエンドポイント + UUID）
    async autoStart() {
      this.setStatus('🔄 接続中…', 'info');
      const $btn = $('cs-autostart-btn');
      if ($btn) { $btn.disabled = true; $btn.textContent = '接続中…'; }

      try {
        // UUID形式の引き継ぎコードを生成
        let playerId = Storage.getConfig().playerId;
        if (!playerId) {
          playerId = _genUUID();
          Storage.setConfig(null, playerId, 'gas');
        }

        // 疎通テスト
        const endpoint = Storage.getConfig().endpoint;
        const ok = await Storage.ping(endpoint, 'gas');
        if (!ok) throw new Error('サーバーに接続できませんでした');

        // 即セーブ
        await Storage._doSaveCloudNow?.(Game.getState());
        Storage.save(Game.getState());

        $('btn-cloud-settings')?.classList.add('connected');
        this.setStatus('✅ 自動セーブを有効にしました！', 'ok');
        // パネル切替
        $('cs-setup')?.classList.add('hidden');
        $('cs-connected')?.classList.remove('hidden');
        const codeEl = $('cs-player-code');
        if (codeEl) codeEl.textContent = playerId.slice(0, 20);
      } catch(e) {
        this.setStatus(`接続失敗: ${e.message}`, 'err');
        if ($btn) { $btn.disabled = false; $btn.textContent = '✨ ワンタップで自動セーブを始める'; }
      }
    },

    // 上級者向け Firebase 設定
    async applyFirebaseConfig() {
      const jsonStr = $('firebase-config-json')?.value.trim();
      if (!jsonStr) { this.setStatus('設定コードを入力してください', 'err'); return; }
      let cfg;
      try { cfg = JSON.parse(jsonStr.replace(/^const\s+\w+\s*=\s*/, '').replace(/;$/, '')); }
      catch(_) { this.setStatus('JSONの形式が正しくありません', 'err'); return; }
      if (!cfg.apiKey || !cfg.databaseURL) {
        this.setStatus('apiKey と databaseURL が必要です', 'err'); return;
      }
      this.setStatus('🔌 Firebase に接続中…', 'info');
      try {
        FirebaseAuth.saveConfig(cfg);
        const ok = await FirebaseAuth.init(cfg);
        if (!ok) { this.setStatus('Firebase の初期化に失敗しました', 'err'); return; }
        await FirebaseAuth.signInAnonymously();
        Storage.setConfig(null, FirebaseAuth.getUID(), 'firebase');
        this.setStatus('✓ Firebase 接続成功！自動保存されます', 'ok');
        setTimeout(() => Storage.save(Game.getState()), 500);
        $('btn-cloud-settings')?.classList.add('connected');
        $('cs-setup')?.classList.add('hidden');
        $('cs-connected')?.classList.remove('hidden');
        const codeEl = $('cs-player-code');
        if (codeEl) codeEl.textContent = (FirebaseAuth.getUID() || '').slice(0,20);
      } catch(e) { this.setStatus(`エラー: ${e.message}`, 'err'); }
    },

    // GAS手動設定
    saveGasConfig() {
      const endpoint = $('cloud-endpoint')?.value.trim();
      const playerId = $('cloud-playerid')?.value.trim();
      if (!endpoint || !playerId) { this.setStatus('URLとIDを入力してください', 'err'); return; }
      Storage.setConfig(endpoint, playerId, 'gas');
      $('btn-cloud-settings')?.classList.add('connected');
      this.setStatus('✓ GAS設定を保存しました', 'ok');
      Storage.save(Game.getState());
    },

    // 別端末から引き継ぎ
    async restoreFromCode() {
      const code = $('cs-restore-input')?.value.trim();
      if (!code) { this.setStatus('引き継ぎコードを入力してください', 'err'); return; }
      this.setStatus('📥 読み込み中…', 'info');
      Storage.setConfig(null, code, 'gas');
      const data = await Storage.pullFromCloud();
      if (data) {
        Game.init(data);
        updateResourceBar();
        HomeTab.update();
        hide('cloud-modal');
        this.setStatus('✅ データを読み込みました！', 'ok');
        switchTab('home');
      } else {
        this.setStatus('コードが見つかりませんでした。確認してください。', 'err');
      }
    },

    setStatus(msg, type = '') {
      const el = $('cloud-status');
      if (!el) return;
      el.textContent = msg;
      el.className = `cloud-status ${type}`;
    }
  };

  // UUID生成ユーティリティ
  function _genUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // ─── クラウド同期ステータスインジケーター ─────────────────────────────────

  function initSyncIndicator() {
    const btn = $('btn-cloud-settings');
    if (!btn) return;

    // ステータスドットを挿入
    const dot = document.createElement('span');
    dot.id = 'cloud-sync-dot';
    dot.className = 'cloud-sync-dot';
    btn.appendChild(dot);

    Storage.onSyncStatusChange(status => {
      dot.className = `cloud-sync-dot dot-${status}`;
      switch (status) {
        case 'syncing': dot.title = '同期中…'; break;
        case 'ok':      dot.title = '同期完了 ✓'; break;
        case 'retry':   dot.title = 'リトライ中…'; break;
        case 'error':   dot.title = '同期失敗 ⚠'; break;
        default:        dot.title = ''; break;
      }
    });
  }

  // ─── スワイプタブ切替 ─────────────────────────────────────────────────────

  function setupSwipeTabs() {
    const content = document.querySelector('.tab-content');
    if (!content || !('ontouchstart' in window)) return;

    const TABS = ['home', 'adventure', 'generals', 'gacha', 'zukan'];
    let startX = 0, startY = 0;

    // ヒント表示用（1回だけ）
    let hintShown = false;
    function showSwipeHint(label) {
      if (hintShown) return;
      hintShown = true;
      let hint = document.getElementById('swipe-hint');
      if (!hint) {
        hint = document.createElement('div');
        hint.id = 'swipe-hint';
        hint.className = 'swipe-hint';
        document.body.appendChild(hint);
      }
      hint.textContent = label;
      hint.classList.add('show');
      setTimeout(() => hint.classList.remove('show'), 900);
    }

    content.addEventListener('touchstart', e => {
      startX = e.changedTouches[0].clientX;
      startY = e.changedTouches[0].clientY;
    }, { passive: true });

    content.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      // 縦スクロールが横より大きければ無視
      if (Math.abs(dy) > Math.abs(dx) * 0.8) return;
      if (Math.abs(dx) < 55) return;

      const curBtn = document.querySelector('.tab-btn.active');
      const curTab = curBtn?.dataset.tab;
      const idx    = TABS.indexOf(curTab);
      if (dx < 0 && idx < TABS.length - 1) {
        switchTab(TABS[idx + 1]);
        showSwipeHint('→ ' + TABS[idx + 1]);
      } else if (dx > 0 && idx > 0) {
        switchTab(TABS[idx - 1]);
        showSwipeHint('← ' + TABS[idx - 1]);
      }
    }, { passive: true });
  }

  // ─── 自動保存設定 ────────────────────────────────────────────────────────

  function setupAutoSave() {
    // 30秒ごとに定期保存
    setInterval(() => {
      if (Game.getState()) Game.save();
    }, 30000);

    // タブが隠れた / フォーカス外れたら即保存
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && Game.getState()) {
        Game.save();
      }
    });

    // ページを閉じる直前に同期保存
    window.addEventListener('beforeunload', () => {
      if (Game.getState()) {
        // ローカル保存のみ（クラウドは非同期なので間に合わない可能性あり）
        const state = Game.getState();
        try { localStorage.setItem('magic_garden_v2', JSON.stringify(state)); } catch(_) {}
      }
    });

    // スマホでのバックグラウンド移行（pagehide）
    window.addEventListener('pagehide', () => {
      if (Game.getState()) Game.save();
    });
  }

  // ─── 起動 ────────────────────────────────────────────────────────────────

  function start() {
    const idleEarned = Game.init(Storage.load());
    bindEvents();

    runLoadingAnimation(() => {
      $('screen-loading')?.classList.remove('active');
      $('screen-game')?.classList.add('active');

      updateResourceBar();
      updatePlayerName();
      HomeTab.update();

      if (Storage.isConfigured()) {
        $('btn-cloud-settings')?.classList.add('connected');
      }

      BGM.init();  // 最初のクリックで自動起動

      // 同期インジケーター & 自動保存 & スワイプタブ
      initSyncIndicator();
      setupAutoSave();
      setupSwipeTabs();

      // Firebase Auto-Init（設定済みの場合）
      FirebaseAuth.autoInit().then(ok => {
        if (ok) {
          // 匿名サインインされていなければ自動サインイン
          FirebaseAuth.onAuthChange(async user => {
            if (ok && !user) {
              try { await FirebaseAuth.signInAnonymously(); } catch(_) {}
            }
            // Auth状態変化 → sync indicator 更新
            if (user) $('btn-cloud-settings')?.classList.add('connected');
          });
        }
      });

      if (idleEarned > 0) {
        $('idle-reward-text').textContent = `🪙 ${idleEarned.toLocaleString()} コインを集めておいたよ！`;
        show('idle-reward');
      }
    });
  }

  return { start };
})();

document.addEventListener('DOMContentLoaded', UI.start);
