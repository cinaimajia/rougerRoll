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

const PLAYER_TITLES = ['星刃', '雷影', '霜心', '焰羽', '月歌', '苍岚', '夜隼', '曙光', '赤霆', '流云'];
const PLAYER_CODES = ['001', '017', '033', '049', '058', '067', '072', '084', '095', '108'];
const BOSS_TITLES = ['噬界', '深渊', '断罪', '蚀日', '永夜', '血棘', '熔核', '风暴', '冥火', '寒狱'];
const BOSS_CODES = ['A01', 'B13', 'C27', 'D39', 'E52', 'F64', 'G70', 'H88', 'I94', 'J99'];
const BOSS_FORMS = ['巨龙', '魔像', '领主', '收割者', '女王', '剑圣', '猎犬', '祭司', '泰坦', '君王'];

function createCharacterPool({ side, titles, codes, forms = [] }) {
  const pool = [];
  titles.forEach((title, i) => {
    codes.forEach((code, j) => {
      const order = i * codes.length + j + 1;
      const form = forms.length ? forms[(i + j) % forms.length] : null;
      const name = side === 'player'
        ? `${title}${code}号`
        : `${title}${form}${code}`;
      const art = side === 'player'
        ? `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9`
        : `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(name)}&backgroundColor=ffdfbf,ffd5dc,fecaca`;
      pool.push({ id: `${side}-${order}`, name, art });
    });
  });
  return pool;
}

const PLAYER_CHARACTERS = createCharacterPool({ side: 'player', titles: PLAYER_TITLES, codes: PLAYER_CODES });
const BOSS_CHARACTERS = createCharacterPool({ side: 'boss', titles: BOSS_TITLES, codes: BOSS_CODES, forms: BOSS_FORMS });


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
    description: '本回合伤害 +3',
    maxUses: 2,
    cooldown: 2,
    applyPlayerAttack(baseDamage) {
      return { damage: baseDamage + 3, note: '强力一击触发，伤害 +3' };
    },
  },
  healPulse: {
    name: '治疗术',
    description: '立刻回复 4 点生命',
    maxUses: 3,
    cooldown: 2,
    applyOnUse() {
      const prev = playerHp;
      playerHp = Math.min(playerMaxHp, playerHp + 4);
      const heal = playerHp - prev;
      updateHpBoard();
      return { note: `治疗术生效，回复 ${heal} 点生命` };
    },
  },
  fury: {
    name: '狂怒',
    description: '本回合伤害翻倍',
    maxUses: 1,
    cooldown: 3,
    applyPlayerAttack(baseDamage) {
      return { damage: baseDamage * 2, note: `狂怒触发，伤害 ${baseDamage}→${baseDamage * 2}` };
    },
  },
  whirlwind: {
    name: '旋风斩',
    description: '本回合伤害 +5',
    maxUses: 2,
    cooldown: 2,
    applyPlayerAttack(baseDamage) {
      return { damage: baseDamage + 5, note: '旋风斩触发，伤害 +5' };
    },
  },
  stoneShield: {
    name: '石肤护体',
    description: '本轮受到伤害降低 75%',
    maxUses: 2,
    cooldown: 2,
    applyBossAttack(baseDamage) {
      const reducedDamage = Math.max(0, Math.floor(baseDamage * 0.25));
      return { damage: reducedDamage, note: `石肤护体生效，${baseDamage} → ${reducedDamage}` };
    },
  },
};


function renderSkillGuideList() {
  if (!skillGuideListEl) return;
  skillGuideListEl.textContent = '';
  Object.values(SKILL_CONFIG).forEach((skill) => {
    const li = document.createElement('li');
    li.textContent = `${skill.name}：${skill.description}（次数 ${skill.maxUses}，冷却 ${skill.cooldown} 回合）`;
    skillGuideListEl.appendChild(li);
  });
}

const BOON_POOL = [
  {
    id: 'maxHp',
    name: '坚韧之心',
    description: '生命上限 +4，并回复 4 点生命',
    apply() {
      playerMaxHp += 4;
      playerHp = Math.min(playerMaxHp, playerHp + 4);
      return '生命上限 +4，并回复 4 点生命';
    },
  },
  {
    id: 'attackBonus',
    name: '锋刃祝福',
    description: '永久攻击力 +1',
    apply() {
      passiveAttackBonus += 1;
      return '永久攻击力 +1';
    },
  },
  {
    id: 'fortress',
    name: '守护符文',
    description: '永久减伤 1 点（最低到 0）',
    apply() {
      passiveDamageReduction += 1;
      return '永久减伤 +1';
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
    description: '普通攻击后额外回复 1 点生命',
    apply() {
      lifestealOnHit += 1;
      return '普通攻击命中后回复 1 点生命';
    },
  },
  {
    id: 'learnWhirlwind',
    name: '旋风斩',
    description: '新增技能：旋风斩（本回合伤害 +5）。',
    apply() {
      return unlockSkill('whirlwind');
    },
  },
  {
    id: 'learnStoneShield',
    name: '石肤护体',
    description: '新增技能：石肤护体（本轮减伤 75%）。',
    apply() {
      return unlockSkill('stoneShield');
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
let playerCharacterCursor = -1;
let bossCharacterCursor = -1;
let currentPlayerCharacter = null;
let currentBossCharacter = null;

function formatLogTimestamp(date = new Date()) {
  return date.toLocaleTimeString('zh-CN', { hour12: false });
}

function createSkillsState(skillKeys = Object.keys(SKILL_CONFIG)) {
  return Object.fromEntries(
    skillKeys.map((key) => [key, { usesLeft: SKILL_CONFIG[key].maxUses, cooldownLeft: 0 }]),
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
    btn.textContent = `${config.name}（剩余 ${skillsState[skillKey].usesLeft} · ${status}）`;
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

function getRandomBoonChoices() {
  const shuffled = [...BOON_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

function renderBoonDialog() {
  boonListEl.textContent = '';
  pendingBoonChoices.forEach((boon) => {
    const item = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'secondary-button';
    btn.textContent = `${boon.name}：${boon.description}`;
    btn.addEventListener('click', () => pickBoon(boon));
    item.appendChild(btn);
    boonListEl.appendChild(item);
  });
}

function unlockSkill(skillKey) {
  if (unlockedSkillKeys.includes(skillKey)) {
    skillsState[skillKey].usesLeft += 1;
    skillsState[skillKey].cooldownLeft = 0;
    return `${SKILL_CONFIG[skillKey].name} 已掌握，额外获得 1 次使用次数`;
  }

  unlockedSkillKeys.push(skillKey);
  skillsState[skillKey] = { usesLeft: SKILL_CONFIG[skillKey].maxUses, cooldownLeft: 0 };
  if (unlockedSkillKeys.length > PLAYER_MAX_SKILLS) {
    pendingForgetSkill = true;
  }
  return `学会新技能【${SKILL_CONFIG[skillKey].name}】`;
}

function renderForgetSkillDialog() {
  forgetSkillListEl.textContent = '';
  unlockedSkillKeys.forEach((skillKey) => {
    const item = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'secondary-button';
    btn.textContent = `${SKILL_CONFIG[skillKey].name}：${SKILL_CONFIG[skillKey].description}`;
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
  if (bossLevel % 4 !== 0) return null;
  const remaining = BOSS_EXTRA_ABILITIES.filter((a) => !bossExtraAbilities.some((owned) => owned.id === a.id));
  if (remaining.length === 0) return null;
  const gained = remaining[Math.floor(Math.random() * remaining.length)];
  bossExtraAbilities.push(gained);
  return gained;
}


function pickNextCharacter(pool, currentCursor) {
  const nextCursor = (currentCursor + 1) % pool.length;
  return { character: pool[nextCursor], cursor: nextCursor };
}

function applyCharacterProfile(side, profile) {
  if (!profile) return;
  if (side === 'player') {
    playerNameEl.textContent = profile.name;
    playerArtEl.src = profile.art;
    playerArtEl.alt = `玩家立绘：${profile.name}`;
  } else {
    bossNameEl.textContent = profile.name;
    bossArtEl.src = profile.art;
    bossArtEl.alt = `Boss 立绘：${profile.name}`;
  }
}

function refreshPlayerIdentity() {
  const next = pickNextCharacter(PLAYER_CHARACTERS, playerCharacterCursor);
  playerCharacterCursor = next.cursor;
  currentPlayerCharacter = next.character;
  applyCharacterProfile('player', currentPlayerCharacter);
}

function refreshBossIdentity() {
  const next = pickNextCharacter(BOSS_CHARACTERS, bossCharacterCursor);
  bossCharacterCursor = next.cursor;
  currentBossCharacter = next.character;
  applyCharacterProfile('boss', currentBossCharacter);
}

function pickBoon(boon) {
  const effect = boon.apply();
  pendingBoonChoices = [];
  boonDialogEl.close();
  updateHpBoard();
  renderSkillSubmenu();
  appendBattleLog(`你选择了正面效果【${boon.name}】：${effect}。`);
  resultEl.textContent = `你选择了【${boon.name}】。继续行动吧！`;
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
  bossLevel = 1;
  bossExtraAbilities = [];

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
        const useResult = skillConfig.applyOnUse();
        if (useResult?.note) skillLog.push(useResult.note);
      }
      if (skillConfig.applyBossAttack) {
        bossDamageReductionFn = skillConfig.applyBossAttack;
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

    if (actionType === 'skill' && skillKey) {
      const skillConfig = SKILL_CONFIG[skillKey];
      if (skillConfig.applyPlayerAttack) {
        const skillAttackResult = skillConfig.applyPlayerAttack(playerDamage);
        playerDamage = skillAttackResult.damage;
        if (skillAttackResult.note) skillLog.push(skillAttackResult.note);
      }
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

    setTurnFocus(null);
    await wait(680);

    if (bossHp === 0) {
      roundCount += 1;
      roundCountEl.textContent = roundCount;
      bossLevel += 1;
      bossAttackMax += 1;
      bossMaxHp += 10;
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
      if (gainedAbility) {
        appendBattleLog(`Boss 获得新能力【${gainedAbility.name}】：${gainedAbility.description}`);
      }
      resultEl.textContent = `你击败了 Boss！新敌人【${currentBossCharacter.name}】已登场，请先从 3 个正面效果中选择 1 个。`;
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
