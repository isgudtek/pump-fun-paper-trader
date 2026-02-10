# PumpPaperTrader 🚀

A Chrome extension I built to practice trading on **pump.fun** without risking real SOL. It injects a simulation interface directly into the specific token page, allowing for realistic paper trading with live P/L tracking.

## Features

- **Seamless Injection**: Automatically embeds "Paper Buy" and "Paper Sell" buttons into the pump.fun UI.
- **Real-Time P/L**: Tracks the current market cap of open positions and calculates ROI in real-time ($ and %).
- **Position Management**: 
    - Prevents selling without an open position.
    - Tracks "Entry MCAP" vs "Current MCAP".
    - Hardcoded to **1 SOL** per buy for consistent simulation.
    - **Clickable Links**: Easily navigate to the token page from your active positions or trade history.
- **Trade History**: A popup dashboard that shows all active positions and a log of recent realized profits/losses.
- **Persistent Data**: Uses `chrome.storage.local` so positions are saved even if I close the browser.

## Installation

1. Clone this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable "Developer mode" (top right).
4. Click "Load unpacked" and select this folder.
5. Go to any coin page on [pump.fun](https://pump.fun) and start trading!

## Tech Stack

- **Manifest V3**: Modern extension architecture.
- **Vanilla JS**: No frameworks, just fast and lightweight DOM manipulation.
- **MutationObserver**: robustly handles pump.fun's SPA navigation.

## Future Improvements

- [ ] Customizable trade amounts (currently locked to 1 SOL).
- [ ] Export trade history to CSV.
- [ ] visuals for stop-loss/take-profit.
