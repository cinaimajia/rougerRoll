const resultEl = document.getElementById('result');
const rollButtonEl = document.getElementById('rollButton');
const restartButtonEl = document.getElementById('restartButton');
const roundCountEl = document.getElementById('roundCount');
const playerHpEl = document.getElementById('playerHp');
const bossHpEl = document.getElementById('bossHp');
const playerCardEl = document.getElementById('playerCard');
const bossCardEl = document.getElementById('bossCard');
const playerDiceEl = document.getElementById('playerDice');
const bossDiceEl = document.getElementById('bossDice');
const playerRollValueEl = document.getElementById('playerRollValue');
const bossRollValueEl = document.getElementById('bossRollValue');
const turnToastEl = document.getElementById('turnToast');

const FACE_MAP = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

const MAX_HP = 20;

let roundCount = 0;
let playerHp = MAX_HP;
let bossHp = MAX_HP;
let gameOver = false;
let activeTurn = 'player';

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

function resetGame() {
  roundCount = 0;
  playerHp = MAX_HP;
  bossHp = MAX_HP;
  gameOver = false;
  activeTurn = 'player';

  roundCountEl.textContent = roundCount;
  updateHpBoard();
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
  if (gameOver) {
    return;
  }

  if (activeTurn !== 'player') {
    return;
  }

  rollButtonEl.disabled = true;

  showTurnToast('轮到玩家了');
  setTurnFocus('player');
  await wait(560);
  hideTurnToast();
  await wait(180);

  const playerDamage = await animateDiceRoll(playerDiceEl, '玩家', 6, 'player');
  bossHp = Math.max(0, bossHp - playerDamage);
  triggerImpact(bossCardEl);
  showDamageFloat(bossCardEl, playerDamage);
  updateHpBoard();
  setTurnFocus(null);
  await wait(680);

  if (bossHp === 0) {
    roundCount += 1;
    roundCountEl.textContent = roundCount;
    resultEl.textContent = `玩家回合：你掷出 ${playerDamage} 点伤害，直接击败了 Boss，胜利！`;
    gameOver = true;
    return;
  }

  activeTurn = 'boss';
  updateActionButton();
  resultEl.textContent = `玩家回合：你造成 ${playerDamage} 点伤害。`;

  showTurnToast('轮到 Boss 行动');
  setTurnFocus('boss');
  await wait(560);
  hideTurnToast();
  await wait(180);

  const bossDamage = await animateDiceRoll(bossDiceEl, 'Boss ', 10, 'boss');
  playerHp = Math.max(0, playerHp - bossDamage);
  triggerImpact(playerCardEl);
  showDamageFloat(playerCardEl, bossDamage);
  updateHpBoard();
  setTurnFocus(null);
  await wait(680);

  roundCount += 1;
  roundCountEl.textContent = roundCount;

  if (playerHp === 0) {
    resultEl.textContent = `Boss 回合：Boss 用 D10 造成 ${bossDamage} 点伤害，你被击败了！`;
    gameOver = true;
    return;
  }

  activeTurn = 'player';
  updateActionButton();
  resultEl.textContent = `Boss 回合：Boss 用 D10 造成 ${bossDamage} 点伤害。轮到你行动。`;
  rollButtonEl.disabled = false;
}

setupDice(playerDiceEl);
setupDice(bossDiceEl);
resetGame();

rollButtonEl.addEventListener('click', playRound);
restartButtonEl.addEventListener('click', resetGame);
