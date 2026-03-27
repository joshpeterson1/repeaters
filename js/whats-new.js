// "What's New" popup — shows once per APP_VERSION
import { WHATS_NEW_KEY, APP_VERSION, WHATS_NEW } from './constants.js';

export function showWhatsNewIfNeeded() {
    const seen = localStorage.getItem(WHATS_NEW_KEY);
    if (seen === APP_VERSION) return;

    const overlay = document.createElement('div');
    overlay.className = 'whats-new-overlay';

    const items = WHATS_NEW.items.map(i => `<li>${i.emoji} ${i.text}</li>`).join('');

    overlay.innerHTML = `
        <div class="whats-new-popup">
            <h3>What's New</h3>
            <p class="whats-new-date">${WHATS_NEW.date}</p>
            <ul>${items}</ul>
            <button class="whats-new-dismiss">Got it</button>
        </div>
    `;

    document.body.appendChild(overlay);

    const dismiss = () => {
        localStorage.setItem(WHATS_NEW_KEY, APP_VERSION);
        overlay.remove();
    };

    overlay.querySelector('.whats-new-dismiss').addEventListener('click', dismiss);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) dismiss(); });
}
