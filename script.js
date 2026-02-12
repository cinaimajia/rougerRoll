const diceEl = document.getElementById('dice');
const resultEl = document.getElementById('result');
const rollButtonEl = document.getElementById('rollButton');
const rollCountEl = document.getElementById('rollCount');
const bestRollEl = document.getElementById('bestRoll');

let rollCount = 0;
let bestRoll = 0;

function rollDice() {
  const value = Math.floor(Math.random() * 6) + 1;

  rollCount += 1;
  bestRoll = Math.max(bestRoll, value);

  diceEl.textContent = value;
  diceEl.setAttribute('aria-label', `当前点数 ${value}`);
  resultEl.textContent = `当前点数：${value}`;
  rollCountEl.textContent = rollCount;
  bestRollEl.textContent = bestRoll;

  diceEl.classList.remove('roll-animation');
  requestAnimationFrame(() => {
    diceEl.classList.add('roll-animation');
  });
}

rollButtonEl.addEventListener('click', rollDice);
