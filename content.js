const SEP = '==========================================';

function log(msg) {
    console.log(`\n${SEP}\n[Pump Paper Trader] ${msg}\n${SEP}\n`);
}

function error(msg) {
    console.error(`\n${SEP}\n[Pump Paper Trader ERROR] ${msg}\n${SEP}\n`);
}

function getMintAddress() {
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1];
}

function getMarketCap() {
    try {
        const allElements = document.querySelectorAll('div, span, p');

        // Strategy 1: Look for "market cap" label and get its value
        for (const el of allElements) {
            const text = el.textContent.toLowerCase().trim();
            if (text === 'market cap' || text === 'market cap:') {
                const valEl = el.nextElementSibling || (el.parentElement && el.parentElement.lastElementChild);
                if (valEl && valEl !== el) {
                    const mcap = parseNumericValue(valEl.textContent);
                    if (mcap > 0) return mcap;
                }
            }
        }

        // Strategy 2: Look for elements that look like price/mcap near "market cap" text
        for (const el of allElements) {
            if (el.textContent.includes('$') && el.textContent.toLowerCase().match(/[0-9]/)) {
                let parent = el.parentElement;
                for (let i = 0; i < 3 && parent; i++) {
                    if (parent.textContent.toLowerCase().includes('market cap')) {
                        const mcap = parseNumericValue(el.textContent);
                        if (mcap > 0) return mcap;
                    }
                    parent = parent.parentElement;
                }
            }
        }
    } catch (e) {
        error('Market Cap parse error: ' + e.message);
    }
    return 0;
}

function parseNumericValue(text) {
    const clean = text.trim().replace('$', '').replace(/,/g, '').toUpperCase();
    let mult = 1;
    if (clean.includes('K')) mult = 1000;
    else if (clean.includes('M')) mult = 1000000;
    else if (clean.includes('B')) mult = 1000000000;
    return (parseFloat(clean.replace(/[KMB]/g, '')) || 0) * mult;
}

function getSymbol() {
    const title = document.title;
    const match = title.match(/\(([^)]+)\)/);
    return match ? match[1] : 'UNKNOWN';
}

function injectButtons() {
    if (document.querySelector('.paper-trade-container')) {
        updateLiveUI(); // Always try to update if already injected
        return;
    }

    const selectors = [
        'div.scrollbar-none.sticky.top-4',
        'div.w-right-col',
        '.flex.flex-col.gap-4.w-full.md\\:w-\\[400px\\]'
    ];

    let container = null;
    for (const s of selectors) {
        container = document.querySelector(s);
        if (container) break;
    }

    if (!container) {
        const loginBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Log in to buy'));
        if (loginBtn) container = loginBtn.closest('.flex.flex-col.gap-4') || loginBtn.parentElement;
    }

    if (!container) return;

    const paperDiv = document.createElement('div');
    paperDiv.className = 'paper-trade-container';
    paperDiv.style.marginBottom = '1rem';
    paperDiv.innerHTML = `
        <div class="paper-trade-title">Paper Trading (Simulated)</div>
        <div class="paper-trade-buttons">
            <button class="paper-trade-btn paper-trade-btn-buy">Paper Buy (1 SOL)</button>
            <button class="paper-trade-btn paper-trade-btn-sell">Paper Sell All</button>
        </div>
        <div class="paper-trade-status">Trade Executed!</div>
        <div class="paper-live-info" id="paper-live-info" style="display:none">
            <div class="paper-pos-row">
                <span class="paper-pos-label">Entry MCAP:</span>
                <span class="paper-pos-value" id="paper-entry-mcap">$-</span>
            </div>
            <div class="paper-pos-row">
                <span class="paper-pos-label">Live P/L:</span>
                <span class="paper-pos-value" id="paper-live-pl">-%</span>
            </div>
        </div>
    `;

    container.prepend(paperDiv);

    paperDiv.querySelector('.paper-trade-btn-buy').addEventListener('click', () => handleTrade('BUY'));
    paperDiv.querySelector('.paper-trade-btn-sell').addEventListener('click', () => handleTrade('SELL'));

    updateLiveUI();
}

async function updateLiveUI() {
    const mint = getMintAddress();
    const liveMcap = getMarketCap();
    const { positions = {} } = await chrome.storage.local.get(['positions']);
    const pos = positions[mint];

    const infoDiv = document.getElementById('paper-live-info');
    if (!infoDiv) return;

    if (pos) {
        infoDiv.style.display = 'block';
        document.getElementById('paper-entry-mcap').textContent = `$${formatMcap(pos.entryMcap)}`;

        if (liveMcap > 0) {
            const roi = ((liveMcap - pos.entryMcap) / pos.entryMcap) * 100;
            const plEl = document.getElementById('paper-live-pl');
            plEl.textContent = `${roi >= 0 ? '+' : ''}${roi.toFixed(2)}%`;
            plEl.className = `paper-pos-value ${roi >= 0 ? 'roi-positive' : 'roi-negative'}`;

            // Periodically sync lastSeenMcap to storage for popup
            if (Date.now() % 10000 < 2000) { // Every ~10 seconds
                pos.lastSeenMcap = liveMcap;
                await chrome.storage.local.set({ positions });
            }
        }
    } else {
        infoDiv.style.display = 'none';
    }
}

async function handleTrade(type) {
    const mint = getMintAddress();
    const mcap = getMarketCap();
    const amount = 1;
    const symbol = getSymbol();

    if (mcap <= 0) {
        alert('Wait for Market Cap to load...');
        return;
    }

    const { positions = {}, trades = [] } = await chrome.storage.local.get(['positions', 'trades']);
    const currentPosition = positions[mint];

    if (type === 'SELL') {
        if (!currentPosition) {
            alert('No open position for this token!');
            return;
        }

        const profitRatio = (mcap - currentPosition.entryMcap) / currentPosition.entryMcap;
        const profitSol = currentPosition.amount * profitRatio;

        const sellTrade = {
            id: Date.now(),
            mint,
            symbol,
            entryMcap: currentPosition.entryMcap,
            exitMcap: mcap,
            amount: currentPosition.amount,
            profitSol,
            type: 'SELL',
            timestamp: new Date().toISOString()
        };

        trades.push(sellTrade);
        delete positions[mint];

        await chrome.storage.local.set({ positions, trades });
        showStatus(`SELL: ROI ${(profitRatio * 100).toFixed(2)}% (${profitSol.toFixed(3)} SOL)`);
        updateLiveUI();
    } else {
        const newPosition = {
            mint,
            symbol,
            entryMcap: currentPosition ? currentPosition.entryMcap : mcap, // Keep original entry
            amount: (currentPosition?.amount || 0) + amount,
            lastSeenMcap: mcap,
            timestamp: currentPosition ? currentPosition.timestamp : new Date().toISOString()
        };

        const buyTrade = {
            id: Date.now(),
            mint,
            symbol,
            mcap,
            amount,
            type: 'BUY',
            timestamp: new Date().toISOString()
        };

        positions[mint] = newPosition;
        trades.push(buyTrade);

        await chrome.storage.local.set({ positions, trades });
        showStatus(`BUY Executed at $${formatMcap(mcap)}`);
        updateLiveUI();
    }
}

function formatMcap(mcap) {
    if (mcap >= 1000000) return (mcap / 1000000).toFixed(1) + 'M';
    if (mcap >= 1000) return (mcap / 1000).toFixed(1) + 'K';
    return mcap.toFixed(0);
}

function showStatus(text) {
    const status = document.querySelector('.paper-trade-status');
    if (status) {
        status.style.display = 'block';
        status.textContent = text;
        setTimeout(() => { if (status) status.style.display = 'none'; }, 5000);
    }
    log(text);
}

const observer = new MutationObserver(() => injectButtons());
observer.observe(document.body, { childList: true, subtree: true });

// Start Polling
setInterval(updateLiveUI, 2000);

injectButtons();
log('Extension content script initialized with REAL-TIME P/L logic');
