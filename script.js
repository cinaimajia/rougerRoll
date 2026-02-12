const diceEl = document.getElementById('dice');
const resultEl = document.getElementById('result');
const rollButtonEl = document.getElementById('rollButton');
const rollCountEl = document.getElementById('rollCount');
const bestRollEl = document.getElementById('bestRoll');

const FACE_MAP = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

let rollCount = 0;
let bestRoll = 0;

function setupDice() {
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

function renderDiceFace(value) {
  const activeSlots = FACE_MAP[value] ?? [];

  diceEl.querySelectorAll('.pip').forEach((pipEl) => {
    const slot = Number(pipEl.dataset.slot);
    pipEl.classList.toggle('show', activeSlots.includes(slot));
  });

  diceEl.setAttribute('aria-label', `当前点数 ${value}`);
  resultEl.textContent = `当前点数：${value}`;
}

function rollDice() {
  rollButtonEl.disabled = true;
  diceEl.classList.remove('rolling');

  let ticks = 0;
  const previewTimer = setInterval(() => {
    const previewValue = Math.floor(Math.random() * 6) + 1;
    renderDiceFace(previewValue);
    ticks += 1;

    if (ticks >= 8) {
      clearInterval(previewTimer);

      const finalValue = Math.floor(Math.random() * 6) + 1;
      rollCount += 1;
      bestRoll = Math.max(bestRoll, finalValue);

      renderDiceFace(finalValue);
      rollCountEl.textContent = rollCount;
      bestRollEl.textContent = bestRoll;

      requestAnimationFrame(() => {
        diceEl.classList.add('rolling');
      });

      setTimeout(() => {
        rollButtonEl.disabled = false;
      }, 700);
    }
  }, 70);
}

setupDice();
renderDiceFace(1);
rollButtonEl.addEventListener('click', rollDice);
