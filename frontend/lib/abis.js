export const governorAbi = [
  "event ProposalCreated(uint256 proposalId,address proposer,address[] targets,uint256[] values,bytes[] calldatas,uint256 startBlock,uint256 endBlock,string description)",
  "event VoteCast(address indexed voter,uint256 proposalId,uint8 support,uint256 weight,string reason)",
  "event ProposalExecuted(uint256 proposalId)",
  "function state(uint256 proposalId) view returns (uint8)",
  "function proposalVotes(uint256 proposalId) view returns (uint256 againstVotes,uint256 forVotes,uint256 abstainVotes)",
  "function proposalDeadline(uint256 proposalId) view returns (uint256)",
  "function proposalSnapshot(uint256 proposalId) view returns (uint256)",
  "function proposalVotingType(uint256 proposalId) view returns (uint8)",
  "function castVote(uint256 proposalId,uint8 support) returns (uint256)",
  "function castQuadraticVote(uint256 proposalId,uint8 support,uint256 votes) returns (uint256)",
  "function propose(address[] targets,uint256[] values,bytes[] calldatas,string description) returns (uint256)",
  "function proposeWithType(address[] targets,uint256[] values,bytes[] calldatas,string description,uint8 votingType) returns (uint256)"
];
