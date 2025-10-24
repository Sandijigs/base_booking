# Testing Guide for EventBase

## Overview
This guide covers testing requirements for all smart contracts and frontend functionality.

## Smart Contract Testing

### Test Structure
```
smcontract/test/
├── EventTicketing.ts          # Main ticketing contract tests
├── TicketNft.ts              # NFT contract tests
├── TicketResaleMarket.ts     # Resale marketplace tests
├── StablecoinPayment.ts      # Stablecoin payment tests
└── Integration.ts            # End-to-end integration tests
```

### Running Tests

```bash
cd smcontract

# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/EventTicketing.ts

# Run with gas reporter
REPORT_GAS=true npx hardhat test

# Run with coverage
npx hardhat coverage
```

### Required Test Coverage

#### EventTicketing.sol

**Setup & Deployment**
- [x] Constructor sets correct initial values
- [x] NFT contract address set properly
- [x] Fee recipient set correctly
- [x] Platform fee within valid range

**Ticket Creation**
- [x] Successfully create ticket with valid parameters
- [ ] Reject ticket with past timestamp
- [ ] Reject ticket with zero max supply
- [ ] Reject ticket with empty name
- [ ] Reject ticket with empty description
- [ ] Emit TicketCreated event

**Ticket Registration**
- [x] Successfully register with correct payment
- [ ] Reject registration with insufficient payment
- [ ] Reject registration with excess payment
- [ ] Reject duplicate registration
- [ ] Reject registration for sold out event
- [ ] Reject registration for closed event
- [ ] Reject registration for canceled event
- [ ] Reject registration after event started
- [ ] Mint NFT to registrant
- [ ] Update sold count correctly
- [ ] Track paid amount correctly
- [ ] Emit Registered event

**Ticket Updates**
- [ ] Creator can update price
- [ ] Creator can update location
- [ ] Creator can update timestamp
- [ ] Non-creator cannot update
- [ ] Cannot update after event started
- [ ] Cannot update canceled event
- [ ] Cannot update closed event
- [ ] Emit TicketUpdated event

**Max Supply Updates**
- [ ] Creator can increase max supply
- [ ] Creator can decrease max supply (if not below sold)
- [ ] Cannot decrease below sold count
- [ ] Non-creator cannot update
- [ ] Emit MaxSupplyUpdated event

**Event Closure**
- [ ] Creator can close event
- [ ] Owner can close event
- [ ] Non-authorized cannot close
- [ ] Cannot close already closed event
- [ ] Cannot close canceled event
- [ ] Prevents new registrations after close
- [ ] Emit TicketClosed event

**Event Cancellation**
- [ ] Creator can cancel event
- [ ] Owner can cancel event
- [ ] Non-authorized cannot cancel
- [ ] Sets both canceled and closed flags
- [ ] Processes refunds in batches
- [ ] Handles multiple cancel calls for batch refunds
- [ ] Refunds all registrants eventually
- [ ] Emit TicketCanceled event
- [ ] Emit RefundClaimed events

**Refund Claims**
- [ ] User can claim refund for canceled event
- [ ] Cannot claim refund for active event
- [ ] Cannot claim if not registered
- [ ] Cannot claim twice
- [ ] Refund amount matches paid amount
- [ ] Emit RefundClaimed event

**Proceeds Withdrawal**
- [ ] Creator can withdraw after event passed
- [ ] Cannot withdraw before event
- [ ] Cannot withdraw if canceled
- [ ] Cannot withdraw twice
- [ ] Platform fee calculated correctly
- [ ] Creator receives net amount
- [ ] Fee recipient receives platform fee
- [ ] Emit ProceedsWithdrawn event

**View Functions**
- [x] isAvailable returns correct status
- [x] ticketsLeft calculates correctly
- [x] getRegistrants returns all registrants
- [x] getStatus returns correct enum
- [x] getRecentTickets returns up to 100 tickets
- [x] getTotalTickets returns correct count

**Security**
- [x] ReentrancyGuard prevents reentrancy
- [ ] No overflow/underflow issues
- [ ] No unauthorized access
- [ ] Fallback/receive revert as expected

#### TicketNft.sol

**Minting**
- [ ] Only minter can mint
- [ ] Mints to correct address
- [ ] Increments token ID
- [ ] Stores metadata correctly
- [ ] Emit TicketMinted event

**Metadata**
- [ ] tokenURI returns valid JSON
- [ ] Metadata contains all required fields
- [ ] Image URI set correctly
- [ ] Attributes formatted properly

**Transfers**
- [ ] ERC721 transfer works
- [ ] Approval works
- [ ] transferFrom works
- [ ] safeTransferFrom works

**Admin Functions**
- [ ] Owner can update minter
- [ ] Owner can update image URI
- [ ] Non-owner cannot update

#### TicketResaleMarket.sol

**Listing Creation**
- [ ] Owner can list ticket
- [ ] Requires NFT approval
- [ ] Price within max price limit
- [ ] Only for upcoming events
- [ ] Cannot list already listed ticket
- [ ] Emit TicketListed event

**Ticket Purchase**
- [ ] Buyer can purchase listed ticket
- [ ] Cannot purchase own listing
- [ ] Requires sufficient payment
- [ ] NFT transferred to buyer
- [ ] Seller receives payment minus royalty
- [ ] Royalty sent to fee recipient
- [ ] Excess payment refunded
- [ ] Listing marked inactive
- [ ] Emit TicketSold event

**Listing Cancellation**
- [ ] Seller can cancel own listing
- [ ] Non-seller cannot cancel
- [ ] Listing marked inactive
- [ ] Emit TicketListed with price 0

**Admin Functions**
- [ ] Owner can update royalty
- [ ] Owner can update fee recipient
- [ ] Owner can update max price
- [ ] Non-owner cannot update

**Edge Cases**
- [ ] Cannot buy ticket for past event
- [ ] Cannot buy ticket for canceled event
- [ ] Handles stale approvals
- [ ] Handles seller no longer owns NFT

#### StablecoinPayment.sol

**Setup**
- [ ] Constructor sets USDC address
- [ ] Constructor sets USDT address
- [ ] Supported tokens mapping correct

**Ticket Creation with Stablecoin**
- [ ] Create ticket with USDC payment
- [ ] Create ticket with USDT payment
- [ ] Create ticket with native payment
- [ ] Store payment token correctly

**Registration with Stablecoin**
- [ ] Register with USDC (requires approval)
- [ ] Register with USDT (requires approval)
- [ ] Transfer tokens from user
- [ ] Cannot register native-only ticket with stablecoin
- [ ] Cannot register stablecoin ticket with native

**Withdrawals**
- [ ] Creator receives USDC correctly
- [ ] Creator receives USDT correctly
- [ ] Platform fee in correct token
- [ ] Cannot mix token types

**Refunds**
- [ ] Refund USDC to user
- [ ] Refund USDT to user
- [ ] Correct token returned

### Integration Tests

```typescript
describe("Full Event Lifecycle", () => {
  it("should complete full ticket purchase flow", async () => {
    // 1. Deploy contracts
    // 2. Create event
    // 3. User registers
    // 4. Receive NFT
    // 5. Event passes
    // 6. Creator withdraws
    // 7. Verify balances
  })

  it("should handle event cancellation and refunds", async () => {
    // 1. Create event
    // 2. Multiple users register
    // 3. Creator cancels
    // 4. All users claim refunds
    // 5. Verify all received refunds
  })

  it("should complete resale transaction", async () => {
    // 1. User A buys ticket
    // 2. User A approves marketplace
    // 3. User A lists ticket
    // 4. User B buys from listing
    // 5. Verify NFT ownership changed
    // 6. Verify payments distributed
  })

  it("should handle stablecoin payments", async () => {
    // 1. Create ticket with USDC
    // 2. User approves USDC
    // 3. User registers with USDC
    // 4. Event passes
    // 5. Creator withdraws USDC
    // 6. Verify USDC balances
  })
})
```

## Frontend Testing

### Manual Testing Checklist

#### Wallet Connection
- [ ] Connect with MetaMask
- [ ] Connect with Coinbase Wallet
- [ ] Connect with WalletConnect
- [ ] Disconnect wallet
- [ ] Switch networks
- [ ] Handle wrong network

#### Event Creation
- [ ] Fill all fields
- [ ] Upload banner image
- [ ] Set future date/time
- [ ] Set valid price
- [ ] Set max supply
- [ ] Submit transaction
- [ ] Verify on blockchain
- [ ] See event in marketplace

#### Event Browsing
- [ ] View all events
- [ ] Search by name
- [ ] Filter by category
- [ ] Filter by date
- [ ] Sort by price
- [ ] Sort by trending
- [ ] View event details

#### Ticket Purchase
- [ ] Select event
- [ ] Connect wallet
- [ ] Confirm purchase
- [ ] Receive NFT
- [ ] See in My Tickets
- [ ] View QR code

#### Ticket Management
- [ ] View all owned tickets
- [ ] Filter upcoming/past
- [ ] Generate QR code
- [ ] Download QR code
- [ ] View transaction hash
- [ ] View on block explorer

#### Resale Market
- [ ] List ticket for sale
- [ ] Set listing price
- [ ] Approve NFT transfer
- [ ] Confirm listing
- [ ] View own listings
- [ ] Cancel listing
- [ ] Browse listings
- [ ] Purchase listing
- [ ] Receive transferred NFT

#### Refunds
- [ ] View refundable tickets
- [ ] Claim individual refund
- [ ] Claim all refunds
- [ ] Verify refund received
- [ ] See refund in wallet

#### QR Verification
- [ ] Start camera
- [ ] Scan QR code
- [ ] Verify ticket validity
- [ ] Check in attendee
- [ ] Manual ticket ID entry
- [ ] Verify already used ticket
- [ ] Verify invalid ticket

#### Responsive Design
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)
- [ ] Mobile landscape

### Automated Testing (Optional)

```bash
cd frontend

# Install dependencies
npm install

# Run Cypress tests (if implemented)
npm run test:e2e

# Run Jest unit tests (if implemented)
npm run test:unit
```

## Gas Usage Benchmarks

Target gas usage:
- **createTicket**: < 200,000 gas
- **register**: < 150,000 gas
- **listTicket**: < 100,000 gas
- **buyTicket**: < 120,000 gas
- **claimRefund**: < 80,000 gas
- **withdrawProceeds**: < 100,000 gas

## Performance Testing

### Load Testing
- [ ] 100 concurrent users browsing
- [ ] 50 concurrent ticket purchases
- [ ] Event with 10,000 ticket supply
- [ ] Cancellation with 1,000 refunds
- [ ] Marketplace with 500 listings

### Stress Testing
- [ ] Maximum ticket supply (type(uint256).max)
- [ ] Maximum price
- [ ] Rapid succession transactions
- [ ] Multiple simultaneous cancellations

## Security Testing

### Common Attacks
- [ ] Reentrancy attack attempts
- [ ] Integer overflow/underflow
- [ ] Front-running attacks
- [ ] Flash loan attacks
- [ ] Timestamp manipulation
- [ ] Gas griefing
- [ ] Denial of service
- [ ] Price manipulation

### Access Control
- [ ] Unauthorized admin functions
- [ ] Creator-only functions
- [ ] Owner-only functions
- [ ] Minter-only functions

## Test Reporting

Generate comprehensive test reports:

```bash
# Coverage report
npx hardhat coverage

# Gas report
REPORT_GAS=true npx hardhat test

# Detailed test output
npx hardhat test --verbose
```

## Continuous Integration

Recommended CI/CD pipeline:

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npx hardhat compile
      - run: npx hardhat test
      - run: npx hardhat coverage
```

## Pre-Deployment Checklist

- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Gas optimization complete
- [ ] Security audit complete
- [ ] Code coverage > 80%
- [ ] Manual testing complete
- [ ] Testnet deployment tested
- [ ] Documentation updated
- [ ] Emergency procedures documented
- [ ] Monitoring systems ready
