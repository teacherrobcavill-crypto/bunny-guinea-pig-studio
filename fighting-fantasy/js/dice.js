/**
 * Fighting Fantasy Interactive Dice Engine
 * Renders animated 3D-styled dice with realistic tumbling, pips, sound triggers,
 * and Promise-based resolution.
 */
class DiceRoller {
    constructor() {
        this.container = null;
        this.isRolling = false;
        this.animationDuration = 700; // ms
        this.pipsMap = {
            1: [4],
            2: [0, 8],
            3: [0, 4, 8],
            4: [0, 2, 6, 8],
            5: [0, 2, 4, 6, 8],
            6: [0, 2, 3, 5, 6, 8]
        };
    }

    init(containerElement) {
        this.container = containerElement;
    }

    renderDieHTML(value = 1, id = 'die-1') {
        const pips = this.pipsMap[value] || [4];
        let pipsHTML = '';
        for (let i = 0; i < 9; i++) {
            const hasPip = pips.includes(i);
            pipsHTML += `<span class="pip ${hasPip ? 'active' : ''}"></span>`;
        }
        return `
            <div class="ff-die" id="${id}" data-value="${value}">
                <div class="die-face">
                    ${pipsHTML}
                </div>
            </div>
        `;
    }

    updateDie(dieElement, value) {
        if (!dieElement) return;
        dieElement.setAttribute('data-value', value);
        const pips = this.pipsMap[value] || [4];
        const pipSpans = dieElement.querySelectorAll('.pip');
        pipSpans.forEach((span, idx) => {
            if (pips.includes(idx)) {
                span.classList.add('active');
            } else {
                span.classList.remove('active');
            }
        });
    }

    roll(numDice = 2, label = 'Roll Dice') {
        if (this.isRolling) return Promise.reject(new Error('Already rolling'));
        this.isRolling = true;

        if (window.Sound) {
            window.Sound.playDiceRoll();
        }

        const results = [];
        for (let i = 0; i < numDice; i++) {
            results.push(Math.floor(Math.random() * 6) + 1);
        }
        const total = results.reduce((a, b) => a + b, 0);

        return new Promise((resolve) => {
            if (!this.container) {
                this.isRolling = false;
                resolve({ dice: results, total: total });
                return;
            }

            // Render dice in container
            let html = `
                <div class="dice-roll-modal-content">
                    <div class="dice-roll-header">${label}</div>
                    <div class="dice-display-row">
            `;
            results.forEach((_, idx) => {
                html += this.renderDieHTML(1, `roll-die-${idx}`);
            });
            html += `
                    </div>
                    <div class="dice-total-display">Rolling...</div>
                </div>
            `;
            this.container.innerHTML = html;
            this.container.classList.add('active');

            const diceElements = results.map((_, idx) => document.getElementById(`roll-die-${idx}`));
            diceElements.forEach(el => el.classList.add('rolling'));

            // Tumble animation ticks
            const startTime = performance.now();
            const interval = setInterval(() => {
                diceElements.forEach(el => {
                    const tempVal = Math.floor(Math.random() * 6) + 1;
                    this.updateDie(el, tempVal);
                });
            }, 60);

            setTimeout(() => {
                clearInterval(interval);
                diceElements.forEach((el, idx) => {
                    el.classList.remove('rolling');
                    this.updateDie(el, results[idx]);
                    el.classList.add('settled');
                });

                const totalDisplay = this.container.querySelector('.dice-total-display');
                if (totalDisplay) {
                    totalDisplay.innerHTML = `<span class="total-number">${total}</span> <span class="breakdown">(${results.join(' + ')})</span>`;
                    totalDisplay.classList.add('revealed');
                }

                setTimeout(() => {
                    this.isRolling = false;
                    resolve({ dice: results, total: total });
                }, 400);
            }, this.animationDuration);
        });
    }

    hideModal() {
        if (this.container) {
            this.container.classList.remove('active');
        }
    }
}

// Global Dice instance
const Dice = new DiceRoller();
window.Dice = Dice;
