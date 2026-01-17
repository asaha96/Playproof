// PlayProof Demo - Main Entry
import { definePlayProofGameElement } from 'playproof-sdk/web-component';

// Register the web component
definePlayProofGameElement();

// DOM elements
const gameElement = document.getElementById('game') as HTMLElement;
const logElement = document.getElementById('log') as HTMLUListElement;
const colorPrimary = document.getElementById('color-primary') as HTMLInputElement;
const colorSecondary = document.getElementById('color-secondary') as HTMLInputElement;
const colorBackground = document.getElementById('color-background') as HTMLInputElement;
const durationInput = document.getElementById('duration') as HTMLInputElement;

// Logging helper
function log(message: string, type: 'info' | 'pass' | 'fail' | 'batch' = 'info') {
  const li = document.createElement('li');
  const timestamp = new Date().toLocaleTimeString();
  
  li.innerHTML = `
    <span class="timestamp">${timestamp}</span>
    <span class="event-type event-${type}">${message}</span>
  `;
  
  logElement.insertBefore(li, logElement.firstChild);
  
  // Keep only last 50 entries
  while (logElement.children.length > 50) {
    logElement.removeChild(logElement.lastChild!);
  }
}

// Listen for PlayProof events
gameElement.addEventListener('playproof-result', ((event: CustomEvent) => {
  const { result, score, reason, attemptId } = event.detail;
  
  if (result === 'pass') {
    log(`PASS - Attempt ${attemptId.slice(0, 8)}... Score: ${score ?? 'N/A'}`, 'pass');
  } else if (result === 'fail') {
    log(`FAIL - Attempt ${attemptId.slice(0, 8)}... Reason: ${reason ?? 'Unknown'}`, 'fail');
  } else if (result === 'regenerate') {
    log(`REGENERATE - ${reason ?? 'Try again'}`, 'batch');
  } else {
    log(`PENDING - Waiting for result...`, 'info');
  }
}) as EventListener);

// Control handlers
function updateGameAttributes() {
  gameElement.setAttribute('theme-primary', colorPrimary.value);
  gameElement.setAttribute('theme-secondary', colorSecondary.value);
  gameElement.setAttribute('theme-background', colorBackground.value);
  gameElement.setAttribute('game-duration', durationInput.value);
  
  log(`Config updated: ${durationInput.value}ms, colors updated`, 'info');
}

colorPrimary.addEventListener('change', updateGameAttributes);
colorSecondary.addEventListener('change', updateGameAttributes);
colorBackground.addEventListener('change', updateGameAttributes);
durationInput.addEventListener('change', updateGameAttributes);

// Initial log
log('PlayProof Demo loaded. Click "Start Verification" to begin.', 'info');

// Expose for debugging
(window as any).playproof = {
  game: gameElement,
  log,
};
