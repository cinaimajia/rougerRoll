const resultEl = document.getElementById('result');
const rollButtonEl = document.getElementById('rollButton');
const restartButtonEl = document.getElementById('restartButton');
const roundCountEl = document.getElementById('roundCount');
const playerHpEl = document.getElementById('playerHp');
const bossHpEl = document.getElementById('bossHp');
const bossMaxHpEl = document.getElementById('bossMaxHp');
const playerCardEl = document.getElementById('playerCard');
const bossCardEl = document.getElementById('bossCard');
const playerDiceEl = document.getElementById('playerDice');
const bossDiceEl = document.getElementById('bossDice');
const playerRollValueEl = document.getElementById('playerRollValue');
const bossRollValueEl = document.getElementById('bossRollValue');
const bossDiceMaxEl = document.getElementById('bossDiceMax');
const turnToastEl = document.getElementById('turnToast');
const skillPanelEl = document.getElementById('skillPanel');
const helpButtonEl = document.getElementById('helpButton');
const rulesDialogEl = document.getElementById('rulesDialog');
const closeRulesButtonEl = document.getElementById('closeRulesButton');

const FACE_MAP = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

const MAX_HP = 20;

const SKILL_CONFIG = {
  powerStrike: {
    name: '强力一击',
    description: '本回合额外 +3 点伤害',
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
      playerHp = Math.min(MAX_HP, playerHp + 4);
      const realHeal = playerHp - prev;
      updateHpBoard();
      return { note: `治疗术生效，回复 ${realHeal} 点生命` };
    },
  },
  shieldWall: {
    name: '护盾',
    description: '本轮 Boss 伤害降低 50%',
    maxUses: 2,
    cooldown: 3,
    applyBossAttack(baseDamage) {
      const reducedDamage = Math.max(0, Math.floor(baseDamage / 2));
      return { damage: reducedDamage, note: `护盾吸收伤害，${baseDamage} → ${reducedDamage}` };
    },
  },
};

let roundCount = 0;
let playerHp = MAX_HP;
let bossHp = MAX_HP;
let bossMaxHp = MAX_HP;
let bossAttackMax = 10;
let gameOver = false;
let activeTurn = 'player';
let selectedSkillKey = null;
let skillsState = createSkillsState();

function createSkillsState() {
  return Object.fromEntries(
    Object.entries(SKILL_CONFIG).map(([key, config]) => [
      key,
      {
        usesLeft: config.maxUses,
        cooldownLeft: 0,
      },
    ]),
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
    return;
  }

  bossRollValueEl.textContent = value;
}

function updateActionButton() {
  rollButtonEl.textContent = '玩家行动';
}

function updateHpBoard() {
  playerHpEl.textContent = playerHp;
  bossHpEl.textContent = bossHp;
  bossMaxHpEl.textContent = bossMaxHp;
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
  if (state.usesLeft === 0) {
    return '次数用尽';
  }

  if (state.cooldownLeft > 0) {
    return `冷却 ${state.cooldownLeft}`;
  }

  return '可用';
}

function isSkillAvailable(skillKey) {
  const state = skillsState[skillKey];
  return state.usesLeft > 0 && state.cooldownLeft === 0;
}

function renderSkillPanel() {
  skillPanelEl.textContent = '';

  Object.entries(SKILL_CONFIG).forEach(([skillKey, config]) => {
    const skillState = skillsState[skillKey];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'skill-button';
    button.dataset.skillKey = skillKey;

    const available = isSkillAvailable(skillKey);
    button.disabled = !available || gameOver || activeTurn !== 'player';
    button.classList.toggle('active', selectedSkillKey === skillKey);

    const status = getSkillStatusText(skillKey);
    button.innerHTML = `
      <strong>${config.name}</strong>
      <span>${config.description}</span>
      <small>剩余 ${skillState.usesLeft} 次 · ${status}</small>
    `;

    button.addEventListener('click', () => {
      selectedSkillKey = selectedSkillKey === skillKey ? null : skillKey;
      renderSkillPanel();
    });

    skillPanelEl.appendChild(button);
  });
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
    if (state.cooldownLeft > 0) {
      state.cooldownLeft -= 1;
    }
  });
}

function resetGame() {
  roundCount = 0;
  playerHp = MAX_HP;
  bossHp = MAX_HP;
  bossMaxHp = MAX_HP;
  bossAttackMax = 10;
  gameOver = false;
  activeTurn = 'player';
  selectedSkillKey = null;
  skillsState = createSkillsState();

  roundCountEl.textContent = roundCount;
  updateHpBoard();
  updateBossPowerBoard();
  resultEl.textContent = '点击“玩家行动”开始战斗！';
  rollButtonEl.disabled = false;
  updateActionButton();

  playerCardEl.classList.remove('impact');
  bossCardEl.classList.remove('impact');
  playerCardEl.classList.remove('show-damage');
  bossCardEl.classList.remove('show-damage');
  playerDiceEl.classList.remove('power-burst');
  bossDiceEl.classList.remove('power-burst');
  playerDiceEl.classList.remove('turn-focus');
  bossDiceEl.classList.remove('turn-focus');
  playerCardEl.dataset.damage = '';
  bossCardEl.dataset.damage = '';
  hideTurnToast();

  renderDiceFace(playerDiceEl, 1, '玩家');
  renderDiceFace(bossDiceEl, 1, 'Boss ');
  updateRollValue('player', 1);
  updateRollValue('boss', 1);
  renderSkillPanel();
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function showTurnToast(text) {
  turnToastEl.textContent = text;
  turnToastEl.classList.add('show');
}

function hideTurnToast() {
  turnToastEl.classList.remove('show');
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
        requestAnimationFrame(() => {
          diceEl.classList.add('rolling');
        });

        resolve(finalValue);
      }
    }, 70);
  });
}

async function playRound() {
  if (gameOver || activeTurn !== 'player') {
    return;
  }

  rollButtonEl.disabled = true;
  renderSkillPanel();

  const skillLog = [];
  let bossDamageReductionFn = null;
  let skillName = '';

  if (selectedSkillKey && isSkillAvailable(selectedSkillKey)) {
    const skillConfig = consumeSkill(selectedSkillKey);
    skillName = skillConfig.name;

    if (skillConfig.applyOnUse) {
      const useResult = skillConfig.applyOnUse();
      if (useResult?.note) {
        skillLog.push(useResult.note);
      }
    }

    if (skillConfig.applyBossAttack) {
      bossDamageReductionFn = skillConfig.applyBossAttack;
    }

    renderSkillPanel();
  }

  showTurnToast('轮到玩家了');
  setTurnFocus('player');
  await wait(560);
  hideTurnToast();
  await wait(180);

  const playerRoll = await animateDiceRoll(playerDiceEl, '玩家', 6, 'player');
  let playerDamage = playerRoll;

  if (selectedSkillKey && skillName) {
    const skillConfig = SKILL_CONFIG[selectedSkillKey];
    if (skillConfig.applyPlayerAttack) {
      const skillAttackResult = skillConfig.applyPlayerAttack(playerRoll);
      playerDamage = skillAttackResult.damage;
      if (skillAttackResult.note) {
        skillLog.push(skillAttackResult.note);
      }
    }
  }

  bossHp = Math.max(0, bossHp - playerDamage);
  triggerImpact(bossCardEl);
  showDamageFloat(bossCardEl, playerDamage);
  updateHpBoard();
  setTurnFocus(null);
  await wait(680);

  if (bossHp === 0) {
    roundCount += 1;
    roundCountEl.textContent = roundCount;
    bossAttackMax += 1;
    bossMaxHp += 10;
    bossHp = bossMaxHp;
    tickSkillCooldowns();
    updateHpBoard();
    updateBossPowerBoard();

    const extraLog = skillLog.length ? ` 技能效果：${skillLog.join('；')}。` : '';
    resultEl.textContent = `玩家回合：你掷出 ${playerRoll} 点，造成 ${playerDamage} 点伤害并击败 Boss！新的 Boss 生命提升到 ${bossMaxHp}，攻击骰提升到 D${bossAttackMax}。${extraLog}轮到你继续行动。`;
    selectedSkillKey = null;
    activeTurn = 'player';
    rollButtonEl.disabled = false;
    renderSkillPanel();
    return;
  }

  activeTurn = 'boss';
  updateActionButton();
  resultEl.textContent = `玩家回合：你造成 ${playerDamage} 点伤害${skillName ? `（使用技能：${skillName}）` : ''}。`;

  showTurnToast('轮到 Boss 行动');
  setTurnFocus('boss');
  await wait(560);
  hideTurnToast();
  await wait(180);

  const bossRoll = await animateDiceRoll(bossDiceEl, 'Boss ', bossAttackMax, 'boss');
  let bossDamage = bossRoll;

  if (bossDamageReductionFn) {
    const reducedResult = bossDamageReductionFn(bossRoll);
    bossDamage = reducedResult.damage;
    if (reducedResult.note) {
      skillLog.push(reducedResult.note);
    }
  }

  playerHp = Math.max(0, playerHp - bossDamage);
  triggerImpact(playerCardEl);
  showDamageFloat(playerCardEl, bossDamage);
  updateHpBoard();
  setTurnFocus(null);
  await wait(680);

  roundCount += 1;
  roundCountEl.textContent = roundCount;

  if (playerHp === 0) {
    resultEl.textContent = `Boss 回合：Boss 掷出 ${bossRoll}，最终造成 ${bossDamage} 点伤害，你被击败了！`;
    gameOver = true;
    selectedSkillKey = null;
    renderSkillPanel();
    return;
  }

  tickSkillCooldowns();
  selectedSkillKey = null;
  activeTurn = 'player';
  updateActionButton();
  renderSkillPanel();

  const extraLog = skillLog.length ? ` 技能效果：${skillLog.join('；')}。` : '';
  resultEl.textContent = `Boss 回合：Boss 掷出 ${bossRoll}，造成 ${bossDamage} 点伤害。轮到你行动。${extraLog}`;
  rollButtonEl.disabled = false;
}

setupDice(playerDiceEl);
setupDice(bossDiceEl);
resetGame();

rollButtonEl.addEventListener('click', playRound);
restartButtonEl.addEventListener('click', resetGame);

helpButtonEl.addEventListener('click', () => {
  rulesDialogEl.showModal();
});

closeRulesButtonEl.addEventListener('click', () => {
  rulesDialogEl.close();
});

rulesDialogEl.addEventListener('click', (event) => {
  const bounds = rulesDialogEl.getBoundingClientRect();
  const isBackdropClick = (
    event.clientX < bounds.left
    || event.clientX > bounds.right
    || event.clientY < bounds.top
    || event.clientY > bounds.bottom
  );

  if (isBackdropClick) {
    rulesDialogEl.close();
  }
});
