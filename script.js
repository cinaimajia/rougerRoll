const resultEl = document.getElementById('result');
const attackButtonEl = document.getElementById('attackButton');
const defendButtonEl = document.getElementById('defendButton');
const skillButtonEl = document.getElementById('skillButton');
const skillSubmenuEl = document.getElementById('skillSubmenu');
const restartButtonEl = document.getElementById('restartButton');
const roundCountEl = document.getElementById('roundCount');
const playerHpEl = document.getElementById('playerHp');
const bossHpEl = document.getElementById('bossHp');
const bossMaxHpEl = document.getElementById('bossMaxHp');
const playerHpFillEl = document.getElementById('playerHpFill');
const bossHpFillEl = document.getElementById('bossHpFill');
const playerCardEl = document.getElementById('playerCard');
const bossCardEl = document.getElementById('bossCard');
const playerNameEl = document.getElementById('playerName');
const bossNameEl = document.getElementById('bossName');
const playerArtEl = document.getElementById('playerArt');
const bossArtEl = document.getElementById('bossArt');
const playerDiceEl = document.getElementById('playerDice');
const bossDiceEl = document.getElementById('bossDice');
const playerRollValueEl = document.getElementById('playerRollValue');
const bossRollValueEl = document.getElementById('bossRollValue');
const bossDiceMaxEl = document.getElementById('bossDiceMax');
const helpButtonEl = document.getElementById('helpButton');
const rulesDialogEl = document.getElementById('rulesDialog');
const closeRulesButtonEl = document.getElementById('closeRulesButton');
const logButtonEl = document.getElementById('logButton');
const battleLogDialogEl = document.getElementById('battleLogDialog');
const battleLogListEl = document.getElementById('battleLogList');
const closeBattleLogButtonEl = document.getElementById('closeBattleLogButton');
const skillGuideListEl = document.getElementById('skillGuideList');
const boonDialogEl = document.getElementById('boonDialog');
const boonListEl = document.getElementById('boonList');
const forgetSkillDialogEl = document.getElementById('forgetSkillDialog');
const forgetSkillListEl = document.getElementById('forgetSkillList');

const FACE_MAP = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

const PLAYER_BASE_MAX_HP = 20;
const PLAYER_MAX_SKILLS = 4;
const BASE_BOON_CHOICE_COUNT = 4;
const MAX_BOON_CHOICE_COUNT = 6;
const BOSS_MAX_ATTACK_DICE = 14;

const RARITY_CONFIG = {
  common: { name: '普通', colorClass: 'rarity-common', weight: 45 },
  fine: { name: '精良', colorClass: 'rarity-fine', weight: 30 },
  rare: { name: '稀有', colorClass: 'rarity-rare', weight: 15 },
  epic: { name: '史诗', colorClass: 'rarity-epic', weight: 7 },
  legendary: { name: '传说', colorClass: 'rarity-legendary', weight: 3 },
};

const RARITY_ORDER = Object.keys(RARITY_CONFIG);

const PLAYER_NAMES = [
  '深海守护者',
  '稳重的鸵鸟',
  '雾林旅人',
  '暮光行者',
  '寒潮追风者',
  '星港巡夜人',
  '静风祈愿师',
  '晨曦锻刃者',
  '苍穹观测员',
  '落雪守门人',
];

const BOSS_NAMES = [
  '噬魂裂渊暴君',
  '血棘吞城巨兽',
  '永夜断罪魔君',
  '炼狱噩兆之王',
  '灭烬灾厄领主',
  '冥河屠戮祭司',
  '骸骨风暴统帅',
  '灾厄蚀日君王',
  '深狱狂啸猎皇',
  '赤月焚界魔像',
];

function createCharacterPool({ side, names }) {
  return names.map((name, index) => {
    const art = side === 'player'
      ? `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9`
      : `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(name)}&backgroundColor=7f1d1d,b91c1c,111827&mood=angry`;
    return { id: `${side}-${index + 1}`, name, art };
  });
}

const PLAYER_CHARACTERS = createCharacterPool({ side: 'player', names: PLAYER_NAMES });
const BOSS_CHARACTERS = createCharacterPool({ side: 'boss', names: BOSS_NAMES });


const BOSS_EXTRA_ABILITIES = [
  {
    id: 'thorns',
    name: '荆棘反噬',
    description: 'Boss 受到攻击时反伤 1 点。',
    applyOnPlayerHit(playerDamage) {
      if (playerDamage <= 0) return 0;
      return 1;
    },
  },
  {
    id: 'rage',
    name: '狂暴',
    description: 'Boss 每次攻击额外 +1 伤害。',
    applyBossAttackDamage(baseDamage) {
      return baseDamage + 1;
    },
  },
  {
    id: 'ironSkin',
    name: '铁甲',
    description: 'Boss 固定减伤 1 点。',
    applyOnBossDamaged(baseDamage) {
      return Math.max(0, baseDamage - 1);
    },
  },
];

const SKILL_CONFIG = {
  powerStrike: {
    name: '强力一击',
    description: '本回合伤害提升',
    maxUses: 2,
    cooldown: 2,
    values: { common: 3, fine: 4, rare: 5, epic: 6, legendary: 8 },
    applyPlayerAttack(baseDamage, skillState) {
      const bonus = this.values[skillState.rarity];
      return { damage: baseDamage + bonus, note: `强力一击触发，伤害 +${bonus}` };
    },
  },
  healPulse: {
    name: '治疗术',
    description: '立刻回复生命',
    maxUses: 3,
    cooldown: 2,
    values: { common: 4, fine: 5, rare: 6, epic: 8, legendary: 10 },
    applyOnUse(skillState) {
      const healValue = this.values[skillState.rarity];
      const prev = playerHp;
      playerHp = Math.min(playerMaxHp, playerHp + healValue);
      const heal = playerHp - prev;
      updateHpBoard();
      return { note: `治疗术生效，回复 ${heal} 点生命` };
    },
  },
  fury: {
    name: '狂怒',
    description: '本回合伤害倍率提升',
    maxUses: 1,
    cooldown: 3,
    values: { common: 2, fine: 2.25, rare: 2.5, epic: 3, legendary: 3.5 },
    applyPlayerAttack(baseDamage, skillState) {
      const multiplier = this.values[skillState.rarity];
      const finalDamage = Math.round(baseDamage * multiplier);
      return { damage: finalDamage, note: `狂怒触发，伤害 ${baseDamage}→${finalDamage}` };
    },
  },
  whirlwind: {
    name: '旋风斩',
    description: '本回合伤害提升',
    maxUses: 2,
    cooldown: 2,
    values: { common: 5, fine: 6, rare: 7, epic: 8, legendary: 10 },
    applyPlayerAttack(baseDamage, skillState) {
      const bonus = this.values[skillState.rarity];
      return { damage: baseDamage + bonus, note: `旋风斩触发，伤害 +${bonus}` };
    },
  },
  stoneShield: {
    name: '石肤护体',
    description: '本轮受到伤害降低',
    maxUses: 2,
    cooldown: 2,
    values: { common: 0.75, fine: 0.8, rare: 0.85, epic: 0.9, legendary: 0.95 },
    applyBossAttack(baseDamage, skillState) {
      const reductionRate = this.values[skillState.rarity];
      const reducedDamage = Math.max(0, Math.floor(baseDamage * (1 - reductionRate)));
      return { damage: reducedDamage, note: `石肤护体生效（减伤 ${Math.round(reductionRate * 100)}%），${baseDamage} → ${reducedDamage}` };
    },
  },
};


function renderSkillGuideList() {
  if (!skillGuideListEl) return;
  skillGuideListEl.textContent = '';
  Object.values(SKILL_CONFIG).forEach((skill) => {
    const li = document.createElement('li');
    li.textContent = `${skill.name}：${skill.description}（分普通/精良/稀有/史诗/传说，次数 ${skill.maxUses}，冷却 ${skill.cooldown} 回合）`;
    skillGuideListEl.appendChild(li);
  });
}

const BOON_POOL = [
  {
    id: 'maxHp',
    name: '坚韧之心',
    description: '生命上限提升，并回复生命',
    values: { common: 4, fine: 5, rare: 6, epic: 8, legendary: 10 },
    apply(choice) {
      const value = this.values[choice.rarity];
      playerMaxHp += value;
      playerHp = Math.min(playerMaxHp, playerHp + value);
      return `生命上限 +${value}，并回复 ${value} 点生命`;
    },
  },
  {
    id: 'attackBonus',
    name: '锋刃祝福',
    description: '永久攻击力提升',
    values: { common: 1, fine: 2, rare: 3, epic: 4, legendary: 5 },
    apply(choice) {
      const value = this.values[choice.rarity];
      passiveAttackBonus += value;
      return `永久攻击力 +${value}`;
    },
  },
  {
    id: 'fortress',
    name: '守护符文',
    description: '永久减伤提升（最低到 0）',
    values: { common: 1, fine: 2, rare: 3, epic: 4, legendary: 5 },
    apply(choice) {
      const value = this.values[choice.rarity];
      passiveDamageReduction += value;
      return `永久减伤 +${value}`;
    },
  },
  {
    id: 'skillCharge',
    name: '奥术回流',
    description: '随机一个技能次数 +1 且清空其冷却',
    apply() {
      const keys = [...unlockedSkillKeys];
      const key = keys[Math.floor(Math.random() * keys.length)];
      skillsState[key].usesLeft += 1;
      skillsState[key].cooldownLeft = 0;
      return `${SKILL_CONFIG[key].name} 次数 +1 且冷却清空`;
    },
  },
  {
    id: 'blood',
    name: '嗜血',
    description: '普通攻击后额外回复生命',
    values: { common: 1, fine: 2, rare: 3, epic: 4, legendary: 5 },
    apply(choice) {
      const value = this.values[choice.rarity];
      lifestealOnHit += value;
      return `普通攻击命中后回复 ${value} 点生命`;
    },
  },
  {
    id: 'berserkerMark',
    name: '狂战印记',
    description: '【狂战套装】普通攻击额外 +2 伤害。',
    apply() {
      buildTraitSet.add(this.id);
      return '获得套装词条：狂战印记（普通攻击额外 +2 伤害）';
    },
  },
  {
    id: 'slayerInstinct',
    name: '屠戮本能',
    description: '【狂战套装】使用技能时伤害额外 +2。',
    apply() {
      buildTraitSet.add(this.id);
      return '获得套装词条：屠戮本能（技能伤害额外 +2）';
    },
  },
  {
    id: 'warCry',
    name: '战吼',
    description: '【狂战套装】每次造成伤害后回复 1 点生命。',
    apply() {
      buildTraitSet.add(this.id);
      return '获得套装词条：战吼（每次造成伤害后回复 1 点生命）';
    },
  },
  {
    id: 'learnWhirlwind',
    name: '旋风斩',
    description: '新增技能：旋风斩（本回合伤害 +5）。',
    apply(choice) {
      return unlockSkill('whirlwind', choice.rarity);
    },
  },
  {
    id: 'learnStoneShield',
    name: '石肤护体',
    description: '新增技能：石肤护体（本轮减伤 75%）。',
    apply(choice) {
      return unlockSkill('stoneShield', choice.rarity);
    },
  },
  {
    id: 'comboEngine',
    name: '追击引擎',
    description: '普通攻击的连击积累额外提高。',
    values: { common: 0.2, fine: 0.3, rare: 0.4, epic: 0.5, legendary: 0.6 },
    apply(choice) {
      const value = this.values[choice.rarity];
      comboGrowthBonus += value;
      return `普通攻击额外连击积累 +${value.toFixed(1)}`;
    },
  },
  {
    id: 'arcaneBattery',
    name: '奥术蓄电池',
    description: '使用技能后回复生命，并有概率恢复技能次数。',
    values: {
      common: { heal: 1, chance: 0.2 },
      fine: { heal: 1, chance: 0.25 },
      rare: { heal: 2, chance: 0.3 },
      epic: { heal: 2, chance: 0.4 },
      legendary: { heal: 3, chance: 0.5 },
    },
    apply(choice) {
      const value = this.values[choice.rarity];
      skillCycleHeal += value.heal;
      skillCycleRecoverChance += value.chance;
      return `技能后回复 ${value.heal} 点生命，且 ${Math.round(value.chance * 100)}% 概率恢复 1 次随机技能次数`;
    },
  },
  {
    id: 'ironReflex',
    name: '铁壁反击',
    description: '防御后反击 Boss 并附带少量治疗。',
    values: {
      common: { dmg: 1, heal: 1 },
      fine: { dmg: 2, heal: 1 },
      rare: { dmg: 2, heal: 2 },
      epic: { dmg: 3, heal: 2 },
      legendary: { dmg: 4, heal: 2 },
    },
    apply(choice) {
      const value = this.values[choice.rarity];
      defendCounterDamage += value.dmg;
      defendHealBonus += value.heal;
      return `防御后反击伤害 +${value.dmg}，并回复 ${value.heal} 点生命`;
    },
  },
];

let roundCount = 0;
let playerMaxHp = PLAYER_BASE_MAX_HP;
let playerHp = PLAYER_BASE_MAX_HP;
let bossHp = PLAYER_BASE_MAX_HP;
let bossMaxHp = PLAYER_BASE_MAX_HP;
let bossAttackMax = 6;
let gameOver = false;
let activeTurn = 'player';
let unlockedSkillKeys = ['powerStrike', 'healPulse', 'fury'];
let skillsState = createSkillsState(unlockedSkillKeys);
let battleLogs = [];
let pendingBoonChoices = [];
let passiveAttackBonus = 0;
let passiveDamageReduction = 0;
let lifestealOnHit = 0;
let pendingForgetSkill = false;
let bossLevel = 1;
let bossExtraAbilities = [];
let actionInProgress = false;
let comboBonus = 0;
let comboGrowthBonus = 0;
let skillCycleHeal = 0;
let skillCycleRecoverChance = 0;
let defendCounterDamage = 0;
let defendHealBonus = 0;
let currentPlayerCharacter = null;
let currentBossCharacter = null;
let buildTraitSet = new Set();

const BERSERKER_SET = ['berserkerMark', 'slayerInstinct', 'warCry'];

function hasBerserkerSetBonus() {
  return BERSERKER_SET.every((traitId) => buildTraitSet.has(traitId));
}

function formatBossDisplayName(name, level = bossLevel) {
  return `第 ${level} 个 Boss · ${name}`;
}

function formatLogTimestamp(date = new Date()) {
  return date.toLocaleTimeString('zh-CN', { hour12: false });
}

function rollRarity() {
  const total = RARITY_ORDER.reduce((sum, key) => sum + RARITY_CONFIG[key].weight, 0);
  let point = Math.random() * total;
  for (const rarity of RARITY_ORDER) {
    point -= RARITY_CONFIG[rarity].weight;
    if (point <= 0) return rarity;
  }
  return 'common';
}

function formatRarity(rarity) {
  return RARITY_CONFIG[rarity]?.name ?? RARITY_CONFIG.common.name;
}

function createRarityTag(rarity) {
  return `<span class="rarity-tag ${RARITY_CONFIG[rarity].colorClass}">[${RARITY_CONFIG[rarity].name}]</span>`;
}

function createSkillsState(skillKeys = Object.keys(SKILL_CONFIG)) {
  return Object.fromEntries(
    skillKeys.map((key) => [key, { usesLeft: SKILL_CONFIG[key].maxUses, cooldownLeft: 0, rarity: 'common' }]),
  );
}

function setupDice(diceEl) {
  const fragment = document.createDocumentFragment();
  for (let i = 1; i <= 9; i += 1) {
    const pip = document.createElement('span');
    pip.className = 'pip';
    pip.dataset.slot = i;
    fragment.appendChild(pip);
  }
  diceEl.textContent = '';
  diceEl.appendChild(fragment);
}

function renderDiceFace(diceEl, value, ownerLabel) {
  const shouldUseNumberFace = value > 6;
  const activeSlots = shouldUseNumberFace ? [] : (FACE_MAP[value] ?? []);
  diceEl.querySelectorAll('.pip').forEach((pipEl) => {
    const slot = Number(pipEl.dataset.slot);
    pipEl.classList.toggle('show', activeSlots.includes(slot));
  });
  diceEl.dataset.faceValue = shouldUseNumberFace ? String(value) : '';
  diceEl.classList.toggle('number-face', shouldUseNumberFace);
  diceEl.setAttribute('aria-label', `${ownerLabel}当前点数 ${value}`);
}

function updateRollValue(owner, value) {
  if (owner === 'player') {
    playerRollValueEl.textContent = value;
  } else {
    bossRollValueEl.textContent = value;
  }
}

function updateHpBoard() {
  playerHpEl.textContent = playerHp;
  bossHpEl.textContent = bossHp;
  bossMaxHpEl.textContent = bossMaxHp;
  playerHpFillEl.style.width = `${(playerHp / playerMaxHp) * 100}%`;
  bossHpFillEl.style.width = `${(bossHp / bossMaxHp) * 100}%`;
}

function updateBossPowerBoard() {
  bossDiceMaxEl.textContent = `D${bossAttackMax}`;
}

function triggerImpact(targetEl) {
  targetEl.classList.remove('impact');
  void targetEl.offsetWidth;
  targetEl.classList.add('impact');
}

function triggerDicePower(diceEl) {
  diceEl.classList.remove('power-burst');
  void diceEl.offsetWidth;
  diceEl.classList.add('power-burst');
}

function getSkillStatusText(skillKey) {
  const state = skillsState[skillKey];
  if (state.usesLeft === 0) return '次数用尽';
  if (state.cooldownLeft > 0) return `冷却 ${state.cooldownLeft}`;
  return '可用';
}

function isSkillAvailable(skillKey) {
  const state = skillsState[skillKey];
  return state.usesLeft > 0 && state.cooldownLeft === 0;
}

function renderSkillSubmenu() {
  skillSubmenuEl.textContent = '';
  unlockedSkillKeys.forEach((skillKey) => {
    const config = SKILL_CONFIG[skillKey];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'skill-item';
    btn.dataset.skillKey = skillKey;
    btn.setAttribute('role', 'menuitem');
    const status = getSkillStatusText(skillKey);
    const available = isSkillAvailable(skillKey) && !gameOver && activeTurn === 'player' && pendingBoonChoices.length === 0 && !actionInProgress;
    btn.disabled = !available;
    const rarity = skillsState[skillKey].rarity;
    btn.classList.add(RARITY_CONFIG[rarity].colorClass);
    btn.innerHTML = `${createRarityTag(rarity)} ${config.name}（剩余 ${skillsState[skillKey].usesLeft} · ${status}）`;
    skillSubmenuEl.appendChild(btn);
  });
}

function updateActionButtons() {
  const canAct = !gameOver && activeTurn === 'player' && pendingBoonChoices.length === 0 && !pendingForgetSkill && !actionInProgress;
  attackButtonEl.disabled = !canAct;
  defendButtonEl.disabled = !canAct;
  skillButtonEl.disabled = !canAct;
  if (!canAct) {
    closeSkillSubmenu();
  }
  renderSkillSubmenu();
}

function openSkillSubmenu() {
  if (skillButtonEl.disabled) return;
  skillSubmenuEl.classList.add('open');
  skillButtonEl.setAttribute('aria-expanded', 'true');
}

function closeSkillSubmenu() {
  skillSubmenuEl.classList.remove('open');
  skillButtonEl.setAttribute('aria-expanded', 'false');
}

function consumeSkill(skillKey) {
  const skillConfig = SKILL_CONFIG[skillKey];
  const skillState = skillsState[skillKey];
  skillState.usesLeft = Math.max(0, skillState.usesLeft - 1);
  skillState.cooldownLeft = skillConfig.cooldown + 1;
  return skillConfig;
}

function tickSkillCooldowns() {
  Object.values(skillsState).forEach((state) => {
    if (state.cooldownLeft > 0) state.cooldownLeft -= 1;
  });
}

function appendBattleLog(message) {
  battleLogs.unshift({ message, time: formatLogTimestamp() });
  if (battleLogs.length > 60) battleLogs.length = 60;
  renderBattleLogs();
}

function renderBattleLogs() {
  battleLogListEl.textContent = '';
  if (battleLogs.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.textContent = '暂无日志，点击“普通攻击/技能/防御”开始记录战斗。';
    battleLogListEl.appendChild(emptyItem);
    return;
  }
  battleLogs.forEach((logEntry) => {
    const item = document.createElement('li');
    const timeEl = document.createElement('time');
    timeEl.textContent = `[${logEntry.time}]`;
    const msg = document.createElement('span');
    msg.textContent = logEntry.message;
    item.append(timeEl, msg);
    battleLogListEl.appendChild(item);
  });
}

function getCurrentBoonChoiceCount() {
  const bonusChoices = Math.floor((bossLevel - 1) / 3);
  return Math.min(MAX_BOON_CHOICE_COUNT, BASE_BOON_CHOICE_COUNT + bonusChoices);
}

function calculateBossAttackMax(level) {
  const growth = Math.floor((level - 1) / 2);
  return Math.min(BOSS_MAX_ATTACK_DICE, 6 + growth);
}

function calculateBossMaxHp(level) {
  if (level <= 1) return PLAYER_BASE_MAX_HP;
  const growth = level - 1;
  return PLAYER_BASE_MAX_HP + growth * 6 + Math.floor(growth / 3) * 2;
}

function getRandomBoonChoices() {
  const shuffled = [...BOON_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, getCurrentBoonChoiceCount()).map((boon) => ({ ...boon, rarity: rollRarity() }));
}

function renderBoonDialog() {
  boonListEl.textContent = '';
  pendingBoonChoices.forEach((boon) => {
    const item = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'secondary-button';
    btn.innerHTML = `${createRarityTag(boon.rarity)} ${boon.name}：${boon.description}`;
    btn.classList.add(RARITY_CONFIG[boon.rarity].colorClass);
    btn.addEventListener('click', () => pickBoon(boon));
    item.appendChild(btn);
    boonListEl.appendChild(item);
  });
}

function unlockSkill(skillKey, rarity = 'common') {
  if (unlockedSkillKeys.includes(skillKey)) {
    skillsState[skillKey].usesLeft += 1;
    skillsState[skillKey].cooldownLeft = 0;
    if (RARITY_ORDER.indexOf(rarity) > RARITY_ORDER.indexOf(skillsState[skillKey].rarity)) {
      skillsState[skillKey].rarity = rarity;
      return `${SKILL_CONFIG[skillKey].name} 已掌握，额外获得 1 次使用次数并升为${formatRarity(rarity)}`;
    }
    return `${SKILL_CONFIG[skillKey].name} 已掌握，额外获得 1 次使用次数`;
  }

  unlockedSkillKeys.push(skillKey);
  skillsState[skillKey] = { usesLeft: SKILL_CONFIG[skillKey].maxUses, cooldownLeft: 0, rarity };
  if (unlockedSkillKeys.length > PLAYER_MAX_SKILLS) {
    pendingForgetSkill = true;
  }
  return `学会新技能【${formatRarity(rarity)}·${SKILL_CONFIG[skillKey].name}】`;
}

function renderForgetSkillDialog() {
  forgetSkillListEl.textContent = '';
  unlockedSkillKeys.forEach((skillKey) => {
    const item = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'secondary-button';
    const rarity = skillsState[skillKey].rarity;
    btn.classList.add(RARITY_CONFIG[rarity].colorClass);
    btn.innerHTML = `${createRarityTag(rarity)} ${SKILL_CONFIG[skillKey].name}：${SKILL_CONFIG[skillKey].description}`;
    btn.addEventListener('click', () => forgetSkill(skillKey));
    item.appendChild(btn);
    forgetSkillListEl.appendChild(item);
  });
}

function forgetSkill(skillKey) {
  unlockedSkillKeys = unlockedSkillKeys.filter((key) => key !== skillKey);
  delete skillsState[skillKey];
  pendingForgetSkill = unlockedSkillKeys.length > PLAYER_MAX_SKILLS;
  if (!pendingForgetSkill) forgetSkillDialogEl.close();
  renderSkillSubmenu();
  appendBattleLog(`你遗忘了技能【${SKILL_CONFIG[skillKey].name}】。`);
  updateActionButtons();
}

function rollBossAbilityUnlock() {
  if (bossLevel < 6 || bossLevel % 5 !== 0) return null;
  const remaining = BOSS_EXTRA_ABILITIES.filter((a) => !bossExtraAbilities.some((owned) => owned.id === a.id));
  if (remaining.length === 0) return null;
  const gained = remaining[Math.floor(Math.random() * remaining.length)];
  bossExtraAbilities.push(gained);
  return gained;
}


function pickRandomCharacter(pool, currentId = null) {
  if (!pool.length) return null;
  if (pool.length === 1) return pool[0];

  let candidate = pool[Math.floor(Math.random() * pool.length)];
  while (candidate.id === currentId) {
    candidate = pool[Math.floor(Math.random() * pool.length)];
  }
  return candidate;
}

function applyCharacterProfile(side, profile) {
  if (!profile) return;
  if (side === 'player') {
    playerNameEl.textContent = profile.name;
    playerArtEl.src = profile.art;
    playerArtEl.alt = `玩家立绘：${profile.name}`;
  } else {
    bossNameEl.textContent = formatBossDisplayName(profile.name);
    bossArtEl.src = profile.art;
    bossArtEl.alt = `第 ${bossLevel} 个 Boss 立绘：${profile.name}`;
  }
}

function refreshPlayerIdentity() {
  currentPlayerCharacter = pickRandomCharacter(PLAYER_CHARACTERS, currentPlayerCharacter?.id);
  applyCharacterProfile('player', currentPlayerCharacter);
}

function refreshBossIdentity() {
  currentBossCharacter = pickRandomCharacter(BOSS_CHARACTERS, currentBossCharacter?.id);
  applyCharacterProfile('boss', currentBossCharacter);
}

function pickBoon(boon) {
  const effect = boon.apply(boon);
  const hasSetBonus = hasBerserkerSetBonus();
  pendingBoonChoices = [];
  boonDialogEl.close();
  updateHpBoard();
  renderSkillSubmenu();
  appendBattleLog(`你选择了【${formatRarity(boon.rarity)}】正面效果【${boon.name}】：${effect}。`);
  if (hasSetBonus) {
    appendBattleLog('你已集齐【狂战套装】：普通攻击额外 +2、技能额外 +2，每次造成伤害后回复 1 点生命。');
  }
  resultEl.textContent = `你选择了【${formatRarity(boon.rarity)}·${boon.name}】。继续行动吧！`;
  if (pendingForgetSkill) {
    renderForgetSkillDialog();
    forgetSkillDialogEl.showModal();
    resultEl.textContent = '技能超过 4 个，请先遗忘 1 个技能。';
  }
  updateActionButtons();
}

function resetGame() {
  roundCount = 0;
  playerMaxHp = PLAYER_BASE_MAX_HP;
  playerHp = PLAYER_BASE_MAX_HP;
  bossHp = PLAYER_BASE_MAX_HP;
  bossMaxHp = PLAYER_BASE_MAX_HP;
  bossAttackMax = 6;
  gameOver = false;
  activeTurn = 'player';
  unlockedSkillKeys = ['powerStrike', 'healPulse', 'fury'];
  skillsState = createSkillsState(unlockedSkillKeys);
  pendingBoonChoices = [];
  passiveAttackBonus = 0;
  passiveDamageReduction = 0;
  lifestealOnHit = 0;
  pendingForgetSkill = false;
  actionInProgress = false;
  comboBonus = 0;
  comboGrowthBonus = 0;
  skillCycleHeal = 0;
  skillCycleRecoverChance = 0;
  defendCounterDamage = 0;
  defendHealBonus = 0;
  bossLevel = 1;
  bossExtraAbilities = [];
  buildTraitSet = new Set();

  refreshPlayerIdentity();
  refreshBossIdentity();

  roundCountEl.textContent = roundCount;
  updateHpBoard();
  updateBossPowerBoard();
  resultEl.textContent = '点击“普通攻击/技能/防御”开始战斗！';

  playerCardEl.classList.remove('impact', 'show-damage');
  bossCardEl.classList.remove('impact', 'show-damage');
  playerDiceEl.classList.remove('power-burst', 'turn-focus');
  bossDiceEl.classList.remove('power-burst', 'turn-focus');
  playerCardEl.dataset.damage = '';
  bossCardEl.dataset.damage = '';

  battleLogs = [];
  appendBattleLog(`战斗重置，新的挑战开始。玩家：${currentPlayerCharacter.name}，Boss：${currentBossCharacter.name}。`);

  renderDiceFace(playerDiceEl, 1, '玩家');
  renderDiceFace(bossDiceEl, 1, 'Boss ');
  updateRollValue('player', 1);
  updateRollValue('boss', 1);

  closeSkillSubmenu();
  if (boonDialogEl.open) boonDialogEl.close();
  if (forgetSkillDialogEl.open) forgetSkillDialogEl.close();
  updateActionButtons();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setTurnFocus(owner) {
  playerDiceEl.classList.toggle('turn-focus', owner === 'player');
  bossDiceEl.classList.toggle('turn-focus', owner === 'boss');
}

function showDamageFloat(targetEl, damage) {
  targetEl.dataset.damage = `-${damage}`;
  targetEl.classList.remove('show-damage');
  void targetEl.offsetWidth;
  targetEl.classList.add('show-damage');
}

function animateDiceRoll(diceEl, ownerLabel, maxRoll, owner) {
  let ticks = 0;
  return new Promise((resolve) => {
    const previewTimer = setInterval(() => {
      const previewValue = Math.floor(Math.random() * maxRoll) + 1;
      renderDiceFace(diceEl, previewValue, ownerLabel);
      updateRollValue(owner, previewValue);
      ticks += 1;
      if (ticks >= 8) {
        clearInterval(previewTimer);
        const finalValue = Math.floor(Math.random() * maxRoll) + 1;
        renderDiceFace(diceEl, finalValue, ownerLabel);
        updateRollValue(owner, finalValue);
        triggerDicePower(diceEl);
        diceEl.classList.remove('rolling');
        requestAnimationFrame(() => diceEl.classList.add('rolling'));
        resolve(finalValue);
      }
    }, 70);
  });
}

async function executePlayerAction(actionType, skillKey = null) {
  if (gameOver || activeTurn !== 'player' || pendingBoonChoices.length > 0 || pendingForgetSkill || actionInProgress) return;

  actionInProgress = true;
  updateActionButtons();

  try {
    const skillLog = [];
    let bossDamageReductionFn = null;
    let actionName = actionType === 'attack' ? '普通攻击' : '防御';

    if (actionType === 'skill' && skillKey && isSkillAvailable(skillKey)) {
      const skillConfig = consumeSkill(skillKey);
      actionName = `技能：${skillConfig.name}`;
      if (skillConfig.applyOnUse) {
        const useResult = skillConfig.applyOnUse(skillsState[skillKey]);
        if (useResult?.note) skillLog.push(useResult.note);
      }
      if (skillConfig.applyBossAttack) {
        bossDamageReductionFn = (baseDamage) => skillConfig.applyBossAttack(baseDamage, skillsState[skillKey]);
      }
    }

    if (actionType === 'defend') {
      bossDamageReductionFn = (baseDamage) => {
        const reducedDamage = Math.max(0, Math.floor(baseDamage / 2));
        return { damage: reducedDamage, note: `防御生效，${baseDamage} → ${reducedDamage}` };
      };
    }

    setTurnFocus('player');
    await wait(320);

    const playerRoll = await animateDiceRoll(playerDiceEl, '玩家', 6, 'player');
    let playerDamage = playerRoll + passiveAttackBonus;

    if ((actionType === 'attack' || actionType === 'skill') && comboBonus > 0) {
      const boostedDamage = Math.round(playerDamage * (1 + comboBonus));
      skillLog.push(`连击加成生效，伤害 ${playerDamage} → ${boostedDamage}（+${comboBonus.toFixed(1)}）`);
      playerDamage = boostedDamage;
      comboBonus = 0;
    }

    if (actionType === 'skill' && skillKey) {
      const skillConfig = SKILL_CONFIG[skillKey];
      if (skillConfig.applyPlayerAttack) {
        const skillAttackResult = skillConfig.applyPlayerAttack(playerDamage, skillsState[skillKey]);
        playerDamage = skillAttackResult.damage;
        if (skillAttackResult.note) skillLog.push(skillAttackResult.note);
      }
    }

    if (actionType === 'attack' && buildTraitSet.has('berserkerMark')) {
      playerDamage += 2;
      skillLog.push('狂战印记生效：普通攻击额外 +2 伤害');
    }

    if (actionType === 'skill' && buildTraitSet.has('slayerInstinct')) {
      playerDamage += 2;
      skillLog.push('屠戮本能生效：技能伤害额外 +2');
    }

    bossExtraAbilities.forEach((ability) => {
      if (ability.applyOnBossDamaged) {
        const reduced = ability.applyOnBossDamaged(playerDamage);
        if (reduced !== playerDamage) skillLog.push(`Boss 被动【${ability.name}】生效，玩家伤害 ${playerDamage} → ${reduced}`);
        playerDamage = reduced;
      }
    });

    bossHp = Math.max(0, bossHp - playerDamage);
    appendBattleLog(`玩家${actionName}：掷出 ${playerRoll}，造成 ${playerDamage} 点伤害。`);
    triggerImpact(bossCardEl);
    showDamageFloat(bossCardEl, playerDamage);
    updateHpBoard();

    bossExtraAbilities.forEach((ability) => {
      if (ability.applyOnPlayerHit) {
        const reflect = ability.applyOnPlayerHit(playerDamage);
        if (reflect > 0) {
          playerHp = Math.max(0, playerHp - reflect);
          skillLog.push(`Boss 被动【${ability.name}】触发，玩家受到 ${reflect} 点反伤`);
          updateHpBoard();
        }
      }
    });

    if (lifestealOnHit > 0) {
      const prev = playerHp;
      playerHp = Math.min(playerMaxHp, playerHp + lifestealOnHit);
      const healed = playerHp - prev;
      if (healed > 0) {
        skillLog.push(`嗜血触发，回复 ${healed} 点生命`);
        updateHpBoard();
      }
    }

    if (buildTraitSet.has('warCry') && playerDamage > 0) {
      const prevHp = playerHp;
      playerHp = Math.min(playerMaxHp, playerHp + 1);
      const healed = playerHp - prevHp;
      if (healed > 0) {
        skillLog.push('战吼生效：造成伤害后回复 1 点生命');
        updateHpBoard();
      }
    }

    if (actionType === 'attack') {
      const comboGrowth = 0.2 + comboGrowthBonus;
      comboBonus += comboGrowth;
      skillLog.push(`普通攻击积累连击加成，下次技能或攻击伤害 +${comboBonus.toFixed(1)}（本次 +${comboGrowth.toFixed(1)}）`);
    }

    if (actionType === 'skill' && skillCycleHeal > 0) {
      const prevHp = playerHp;
      playerHp = Math.min(playerMaxHp, playerHp + skillCycleHeal);
      const healed = playerHp - prevHp;
      if (healed > 0) {
        skillLog.push(`奥术蓄电池生效：回复 ${healed} 点生命`);
        updateHpBoard();
      }
      const recoverChance = Math.min(0.9, skillCycleRecoverChance);
      if (Math.random() < recoverChance) {
        const randomKey = unlockedSkillKeys[Math.floor(Math.random() * unlockedSkillKeys.length)];
        skillsState[randomKey].usesLeft += 1;
        skillLog.push(`奥术蓄电池触发：${SKILL_CONFIG[randomKey].name} 次数 +1`);
      }
    }

    setTurnFocus(null);
    await wait(680);

    if (bossHp === 0) {
      const hpBeforeRecover = playerHp;
      playerHp = Math.min(playerMaxHp, playerHp + 10);
      const recoveredHp = playerHp - hpBeforeRecover;

      roundCount += 1;
      roundCountEl.textContent = roundCount;
      bossLevel += 1;
      bossAttackMax = calculateBossAttackMax(bossLevel);
      bossMaxHp = calculateBossMaxHp(bossLevel);
      bossHp = bossMaxHp;
      tickSkillCooldowns();
      updateHpBoard();
      updateBossPowerBoard();

      pendingBoonChoices = getRandomBoonChoices();
      renderBoonDialog();
      boonDialogEl.showModal();

      const gainedAbility = rollBossAbilityUnlock();
      refreshBossIdentity();
      appendBattleLog(`Boss 被击败并重生：${currentBossCharacter.name}（Lv.${bossLevel}，生命上限 ${bossMaxHp}，攻击骰 D${bossAttackMax}）。`);
      appendBattleLog(`本次掉落词条品级：${pendingBoonChoices.map((boon) => `${boon.name}-${formatRarity(boon.rarity)}`).join('、')}。`);
      appendBattleLog(`胜利恢复：玩家回复 ${recoveredHp} 点生命。`);
      if (gainedAbility) {
        appendBattleLog(`Boss 获得新能力【${gainedAbility.name}】：${gainedAbility.description}`);
      }
      resultEl.textContent = `你击败了 Boss！新敌人【${currentBossCharacter.name}】已登场，请先从 ${pendingBoonChoices.length} 个正面效果中选择 1 个。`;
      if (skillLog.length) appendBattleLog(`附加效果：${skillLog.join('；')}。`);
      updateActionButtons();
      return;
    }

    activeTurn = 'boss';
    updateActionButtons();
    resultEl.textContent = `玩家回合：${actionName}造成 ${playerDamage} 点伤害。`;

    setTurnFocus('boss');
    await wait(320);

    const bossRoll = await animateDiceRoll(bossDiceEl, 'Boss ', bossAttackMax, 'boss');
    let bossDamage = Math.max(0, bossRoll - passiveDamageReduction);
    bossExtraAbilities.forEach((ability) => {
      if (ability.applyBossAttackDamage) {
        const boosted = ability.applyBossAttackDamage(bossDamage);
        if (boosted !== bossDamage) skillLog.push(`Boss 被动【${ability.name}】生效，伤害 ${bossDamage} → ${boosted}`);
        bossDamage = boosted;
      }
    });
    if (passiveDamageReduction > 0) {
      skillLog.push(`守护符文触发，${bossRoll} → ${bossDamage}`);
    }

    if (bossDamageReductionFn) {
      const reducedResult = bossDamageReductionFn(bossDamage);
      bossDamage = reducedResult.damage;
      if (reducedResult.note) skillLog.push(reducedResult.note);
    }

    if (actionType === 'defend' && defendCounterDamage > 0) {
      bossHp = Math.max(0, bossHp - defendCounterDamage);
      skillLog.push(`铁壁反击生效：Boss 受到 ${defendCounterDamage} 点反击伤害`);
      triggerImpact(bossCardEl);
      showDamageFloat(bossCardEl, defendCounterDamage);
      updateHpBoard();

      if (defendHealBonus > 0) {
        const prevHp = playerHp;
        playerHp = Math.min(playerMaxHp, playerHp + defendHealBonus);
        const healed = playerHp - prevHp;
        if (healed > 0) {
          skillLog.push(`铁壁反击追加效果：回复 ${healed} 点生命`);
          updateHpBoard();
        }
      }

      if (bossHp === 0) {
        appendBattleLog(`铁壁反击完成斩杀：Boss 受到 ${defendCounterDamage} 点反击伤害后倒下。`);
      }
    }

    if (bossHp === 0) {
      const hpBeforeRecover = playerHp;
      playerHp = Math.min(playerMaxHp, playerHp + 10);
      const recoveredHp = playerHp - hpBeforeRecover;

      roundCount += 1;
      roundCountEl.textContent = roundCount;
      bossLevel += 1;
      bossAttackMax = calculateBossAttackMax(bossLevel);
      bossMaxHp = calculateBossMaxHp(bossLevel);
      bossHp = bossMaxHp;
      tickSkillCooldowns();
      updateHpBoard();
      updateBossPowerBoard();

      pendingBoonChoices = getRandomBoonChoices();
      renderBoonDialog();
      boonDialogEl.showModal();

      const gainedAbility = rollBossAbilityUnlock();
      refreshBossIdentity();
      appendBattleLog(`Boss 被击败并重生：${currentBossCharacter.name}（Lv.${bossLevel}，生命上限 ${bossMaxHp}，攻击骰 D${bossAttackMax}）。`);
      appendBattleLog(`本次掉落词条品级：${pendingBoonChoices.map((boon) => `${boon.name}-${formatRarity(boon.rarity)}`).join('、')}。`);
      appendBattleLog(`胜利恢复：玩家回复 ${recoveredHp} 点生命。`);
      if (gainedAbility) {
        appendBattleLog(`Boss 获得新能力【${gainedAbility.name}】：${gainedAbility.description}`);
      }
      resultEl.textContent = `你击败了 Boss！新敌人【${currentBossCharacter.name}】已登场，请先从 ${pendingBoonChoices.length} 个正面效果中选择 1 个。`;
      if (skillLog.length) appendBattleLog(`附加效果：${skillLog.join('；')}。`);
      updateActionButtons();
      return;
    }

    playerHp = Math.max(0, playerHp - bossDamage);
    appendBattleLog(`${currentBossCharacter.name} 行动：掷出 ${bossRoll}，对玩家造成 ${bossDamage} 点伤害。`);
    triggerImpact(playerCardEl);
    showDamageFloat(playerCardEl, bossDamage);
    updateHpBoard();

    setTurnFocus(null);
    await wait(680);

    roundCount += 1;
    roundCountEl.textContent = roundCount;

    if (playerHp === 0) {
      resultEl.textContent = `Boss 回合：${currentBossCharacter.name} 掷出 ${bossRoll}，最终造成 ${bossDamage} 点伤害，你被击败了！`;
      appendBattleLog('玩家被击败，战斗结束。');
      gameOver = true;
      updateActionButtons();
      return;
    }

    tickSkillCooldowns();
    activeTurn = 'player';
    updateActionButtons();

    if (skillLog.length) {
      appendBattleLog(`附加效果：${skillLog.join('；')}。`);
    }
    resultEl.textContent = `Boss 回合：${currentBossCharacter.name} 掷出 ${bossRoll}，造成 ${bossDamage} 点伤害。轮到你行动。`;
  } finally {
    actionInProgress = false;
    updateActionButtons();
  }
}


setupDice(playerDiceEl);
setupDice(bossDiceEl);
renderSkillGuideList();
resetGame();

attackButtonEl.addEventListener('click', () => executePlayerAction('attack'));
defendButtonEl.addEventListener('click', () => executePlayerAction('defend'));
skillButtonEl.addEventListener('click', () => {
  if (skillSubmenuEl.classList.contains('open')) {
    closeSkillSubmenu();
  } else {
    openSkillSubmenu();
  }
});

skillSubmenuEl.addEventListener('click', (event) => {
  const target = event.target.closest('button[data-skill-key]');
  if (!target || target.disabled) return;
  const { skillKey } = target.dataset;
  closeSkillSubmenu();
  executePlayerAction('skill', skillKey);
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.skill-menu-wrap')) {
    closeSkillSubmenu();
  }
});

restartButtonEl.addEventListener('click', resetGame);
helpButtonEl.addEventListener('click', () => rulesDialogEl.showModal());
closeRulesButtonEl.addEventListener('click', () => rulesDialogEl.close());
logButtonEl.addEventListener('click', () => battleLogDialogEl.showModal());
closeBattleLogButtonEl.addEventListener('click', () => battleLogDialogEl.close());

rulesDialogEl.addEventListener('click', (event) => {
  const bounds = rulesDialogEl.getBoundingClientRect();
  const isBackdropClick = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  if (isBackdropClick) rulesDialogEl.close();
});

battleLogDialogEl.addEventListener('click', (event) => {
  const bounds = battleLogDialogEl.getBoundingClientRect();
  const isBackdropClick = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  if (isBackdropClick) battleLogDialogEl.close();
});

forgetSkillDialogEl.addEventListener('click', (event) => {
  const bounds = forgetSkillDialogEl.getBoundingClientRect();
  const isBackdropClick = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  if (isBackdropClick && !pendingForgetSkill) forgetSkillDialogEl.close();
});
