# On-Chain Governance DApp

Decentralized governance platform using an ERC-20 voting token and the OpenZeppelin Governor framework. The stack includes Hardhat, Solidity, Next.js, Tailwind CSS, Wagmi/WalletConnect, and Docker.

## Features

- ERC-20 governance token with delegation and vote snapshots
- Governor contract with standard and quadratic voting
- Proposal lifecycle management (pending, active, succeeded, executed)
- Frontend dashboard for proposals, voting, and wallet connection
- Dockerized Hardhat node and Next.js frontend

## Governance Flow

- Proposals are created on-chain and progress through Pending -> Active -> Succeeded/Defeated -> Executed.
- Voting power is snapshotted at proposal creation using ERC20Votes.
- Standard voting uses 1 token = 1 vote.
- Quadratic voting uses weight = votes, cost = votes^2 against snapshot balance.

## Project Structure

- /contracts: Solidity contracts
- /scripts: Deployment scripts
- /test: Hardhat tests
- /frontend: Next.js app

## Environment Variables

Copy the example file and update it for your environment:

```
cp .env.example .env
```

Frontend variables are prefixed with NEXT*PUBLIC* and used by the UI.

Required variables:

- PRIVATE_KEY: Deployer key for testnets
- SEPOLIA_RPC_URL: RPC endpoint for Sepolia
- ETHERSCAN_API_KEY: For verification (optional for local)
- NEXT_PUBLIC_RPC_URL: Frontend RPC endpoint
- NEXT_PUBLIC_GOVERNOR_ADDRESS: Deployed governor address
- NEXT_PUBLIC_TOKEN_ADDRESS: Deployed token address
- NEXT_PUBLIC_DEPLOY_BLOCK: Block number where contracts were deployed
- NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: WalletConnect project id

## Local Development (No Docker)

1. Install dependencies:

```
npm install
```

2. Compile and test contracts:

```
npm run compile
npm test
```

3. Start a local Hardhat node:

```
npm run node
```

4. Deploy contracts (in a new terminal):

```
npm run deploy
```

5. Start the frontend:

```
cd frontend
npm install
npm run dev
```

## Docker (One Command)

Start everything with:

```
docker-compose up --build
```

The Hardhat node runs on http://localhost:8545 and the frontend on http://localhost:3000.

If the frontend is blank after start, confirm your NEXT_PUBLIC_GOVERNOR_ADDRESS and NEXT_PUBLIC_DEPLOY_BLOCK are set.

## Notes

- After deploying to a new network, update NEXT_PUBLIC_GOVERNOR_ADDRESS and NEXT_PUBLIC_TOKEN_ADDRESS in your .env file.
- The frontend reads ProposalCreated events from NEXT_PUBLIC_DEPLOY_BLOCK for proposal discovery.
- Proposal creation requires meeting the configured proposal threshold.
- Quadratic voting uses castQuadraticVote(proposalId, support, votes).

## Scripts

- npm run compile
- npm test
- npm run node
- npm run deploy

## Contracts

- GovernanceToken.sol: ERC-20 + ERC20Votes token
- MyGovernor.sol: OpenZeppelin Governor with standard and quadratic voting
