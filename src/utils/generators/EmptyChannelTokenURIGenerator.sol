// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

interface ChannelTokenURIGenerator {
    function generateTokenURI(uint256 channelId, address owner) external view returns (string memory);
}

contract EmptyChannelTokenURIGenerator is ChannelTokenURIGenerator {
    function generateTokenURI(uint256 channelId, address owner) external view returns (string memory) {
        return "";
    }
}
