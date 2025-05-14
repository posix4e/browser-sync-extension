# Browser History Sync Extension

A browser extension for synchronizing browser history across Firefox, Chrome, and iOS Safari using a P2P protocol.

## Features

- Synchronize browser history across different browsers and devices
- End-to-end encryption using a shared secret
- Multiple discovery server options (Google, Twilio, or custom)
- Configurable sync settings
- Privacy controls to exclude specific domains

## Supported Browsers

- Google Chrome
- Mozilla Firefox
- Safari (including iOS Safari)

## Development

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Build the extensions:
   ```
   npm run build
   ```

### Development Workflow

- For Chrome development:
  ```
  npm run dev:chrome
  ```

- For Firefox development:
  ```
  npm run dev:firefox
  ```

- For Safari development:
  ```
  npm run dev:safari
  ```

### Testing

Run the tests:
```
npm test
```

## How It Works

This extension uses a peer-to-peer (P2P) protocol to synchronize browser history directly between devices without requiring a central server. All data is encrypted using the shared secret provided in the settings.

### P2P Network

The extension uses WebRTC for peer-to-peer communication, with STUN/TURN servers for NAT traversal. You can choose from the following discovery servers:

- Google STUN/TURN servers (default)
- Twilio STUN/TURN servers
- Custom server (provide your own STUN/TURN server URL)

### Security

All history data is encrypted using AES-256 encryption with the shared secret before being transmitted over the P2P network. The shared secret is never transmitted over the network.

## License

MIT