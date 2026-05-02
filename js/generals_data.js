/**
 * generals_data.js — 副将マスタデータ
 * キャラクターの静的定義。保存データには含まれない。
 * imagePath: assets/characters/{id}.png を置くと自動的にAI生成画像に差し替わる。
 */
const GENERALS_DATA = {

  // ─── LR (Legendary Rare) ──────────────────────────────────────────────────

  arcana: {
    id: 'arcana',
    name: '天帝アルカナ',
    title: '創造神の化身',
    rarity: 'LR',
    type: 'attacker',
    typeName: '攻撃',
    element: '光',
    emoji: '⚜️',
    gradient: 'linear-gradient(135deg, #fff 0%, #ffd700 15%, #ff69b4 30%, #87cefa 45%, #90ee90 60%, #ffd700 75%, #ff69b4 90%, #fff 100%)',
    borderColor: '#ff00aa',
    description: '世界を創りし神の化身。無限の光と神力を操り、その存在だけで戦場を塗り替える伝説を超えた存在。',
    baseStats: { hp: 25000, atk: 2200, def: 900, spd: 148 },
    statGrowth: { hp: 600, atk: 60, def: 22, spd: 1.0 },
    skills: [
      { name: '創世光波',  sp: 4, type: 'damage_single', power: 5.5, description: '神の力を一点に集中させた究極の一撃' },
      { name: '天地創造',  sp: 15, type: 'damage_all',   power: 3.5, description: '全てを創り直すほどの光で全体を蹂躙' }
    ]
  },

  // ─── MR (Mythic Rare) ─────────────────────────────────────────────────────

  nyx: {
    id: 'nyx',
    name: '混沌ニュクス',
    title: '虚空の支配者',
    rarity: 'MR',
    type: 'assassin',
    typeName: '刺客',
    element: '闇',
    emoji: '🌌',
    gradient: 'linear-gradient(160deg, #060010 0%, #3d0066 40%, #6600aa 70%, #9900dd 100%)',
    borderColor: '#cc00ff',
    description: '宇宙の混沌そのものが人の形をとった存在。触れるものを全て虚無に返す、太古からの神。',
    baseStats: { hp: 17000, atk: 1950, def: 680, spd: 170 },
    statGrowth: { hp: 420, atk: 55, def: 18, spd: 1.5 },
    skills: [
      { name: '虚空葬',   sp: 3, type: 'damage_single', power: 4.5, description: '存在を虚無に葬る必殺の一撃' },
      { name: '混沌解放', sp: 12, type: 'damage_all',   power: 3.0, description: '混沌の力を解き放ち全てを蹂躙する' }
    ]
  },

  // ─── UR (Ultra Rare) ──────────────────────────────────────────────────────

  fafnir: {
    id: 'fafnir',
    name: '竜王ファフナー',
    title: '原初の竜神',
    rarity: 'UR',
    type: 'attacker',
    typeName: '攻撃',
    element: '炎',
    emoji: '🐉',
    gradient: 'linear-gradient(160deg, #1a0000 0%, #7b0000 40%, #c62828 70%, #ff8f00 100%)',
    borderColor: '#ff6600',
    description: '太古より眠る最古の竜神。金色の鱗と業火の息吹で全てを焼き尽くす伝説の存在。',
    baseStats: { hp: 12500, atk: 1380, def: 550, spd: 130 },
    statGrowth: { hp: 320, atk: 42, def: 15, spd: 0.8 },
    skills: [
      { name: '竜炎爪',   sp: 3, type: 'damage_single', power: 3.8, description: '灼熱の爪で単体を引き裂く' },
      { name: '覇竜烈火', sp: 9, type: 'damage_all',    power: 2.4, description: '竜王の咆哮と共に業火が全体を呑む' }
    ]
  },

  // ─── SSR ──────────────────────────────────────────────────────────────────

  seraphina: {
    id: 'seraphina',
    name: 'セラフィナ',
    title: '星の守護者',
    rarity: 'SSR',
    type: 'attacker',
    typeName: '攻撃',
    element: '光',
    emoji: '✨',
    gradient: 'linear-gradient(160deg, #fff9e6 0%, #ffe082 60%, #ffca28 100%)',
    borderColor: '#ffd700',
    description: '星の加護を受けし聖剣士。その剣は光を宿し、闇を祓う。',
    baseStats: { hp: 8000, atk: 800, def: 300, spd: 120 },
    statGrowth: { hp: 200, atk: 25, def: 8,  spd: 0.5 },
    skills: [
      { name: '星光斬',   sp: 3, type: 'damage_single', power: 2.5, description: '単体に強烈な光属性ダメージ' },
      { name: '星降る夜', sp: 8, type: 'damage_all',    power: 1.2, description: '全体に光の雨を降らせる' }
    ]
  },

  shadow: {
    id: 'shadow',
    name: 'シャドウ',
    title: '闇を刻む者',
    rarity: 'SSR',
    type: 'assassin',
    typeName: '刺客',
    element: '闇',
    emoji: '🌑',
    gradient: 'linear-gradient(160deg, #f3e5f5 0%, #ce93d8 60%, #ab47bc 100%)',
    borderColor: '#9c27b0',
    description: '闇から生まれた暗殺者。誰も気づかぬうちに仕留める。',
    baseStats: { hp: 6000, atk: 950, def: 200, spd: 160 },
    statGrowth: { hp: 150, atk: 30, def: 5,  spd: 1.0 },
    skills: [
      { name: '暗殺刃',  sp: 2, type: 'damage_single', power: 3.2, description: '先制して単体に致命的ダメージ' },
      { name: '夜霧',    sp: 7, type: 'damage_all',    power: 1.0, description: '霧に紛れて全体を奇襲する' }
    ]
  },

  sylphia: {
    id: 'sylphia',
    name: '氷姫シルフィア',
    title: '永久氷原の姫君',
    rarity: 'SSR',
    type: 'mage',
    typeName: '魔法',
    element: '水',
    emoji: '❄️',
    gradient: 'linear-gradient(160deg, #e3f2fd 0%, #b3e5fc 45%, #80deea 75%, #e0f7fa 100%)',
    borderColor: '#26c6da',
    description: '永久氷原に君臨する氷の姫君。月明かりの下で踊る姿は息を呑む美しさ。凍てつく魔法で全てを静止させる。',
    baseStats: { hp: 7200, atk: 900, def: 350, spd: 140 },
    statGrowth: { hp: 180, atk: 28, def: 10, spd: 0.7 },
    skills: [
      { name: '氷結剣',   sp: 3, type: 'damage_single', power: 3.0, description: '氷の刃で単体を凍てつかせる' },
      { name: '吹雪の舞', sp: 8, type: 'damage_all',    power: 1.6, description: '吹雪の舞で全体を凍り付かせる' }
    ]
  },

  aquaria: {
    id: 'aquaria',
    name: 'アクアリア',
    title: '癒しの水精',
    rarity: 'SSR',
    type: 'healer',
    typeName: '支援',
    element: '水',
    emoji: '💧',
    gradient: 'linear-gradient(160deg, #e3f2fd 0%, #90caf9 60%, #42a5f5 100%)',
    borderColor: '#2196f3',
    description: '水の精霊と契約した治癒術士。仲間の傷を優しく癒す。',
    baseStats: { hp: 7500, atk: 500, def: 420, spd: 100 },
    statGrowth: { hp: 250, atk: 15, def: 13, spd: 0.3 },
    skills: [
      { name: '水の加護',   sp: 3, type: 'heal_single', power: 1.8, description: 'HPが最も低い仲間を大きく回復' },
      { name: '聖水の雨', sp: 7, type: 'heal_all',    power: 0.9, description: '全体のHPを回復する' }
    ]
  },

  // ─── SR ───────────────────────────────────────────────────────────────────

  flame: {
    id: 'flame',
    name: 'フレイム',
    title: '炎の剣士',
    rarity: 'SR',
    type: 'attacker',
    typeName: '攻撃',
    element: '炎',
    emoji: '🔥',
    gradient: 'linear-gradient(160deg, #fff3e0 0%, #ffb74d 60%, #ff7043 100%)',
    borderColor: '#ff5722',
    description: '炎を操る若き剣士。情熱と勢いで敵を圧倒する。',
    baseStats: { hp: 5500, atk: 650, def: 250, spd: 110 },
    statGrowth: { hp: 140, atk: 20, def: 7,  spd: 0.4 },
    skills: [
      { name: '炎剣',    sp: 3, type: 'damage_single', power: 2.0, description: '炎をまとった強力な一撃' },
      { name: '爆炎斬', sp: 7, type: 'damage_all',    power: 0.9, description: '爆発的な炎で全体攻撃' }
    ]
  },

  terra: {
    id: 'terra',
    name: 'テラ',
    title: '大地の守護者',
    rarity: 'SR',
    type: 'tank',
    typeName: '防御',
    element: '土',
    emoji: '🌿',
    gradient: 'linear-gradient(160deg, #e8f5e9 0%, #a5d6a7 60%, #4caf50 100%)',
    borderColor: '#4caf50',
    description: '大地の力を纏う堅牢な守護者。仲間の盾となる。',
    baseStats: { hp: 14000, atk: 400, def: 600, spd: 70 },
    statGrowth: { hp:  380, atk: 12, def: 18, spd: 0.2 },
    skills: [
      { name: '大地の盾', sp: 4, type: 'shield_all',    power: 0.5, description: '全体にダメージを吸収するシールドを付与' },
      { name: '岩砕き',  sp: 6, type: 'damage_single', power: 1.8, description: '防御力を無視する強撃' }
    ]
  },

  windel: {
    id: 'windel',
    name: 'ウィンデル',
    title: '疾風の踊り子',
    rarity: 'SR',
    type: 'speedster',
    typeName: '速攻',
    element: '風',
    emoji: '🌀',
    gradient: 'linear-gradient(160deg, #e0f7fa 0%, #80deea 60%, #00bcd4 100%)',
    borderColor: '#00bcd4',
    description: '風と共に舞う踊り子。素早い連撃が得意。',
    baseStats: { hp: 5000, atk: 600, def: 200, spd: 185 },
    statGrowth: { hp: 120, atk: 18, def: 6,  spd: 1.5 },
    skills: [
      { name: '旋風連斬', sp: 2, type: 'damage_multi',  power: 0.8, hits: 3, description: '3回連続攻撃を繰り出す' },
      { name: '嵐の踏込', sp: 6, type: 'damage_single', power: 2.2, description: '全力で切り込む一撃' }
    ]
  },

  // ─── R ────────────────────────────────────────────────────────────────────

  arca: {
    id: 'arca',
    name: 'アルカ',
    title: '見習い魔術士',
    rarity: 'R',
    type: 'mage',
    typeName: '魔法',
    element: '光',
    emoji: '⭐',
    gradient: 'linear-gradient(160deg, #fff8e1 0%, #ffe082 60%, #ffc107 100%)',
    borderColor: '#ffc107',
    description: '魔術の修行中の少女。負けず嫌いで向上心が強い。',
    baseStats: { hp: 4000, atk: 520, def: 180, spd: 95 },
    statGrowth: { hp: 100, atk: 16, def: 5,  spd: 0.3 },
    skills: [
      { name: '魔法の矢', sp: 2, type: 'damage_single', power: 1.6, description: '魔法弾で攻撃する' },
      { name: '光の渦',  sp: 6, type: 'damage_all',    power: 0.7, description: '光の渦で全体攻撃' }
    ]
  },

  rockus: {
    id: 'rockus',
    name: 'ロックス',
    title: '岩鎧の戦士',
    rarity: 'R',
    type: 'tank',
    typeName: '防御',
    element: '土',
    emoji: '🪨',
    gradient: 'linear-gradient(160deg, #efebe9 0%, #bcaaa4 60%, #8d6e63 100%)',
    borderColor: '#795548',
    description: '岩のような体を持つ頑丈な戦士。頼りになる。',
    baseStats: { hp: 10000, atk: 350, def: 520, spd: 60 },
    statGrowth: { hp: 280,  atk: 10, def: 15, spd: 0.1 },
    skills: [
      { name: '鉄壁',   sp: 3, type: 'defense_buff',  power: 0.4, description: '自身の防御力を一時的に上げる' },
      { name: '地割れ', sp: 7, type: 'damage_all',    power: 0.8, description: '大地を揺らして全体攻撃' }
    ]
  },

  // ─── 追加SSR ──────────────────────────────────────────────────────────────

  lucifer: {
    id: 'lucifer',
    name: 'ルシファー',
    title: '堕天の魔王',
    rarity: 'SSR',
    type: 'mage',
    typeName: '魔法',
    element: '闇',
    emoji: '😈',
    gradient: 'linear-gradient(160deg, #212121 0%, #7b1fa2 60%, #4a148c 100%)',
    borderColor: '#9c27b0',
    description: '天界から堕ちし魔王。絶大な闇魔法で世界を塗り替える。',
    baseStats: { hp: 7000, atk: 1000, def: 250, spd: 105 },
    statGrowth: { hp: 180, atk: 32,  def: 7,  spd: 0.4 },
    skills: [
      { name: '暗黒魔弾',   sp: 3, type: 'damage_single', power: 2.8, description: '闇の魔弾で単体に壊滅的ダメージ' },
      { name: '魔王の咆哮', sp: 9, type: 'damage_all',    power: 1.5, description: '全体を圧倒する闇のブレス' }
    ]
  },

  // ─── 追加SR ───────────────────────────────────────────────────────────────

  aria: {
    id: 'aria',
    name: 'アリア',
    title: '炎の歌姫',
    rarity: 'SR',
    type: 'healer',
    typeName: '支援',
    element: '炎',
    emoji: '🎵',
    gradient: 'linear-gradient(160deg, #fce4ec 0%, #f48fb1 60%, #e91e63 100%)',
    borderColor: '#e91e63',
    description: '炎の歌声で仲間を鼓舞する歌姫。癒しと攻撃を両立する。',
    baseStats: { hp: 6000, atk: 550, def: 300, spd: 115 },
    statGrowth: { hp: 160, atk: 17, def: 9,  spd: 0.5 },
    skills: [
      { name: '炎の讃歌',   sp: 4, type: 'heal_all',      power: 0.7, description: '歌声で全体のHPを回復' },
      { name: 'バーニング♪', sp: 7, type: 'damage_all',   power: 1.0, description: '炎のメロディーで全体攻撃' }
    ]
  },

  // ─── 追加R ────────────────────────────────────────────────────────────────

  blaze: {
    id: 'blaze',
    name: 'ブレイズ',
    title: '爆炎の少年',
    rarity: 'R',
    type: 'speedster',
    typeName: '速攻',
    element: '炎',
    emoji: '💥',
    gradient: 'linear-gradient(160deg, #fff8e1 0%, #ffcc02 60%, #ff6f00 100%)',
    borderColor: '#ff6f00',
    description: '炎を身にまとって突撃する無鉄砲な少年。速さが命。',
    baseStats: { hp: 3800, atk: 480, def: 170, spd: 175 },
    statGrowth: { hp: 95,  atk: 15, def: 5,  spd: 1.2 },
    skills: [
      { name: '炎突',   sp: 2, type: 'damage_single', power: 1.7, description: '炎をまとって突撃する' },
      { name: '烈炎斬', sp: 5, type: 'damage_multi',  power: 0.7, hits: 2, description: '2連続の炎斬り' }
    ]
  },

  frost: {
    id: 'frost',
    name: 'フロスト',
    title: '氷壁の衛士',
    rarity: 'R',
    type: 'tank',
    typeName: '防御',
    element: '水',
    emoji: '❄️',
    gradient: 'linear-gradient(160deg, #e3f2fd 0%, #b3e5fc 60%, #0288d1 100%)',
    borderColor: '#0288d1',
    description: '氷の鎧を纏う冷静な衛士。敵の攻撃を全て受け止める。',
    baseStats: { hp: 9000, atk: 320, def: 580, spd: 65 },
    statGrowth: { hp: 260, atk: 9,  def: 17, spd: 0.1 },
    skills: [
      { name: '氷盾',   sp: 3, type: 'shield_all',    power: 0.45, description: '全体に氷のシールドを付与' },
      { name: '吹雪',   sp: 6, type: 'damage_all',    power: 0.75, description: '凍てつく吹雪で全体攻撃' }
    ]
  },

  // ─── NEW SSR ──────────────────────────────────────────────────────────────

  luna: {
    id: 'luna',
    name: 'ルナ',
    title: '月夜の魔女',
    rarity: 'SSR',
    type: 'mage',
    typeName: '魔法',
    element: '月',
    emoji: '🌙',
    gradient: 'linear-gradient(160deg, #e8eaf6 0%, #b39ddb 60%, #4527a0 100%)',
    borderColor: '#7c4dff',
    description: '月の加護を受けた銀髪の魔女。うさぎ耳のアクセサリーが愛らしいが、その魔力は計り知れない。',
    baseStats: { hp: 7200, atk: 920, def: 280, spd: 115 },
    statGrowth: { hp: 185, atk: 29, def: 8, spd: 0.45 },
    skills: [
      { name: '月光魔弾',   sp: 3, type: 'damage_single', power: 2.7, description: '月光の魔力を込めた圧倒的な一撃' },
      { name: '星の海',     sp: 8, type: 'damage_all',    power: 1.3, description: '無数の星光が敵全体を包み込む' }
    ]
  },

  volkhan: {
    id: 'volkhan',
    name: 'ヴォルカン',
    title: '炎神の化身',
    rarity: 'SSR',
    type: 'attacker',
    typeName: '攻撃',
    element: '炎',
    emoji: '🔱',
    gradient: 'linear-gradient(160deg, #1a0000 0%, #b71c1c 55%, #ff6d00 100%)',
    borderColor: '#ff3d00',
    description: '炎の神が人に降臨した姿。逆立つ銀髪に炎が宿り、圧倒的な威圧感を放つ最強の戦士。',
    baseStats: { hp: 6800, atk: 1050, def: 240, spd: 130 },
    statGrowth: { hp: 170, atk: 34, def: 6, spd: 0.6 },
    skills: [
      { name: '神炎の刃',   sp: 3, type: 'damage_single', power: 3.0, description: '炎神の力を込めた絶対の一撃' },
      { name: '炎神の怒り', sp: 9, type: 'damage_all',    power: 1.6, description: '全てを焼き尽くす神の炎' }
    ]
  },

  // ─── NEW SR ───────────────────────────────────────────────────────────────

  coral: {
    id: 'coral',
    name: 'コーラル',
    title: '珊瑚の人魚姫',
    rarity: 'SR',
    type: 'healer',
    typeName: '支援',
    element: '水',
    emoji: '🐚',
    gradient: 'linear-gradient(160deg, #e0f7fa 0%, #f48fb1 50%, #26c6da 100%)',
    borderColor: '#00acc1',
    description: '珊瑚色の髪を持つ愛らしい人魚姫。笑顔で仲間を癒す天使のような存在。',
    baseStats: { hp: 6500, atk: 480, def: 380, spd: 105 },
    statGrowth: { hp: 170, atk: 14, def: 12, spd: 0.4 },
    skills: [
      { name: '珊瑚の癒し', sp: 3, type: 'heal_single', power: 2.0, description: 'HPが最も低い仲間をたっぷり回復' },
      { name: '人魚の歌',   sp: 7, type: 'heal_all',    power: 1.0, description: '歌声で全体のHPをじんわり回復' }
    ]
  },

  zephyr: {
    id: 'zephyr',
    name: 'ゼファー',
    title: '嵐の剣豪',
    rarity: 'SR',
    type: 'assassin',
    typeName: '刺客',
    element: '風',
    emoji: '⚡',
    gradient: 'linear-gradient(160deg, #0d1117 0%, #1565c0 60%, #90a4ae 100%)',
    borderColor: '#546e7a',
    description: '嵐を纏う無口の剣豪。黒髪に青い眼帯、寡黙な実力者が持つオーラは他を圧倒する。',
    baseStats: { hp: 5800, atk: 780, def: 220, spd: 170 },
    statGrowth: { hp: 145, atk: 25, def: 6, spd: 1.3 },
    skills: [
      { name: '烈風刃',   sp: 2, type: 'damage_single', power: 2.8, description: '嵐の速度で繰り出す必殺の一刀' },
      { name: '嵐の連撃', sp: 6, type: 'damage_multi',  power: 0.9, hits: 3, description: '嵐のごとく3連続斬り' }
    ]
  },

  popo: {
    id: 'popo',
    name: 'ポポ',
    title: 'もふもふ魔法使い',
    rarity: 'SR',
    type: 'support',
    typeName: '支援',
    element: '光',
    emoji: '🧸',
    gradient: 'linear-gradient(160deg, #fff9c4 0%, #ffccbc 60%, #f8bbd0 100%)',
    borderColor: '#f06292',
    description: '大きなもふもふ帽子をかぶったちびっ子魔法使い。全員を元気にする応援魔法が得意。',
    baseStats: { hp: 5500, atk: 420, def: 350, spd: 120 },
    statGrowth: { hp: 145, atk: 13, def: 11, spd: 0.5 },
    skills: [
      { name: 'もふもふパワー', sp: 3, type: 'atk_buff', power: 0.4, description: 'もふもふの魔力で仲間の攻撃を上げる' },
      { name: 'みんなへのエール', sp: 6, type: 'heal_all', power: 0.85, description: '全員に元気をわけてあげる' }
    ]
  },

  // ─── NEW R ────────────────────────────────────────────────────────────────

  lily: {
    id: 'lily',
    name: 'リリィ',
    title: '花園の妖精',
    rarity: 'R',
    type: 'healer',
    typeName: '支援',
    element: '光',
    emoji: '🌸',
    gradient: 'linear-gradient(160deg, #fce4ec 0%, #c8e6c9 60%, #f9fbe7 100%)',
    borderColor: '#66bb6a',
    description: '花の冠をつけた小さな妖精。小さな翼でひらひら飛びながら仲間を癒してくれる。',
    baseStats: { hp: 4200, atk: 380, def: 220, spd: 150 },
    statGrowth: { hp: 105, atk: 12, def: 6, spd: 0.8 },
    skills: [
      { name: '花びら癒し', sp: 2, type: 'heal_single', power: 1.5, description: '花びらで傷をふわっと癒す' },
      { name: '花吹雪',     sp: 5, type: 'damage_all',  power: 0.65, description: '花びらの渦で全体攻撃' }
    ]
  },

  choco: {
    id: 'choco',
    name: 'チョコ',
    title: 'お菓子の魔法使い',
    rarity: 'R',
    type: 'mage',
    typeName: '魔法',
    element: '炎',
    emoji: '🍫',
    gradient: 'linear-gradient(160deg, #4e342e 0%, #a1887f 60%, #f8bbd0 100%)',
    borderColor: '#8d6e63',
    description: 'キャンディの杖を持つ超キュートな魔法使い。お菓子に見せかけた爆発魔法が得意。',
    baseStats: { hp: 3900, atk: 510, def: 160, spd: 115 },
    statGrowth: { hp: 98, atk: 16, def: 5, spd: 0.4 },
    skills: [
      { name: 'チョコ魔法',   sp: 2, type: 'damage_single', power: 1.8, description: 'チョコレート色の魔弾で攻撃' },
      { name: 'お菓子の爆弾', sp: 5, type: 'damage_all',    power: 0.7, description: 'ポップな爆弾で全体攻撃' }
    ]
  },

  galdo: {
    id: 'galdo',
    name: 'ガルド',
    title: '鋼鉄の騎士',
    rarity: 'R',
    type: 'tank',
    typeName: '防御',
    element: '土',
    emoji: '⚙️',
    gradient: 'linear-gradient(160deg, #263238 0%, #546e7a 60%, #b0bec5 100%)',
    borderColor: '#455a64',
    description: '全身を鋼鉄の鎧で覆った無敵の騎士。無口でクールな佇まいが仲間の信頼を集める。',
    baseStats: { hp: 10500, atk: 360, def: 560, spd: 55 },
    statGrowth: { hp: 295, atk: 11, def: 16, spd: 0.1 },
    skills: [
      { name: '鋼の意志', sp: 3, type: 'defense_buff',      power: 0.4, description: '鋼鉄の鎧を展開し防御力を大幅強化' },
      { name: '鉄槌',     sp: 6, type: 'damage_single', power: 2.0, description: '巨大な鉄の拳を叩き込む' }
    ]
  }
};

/**
 * ガチャ排出テーブル
 * weight が高いほど排出されやすい
 * 合計 weight = 178
 * LR: 1/178 ≈ 0.6%  MR: 2/178 ≈ 1.1%  UR: 3/178 ≈ 1.7%
 * SSR: 26/178 ≈ 14.6%  SR: 56/178 ≈ 31.5%  R: 90/178 ≈ 50.6%
 */
const GACHA_POOL = [
  // LR (最高レア, 合計~0.6%)
  { id: 'arcana',    weight: 1 },
  // MR (合計~1.1%)
  { id: 'nyx',       weight: 2 },
  // UR (合計~1.7%)
  { id: 'fafnir',    weight: 3 },
  // SSR (各3〜4, 合計~14.6%)
  { id: 'seraphina', weight: 4 },
  { id: 'shadow',    weight: 4 },
  { id: 'aquaria',   weight: 4 },
  { id: 'lucifer',   weight: 4 },
  { id: 'luna',      weight: 3 },
  { id: 'volkhan',   weight: 3 },
  { id: 'sylphia',   weight: 4 },
  // SR (各7〜8, 合計~31.5%)
  { id: 'flame',     weight: 8 },
  { id: 'terra',     weight: 8 },
  { id: 'windel',    weight: 8 },
  { id: 'aria',      weight: 8 },
  { id: 'coral',     weight: 8 },
  { id: 'zephyr',    weight: 8 },
  { id: 'popo',      weight: 8 },
  // R (各10〜13, 合計~50.6%)
  { id: 'arca',      weight: 13 },
  { id: 'rockus',    weight: 13 },
  { id: 'blaze',     weight: 13 },
  { id: 'frost',     weight: 13 },
  { id: 'lily',      weight: 12 },
  { id: 'choco',     weight: 13 },
  { id: 'galdo',     weight: 13 }
];
