// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAgentReputation} from "./Warung.sol";

/// @dev ERC-8004 v2 Reputation Registry (subset).
interface IReputationRegistry {
    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata endpoint,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external;
}

/// @notice Turns Warung loan outcomes into ERC-8004 feedback on the underwriter agent.
/// The adapter (not the agent) is the feedback client, which satisfies the spec rule that an agent's
/// owner may not review itself, and only Warung can make it speak, so the record can't be spammed.
/// Read the agent's track record with getSummary(agentId, [adapter], "warung-loan", "").
contract ReputationAdapter is IAgentReputation {
    IReputationRegistry public immutable registry;
    uint256 public immutable agentId;
    address public immutable warung;

    error OnlyWarung();

    constructor(IReputationRegistry registry_, uint256 agentId_, address warung_) {
        registry = registry_;
        agentId = agentId_;
        warung = warung_;
    }

    /// @dev value 100 = loan fully repaid, 0 = defaulted (2 of 2 decimals unused: plain 0..100 score).
    function recordOutcome(bytes32 loanRef, bool repaid) external {
        if (msg.sender != warung) revert OnlyWarung();
        registry.giveFeedback(agentId, repaid ? int128(100) : int128(0), 0, "warung-loan", repaid ? "repaid" : "default", "", "", loanRef);
    }
}
