async function loadData() {
    const { positions = {}, trades = [] } = await chrome.storage.local.get(['positions', 'trades']);

    // 1. Render Open Positions
    const posList = document.getElementById('positions-list');
    const posKeys = Object.keys(positions);

    if (posKeys.length === 0) {
        posList.innerHTML = '<div class="empty-state">No open positions</div>';
    } else {
        posList.innerHTML = '';
        posKeys.forEach(key => {
            const pos = positions[key];
            const liveROI = pos.lastSeenMcap ? ((pos.lastSeenMcap - pos.entryMcap) / pos.entryMcap * 100).toFixed(2) : '0.00';
            const isProfit = parseFloat(liveROI) >= 0;

            const card = document.createElement('div');
            card.className = 'trade-card';
            // SURGICAL EDIT: Wrapped symbol in <a> tag
            card.innerHTML = `
                <div class="trade-header">
                    <a href="https://pump.fun/coin/${pos.mint}" target="_blank" class="symbol-link">${pos.symbol} ↗</a>
                    <span class="type" style="background: ${isProfit ? 'rgba(31,217,120,0.2)' : 'rgba(239,68,68,0.2)'}; color: ${isProfit ? '#1FD978' : '#ef4444'}">
                        ${isProfit ? '+' : ''}${liveROI}%
                    </span>
                </div>
                <div class="trade-details">
                    <div>
                        <span class="label">Amount</span>
                        <span class="value">${pos.amount} SOL</span>
                    </div>
                    <div>
                        <span class="label">Entry MCAP</span>
                        <span class="value">$${formatMcap(pos.entryMcap)}</span>
                    </div>
                </div>
                <div style="font-size: 0.65rem; color: #64748b; margin-top: 5px; text-align: right;">
                    Live: $${formatMcap(pos.lastSeenMcap || pos.entryMcap)}
                </div>
            `;
            posList.appendChild(card);
        });
    }

    // 2. Render Trade History
    const historyList = document.getElementById('history-list');
    const realizedTrades = trades.filter(t => t.type === 'SELL').reverse().slice(0, 10);

    if (realizedTrades.length === 0) {
        historyList.innerHTML = '<div class="empty-state">No realized trades yet</div>';
    } else {
        historyList.innerHTML = '';
        realizedTrades.forEach(trade => {
            const isProfit = trade.profitSol >= 0;
            const logItem = document.createElement('div');
            logItem.className = 'history-item';
            // SURGICAL EDIT: Wrapped symbol in <a> tag
            logItem.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <a href="https://pump.fun/coin/${trade.mint}" target="_blank" class="symbol-link-small"><strong>${trade.symbol}</strong></a>
                    <span style="color: ${isProfit ? '#1FD978' : '#ef4444'}">
                        ${isProfit ? '+' : ''}${trade.profitSol.toFixed(3)} SOL (${((trade.exitMcap - trade.entryMcap) / trade.entryMcap * 100).toFixed(1)}%)
                    </span>
                </div>
                <div style="font-size: 0.7rem; color: #94a3b8">
                    In: $${formatMcap(trade.entryMcap)} | Out: $${formatMcap(trade.exitMcap)}
                </div>
            `;
            historyList.appendChild(logItem);
        });
    }
}

function formatMcap(mcap) {
    if (!mcap) return '0';
    if (mcap >= 1000000) return (mcap / 1000000).toFixed(1) + 'M';
    if (mcap >= 1000) return (mcap / 1000).toFixed(1) + 'K';
    return mcap.toFixed(0);
}

document.getElementById('clear-all').addEventListener('click', async () => {
    if (confirm('Reset ALL stats?')) {
        await chrome.storage.local.set({ trades: [], positions: {} });
        loadData();
    }
});

loadData();
setInterval(loadData, 1000); 
