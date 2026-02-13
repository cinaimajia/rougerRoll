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
  const activeSlots = FACE_MAP[value] ?? [];

  diceEl.querySelectorAll('.pip').forEach((pipEl) => {
    const slot = Number(pipEl.dataset.slot);
    pipEl.classList.toggle('show', activeSlots.includes(slot));
  });

  diceEl.setAttribute('aria-label', `${ownerLabel}当前点数 ${value}`);
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

  roundCountEl.textContent = roundCount;
  updateHpBoard();
  resultEl.textContent = '点击“发起攻击”开始战斗！';
  rollButtonEl.disabled = false;

  playerCardEl.classList.remove('impact');
  bossCardEl.classList.remove('impact');
  playerDiceEl.classList.remove('power-burst');
  bossDiceEl.classList.remove('power-burst');

  renderDiceFace(playerDiceEl, 1, '玩家');
  renderDiceFace(bossDiceEl, 1, 'Boss ');
}

function animateDiceRoll(diceEl, ownerLabel) {
  let ticks = 0;

  return new Promise((resolve) => {
    const previewTimer = setInterval(() => {
      const previewValue = Math.floor(Math.random() * 6) + 1;
      renderDiceFace(diceEl, previewValue, ownerLabel);
      ticks += 1;

      if (ticks >= 8) {
        clearInterval(previewTimer);

        const finalValue = Math.floor(Math.random() * 6) + 1;
        renderDiceFace(diceEl, finalValue, ownerLabel);
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

  rollButtonEl.disabled = true;

  const playerDamage = await animateDiceRoll(playerDiceEl, '玩家');
  bossHp = Math.max(0, bossHp - playerDamage);
  triggerImpact(bossCardEl);

  if (bossHp === 0) {
    roundCount += 1;
    roundCountEl.textContent = roundCount;
    updateHpBoard();
    resultEl.textContent = `你掷出 ${playerDamage} 点伤害，直接击败了 Boss，胜利！`;
    gameOver = true;
    return;
  }

  const bossDamage = await animateDiceRoll(bossDiceEl, 'Boss ');
  playerHp = Math.max(0, playerHp - bossDamage);
  triggerImpact(playerCardEl);

  roundCount += 1;
  roundCountEl.textContent = roundCount;
  updateHpBoard();

  if (playerHp === 0) {
    resultEl.textContent = `你造成 ${playerDamage} 点伤害，Boss 反击 ${bossDamage} 点，你被击败了！`;
    gameOver = true;
    return;
  }

  resultEl.textContent = `你造成 ${playerDamage} 点伤害，Boss 造成 ${bossDamage} 点伤害。`;
  rollButtonEl.disabled = false;
}

setupDice(playerDiceEl);
setupDice(bossDiceEl);
resetGame();

rollButtonEl.addEventListener('click', playRound);
restartButtonEl.addEventListener('click', resetGame);
