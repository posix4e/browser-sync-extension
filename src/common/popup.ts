import { PeerInfo } from './types';

document.addEventListener('DOMContentLoaded', () => {
  const statusElement = document.getElementById('status') as HTMLDivElement;
  const syncNowButton = document.getElementById('syncNow') as HTMLButtonElement;
  const connectButton = document.getElementById('connect') as HTMLButtonElement;
  const disconnectButton = document.getElementById('disconnect') as HTMLButtonElement;
  const openOptionsButton = document.getElementById('openOptions') as HTMLButtonElement;
  const lastSyncElement = document.getElementById('lastSync') as HTMLSpanElement;
  const peerCountElement = document.getElementById('peerCount') as HTMLSpanElement;
  const syncCountElement = document.getElementById('syncCount') as HTMLSpanElement;
  
  // Update UI based on connection status
  function updateUI(isConnected: boolean, peers: PeerInfo[] = [], lastSync: number | null = null, syncCount: number = 0) {
    if (isConnected) {
      statusElement.textContent = 'Status: Connected';
      statusElement.className = 'status connected';
      syncNowButton.disabled = false;
      connectButton.disabled = true;
      disconnectButton.disabled = false;
    } else {
      statusElement.textContent = 'Status: Disconnected';
      statusElement.className = 'status disconnected';
      syncNowButton.disabled = true;
      connectButton.disabled = false;
      disconnectButton.disabled = true;
    }
    
    peerCountElement.textContent = peers.length.toString();
    syncCountElement.textContent = syncCount.toString();
    
    if (lastSync) {
      const date = new Date(lastSync);
      lastSyncElement.textContent = date.toLocaleString();
    } else {
      lastSyncElement.textContent = 'Never';
    }
  }
  
  // Get initial status
  chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
    if (response) {
      updateUI(
        response.isConnected,
        response.peers,
        response.stats.lastSync,
        response.stats.syncCount
      );
    }
  });
  
  // Set up button click handlers
  syncNowButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'syncNow' }, (response) => {
      if (response && response.success) {
        // Update UI after sync
        chrome.runtime.sendMessage({ action: 'getStatus' }, (statusResponse) => {
          if (statusResponse) {
            updateUI(
              statusResponse.isConnected,
              statusResponse.peers,
              statusResponse.stats.lastSync,
              statusResponse.stats.syncCount
            );
          }
        });
      } else {
        console.error('Sync failed:', response?.error);
      }
    });
  });
  
  connectButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'connect' }, (response) => {
      if (response && response.success) {
        updateUI(response.isConnected);
      }
    });
  });
  
  disconnectButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'disconnect' }, (response) => {
      if (response && response.success) {
        updateUI(response.isConnected);
      }
    });
  });
  
  openOptionsButton.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});