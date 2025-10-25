# EventBase- DeFi Event Ticketing Platform

EventBase is a decentralized event ticketing platform built on Base Network that revolutionizes the events industry through DeFi mechanisms. The platform provide instant ticket transactions, fraud-proof NFT tickets, and real-time revenue distribution.

## Key Features

### Core Features ✅
- **NFT-Based Tickets**: Each ticket is a unique ERC-721 token ensuring authenticity
- **Instant Settlements**: Real-time revenue distribution using Base's L2 speed
- **Zero Fraud Risk**: Blockchain-verified ticket authenticity
- **P2P Transfers**: Secure ticket transfers between users
- **Automated Refunds**: Smart contract-powered automatic refunds for canceled events

### Phase 1 MVP Features (NEW) 🚀
- **QR Code Verification**: Real-time ticket scanning and validation for event entry
- **Secondary Marketplace**: Buy and sell tickets peer-to-peer with transparent pricing
- **Stablecoin Payments**: Accept USDC/USDT to eliminate crypto volatility
- **Refund Management**: User-friendly interface for claiming refunds
- **Audit-Ready**: Comprehensive documentation and testing framework

[**See Phase 1 Implementation Details →**](./PHASE1_IMPLEMENTATION.md)

## Architecture

The platform consists of three main components:

### Smart Contracts
Core ticketing logic built with Solidity 0.8.28:
- EventTicketing.sol: Main ticketing contract with DeFi mechanisms
- TicketNft.sol: ERC-721 NFT implementation for tickets
- EventTicketingLib.sol: Shared utilities and gas optimizations

**[View Smart Contract Documentation](./smcontract/README.md)** for detailed technical information, deployment guides, and API reference.

### Frontend Application
Modern web application built with Next.js 15:
- TypeScript for type safety
- Wagmi v2 for Web3 React hooks
- RainbowKit for multi-wallet connection
- Tailwind CSS for responsive design

**[View Frontend Documentation](./frontend/README.md)** for setup instructions, component details, and development guide.

### Blockchain Network
- Network:Base sepolia Testnet (Chain ID: 84532)
- Performance: 1M+ TPS with sub-second finality
- Compatibility: Full EVM compatibility
- Token: Base (native token)

## Contract Addresses

### Base Mainnet (Production) 🌐
- **TicketNft**: `0x5476A8C9d2420FeDd7933b2035F5b3b446135441`
- **EventTicketing**: `0x105003a5f52eA5D7d3a0872A467971bC31675376`
- **TicketResaleMarket**: `0xF92BbC14d485e38e651Fb3F220366159e0569ff2`
- **StablecoinPayment**: `[Pending Deployment]`

### Base Sepolia Testnet 🧪
- **TicketNft**: `0xc174678cc24B372a509A08dFA8d00f7AC678c459`
- **EventTicketing**: `0x12f537d03EfAD03924A2ce12cd6ABDe02693d3eF`
- **TicketResaleMarket**: `0x105003a5f52eA5D7d3a0872A467971bC31675376`

**Status**: ✅ Active and Tested | **Network**: Base L2 (Chain ID: 8453 / 84532)

## Wallet Connection

EventBase supports multiple wallet providers through WalletConnect v2:

### Supported Wallets
- **MetaMask** - Browser extension and mobile app
- **Coinbase Wallet** - Integrated with Coinbase
- **WalletConnect** - 300+ mobile wallets including:
  - Trust Wallet
  - Rainbow Wallet
  - Zerion
  - And many more

### How to Connect
1. Click "Connect Wallet" button in the navigation bar
2. Select your preferred wallet from the modal
3. Approve the connection in your wallet
4. Switch to Base Sepolia network if prompted
5. Start using the platform!

**Network Configuration:**
- Network: Base Sepolia Testnet
- Chain ID: 84532
- RPC URL: https://sepolia.base.org
- Currency: ETH
- Block Explorer: https://sepolia.basescan.org

## Usage

### For Event Attendees 🎟️
1. Connect your Web3 wallet to the platform
2. Browse available events in the marketplace
3. Purchase tickets with BASE, USDC, or USDT
4. View your NFT tickets with QR codes in "My Tickets"
5. **NEW:** List tickets for resale on the secondary market
6. **NEW:** Claim refunds for canceled events automatically

### For Event Organizers 🎪
1. Connect wallet and create new events
2. Set event details, pricing, capacity, and payment method (BASE/USDC/USDT)
3. Monitor ticket sales in real-time on dashboard
4. **NEW:** Use QR verification portal to check in attendees
5. Withdraw proceeds after event completion
6. Cancel events with automatic batch refunds if needed

### For Ticket Resellers 💰
1. **NEW:** List your tickets on the resale marketplace
2. Set your own prices (market-based)
3. Automatic NFT transfer upon sale
4. 2.5% platform fee (much lower than traditional platforms)

## Getting Started

### Prerequisites
- Node.js v18+ and npm
- MetaMask or another Web3 wallet
- Base Sepolia testnet ETH ([Get from faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet))

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/big14way/event.git
cd EventBase-main
```

2. **Setup Smart Contracts**
```bash
cd smcontract
npm install
cp .env.example .env
# Edit .env and add your private key and BaseScan API key
```

3. **Setup Frontend**
```bash
cd ../frontend
npm install
cp .env.example .env.local
# Edit .env.local and add your WalletConnect Project ID
```

4. **Run the Application**
```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000` to see the application.

### Environment Variables

**Smart Contract** (smcontract/.env):
```bash
PRIVATE_KEY=your_wallet_private_key_here
BASESCAN_API_KEY=your_basescan_api_key_here
```

**Frontend** (frontend/.env.local):
```bash
# Pinata IPFS Configuration (for event image uploads)
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt_token
NEXT_PUBLIC_PINATA_GATEWAY=gateway.pinata.cloud

# WalletConnect Configuration (for wallet connections)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

#### Getting Your WalletConnect Project ID:

1. Visit [WalletConnect Cloud](https://cloud.walletconnect.com)
2. Sign in or create a free account
3. Click "Create New Project"
4. Enter your project name (e.g., "EventBase Ticketing")
5. Copy your Project ID
6. Add it to `frontend/.env.local` as shown above

**Current Project ID** (for testing): `6b87a3c69cbd8b52055d7aef763148d6`

⚠️ **Security Notes:**
- Never commit .env files to git (they are in .gitignore)
- Keep your private keys secure and never share them
- WalletConnect Project IDs are safe to use in frontend code

## Documentation

- **[Phase 1 Implementation Guide](./PHASE1_IMPLEMENTATION.md)** - Complete MVP feature documentation
- **[Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Vercel deployment instructions
- **[Audit Checklist](./AUDIT_CHECKLIST.md)** - Security audit preparation
- **[Testing Guide](./TESTING_GUIDE.md)** - Comprehensive testing procedures
- **[Project Summary](./PROJECT_SUMMARY.md)** - Technical overview
- **[Setup Instructions](./SETUP_SUMMARY.md)** - Development setup

## Deployment

### Deploy to Vercel (Recommended)

The frontend is optimized for Vercel deployment with zero configuration needed.

**Quick Deploy (5 minutes):**
```bash
cd frontend
./deploy.sh
```

Or manually:
```bash
vercel login
vercel --prod
```

**📚 Deployment Guides:**
- 🚀 **[Quick Deploy Guide](./QUICK_DEPLOY.md)** - Deploy in 5 minutes
- 📖 **[Full Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Comprehensive guide

**Includes:**
- Step-by-step Vercel CLI deployment
- Environment variables configuration  
- Custom domain setup
- CI/CD with Git integration
- Security best practices & monitoring

### Alternative Platforms
- **Netlify**: Supports Next.js SSR
- **AWS Amplify**: Full-stack deployment
- **Railway**: Docker-based hosting
- **Self-hosted**: `npm run build && npm start`

## Demo

- **Live Application**: Deploy using instructions above
- **Smart Contracts**: ✅ Deployed on Base Mainnet & Sepolia
- **Block Explorer**: [BaseScan](https://basescan.org/)

## Hackathon Submission

This project was built for the Base Wave Stablecoin Summer Hackathon and demonstrates:

- DeFi Innovation: Novel financial primitives for event ticketing
- Technical Excellence: Production-ready smart contracts with advanced security
- User Experience: Seamless Web3 integration with modern UI
- Market Impact: Addresses real-world problems in the $68B ticketing industry

### Submission Categories
- Primary: DeFi Innovation
- Secondary: NFT Utilities, Web3 UX

## License

This project is licensed under the MIT License.

## Contributing

We welcome contributions!



## Support

For support and questions:
- GitHub Issues: Create an issue for bug reports or feature requests
- Community: Join our Discord server (link coming soon)
# EventBase-Ticket
