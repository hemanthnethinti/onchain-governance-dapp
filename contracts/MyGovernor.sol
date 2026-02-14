// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";

contract MyGovernor is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction
{
    enum VotingType {
        Standard,
        Quadratic
    }

    mapping(uint256 => VotingType) private _proposalVotingType;

    event ProposalVotingTypeSet(uint256 proposalId, VotingType votingType);

    constructor(
        IVotes token,
        uint256 votingDelayBlocks,
        uint256 votingPeriodBlocks,
        uint256 proposalThresholdTokens,
        uint256 quorumPercent
    )
        Governor("MyGovernor")
        GovernorSettings(votingDelayBlocks, votingPeriodBlocks, proposalThresholdTokens)
        GovernorVotes(token)
        GovernorVotesQuorumFraction(quorumPercent)
    {}

    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public override returns (uint256) {
        uint256 proposalId = super.propose(targets, values, calldatas, description);
        _proposalVotingType[proposalId] = VotingType.Standard;
        emit ProposalVotingTypeSet(proposalId, VotingType.Standard);
        return proposalId;
    }

    function proposeWithType(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description,
        VotingType votingType
    ) external returns (uint256) {
        uint256 proposalId = super.propose(targets, values, calldatas, description);
        _proposalVotingType[proposalId] = votingType;
        emit ProposalVotingTypeSet(proposalId, votingType);
        return proposalId;
    }

    function proposalVotingType(uint256 proposalId) external view returns (VotingType) {
        return _proposalVotingType[proposalId];
    }

    function castQuadraticVote(uint256 proposalId, uint8 support, uint256 votes)
        external
        returns (uint256)
    {
        bytes memory params = abi.encode(votes);
        return _castVote(proposalId, _msgSender(), support, "", params);
    }

    function votingDelay() public view override(IGovernor, GovernorSettings) returns (uint256) {
        return super.votingDelay();
    }

    function votingPeriod() public view override(IGovernor, GovernorSettings) returns (uint256) {
        return super.votingPeriod();
    }

    function quorum(uint256 blockNumber)
        public
        view
        override(IGovernor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(Governor)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _castVote(
        uint256 proposalId,
        address account,
        uint8 support,
        string memory reason,
        bytes memory params
    ) internal override returns (uint256) {
        require(state(proposalId) == ProposalState.Active, "Governor: vote not currently active");

        uint256 snapshot = proposalSnapshot(proposalId);
        uint256 weight;

        if (_proposalVotingType[proposalId] == VotingType.Quadratic) {
            require(params.length > 0, "Governor: quadratic votes required");
            uint256 votes = abi.decode(params, (uint256));
            require(votes > 0, "Governor: quadratic votes required");

            uint256 available = _getVotes(account, snapshot, "");
            uint256 cost = votes * votes;
            require(cost <= type(uint256).max / 1e18, "Governor: quadratic cost overflow");
            cost = cost * 1e18;
            require(cost <= available, "Governor: insufficient tokens for quadratic votes");
            weight = votes * 1e18;
        } else {
            weight = _getVotes(account, snapshot, params);
        }

        _countVote(proposalId, account, support, weight, params);

        emit VoteCast(account, proposalId, support, weight, reason);

        return weight;
    }
}
