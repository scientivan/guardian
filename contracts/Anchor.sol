// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Append-only registry of document hashes and audit-log heads.
// An anchor proves a hash existed at a block time. It does not prove who issued the document.
contract Anchor {
    event Anchored(bytes32 indexed hash, string kind, address indexed by, uint256 at);

    mapping(bytes32 => uint256) public anchoredAt;

    function anchor(bytes32 hash, string calldata kind) external {
        require(anchoredAt[hash] == 0, "already anchored");
        anchoredAt[hash] = block.timestamp;
        emit Anchored(hash, kind, msg.sender, block.timestamp);
    }
}
