// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;
import {Base64} from "base64/base64.sol";

interface ChannelTokenURIGenerator {
    function generateTokenURI(
        uint256 channelId,
        address owner,
        string calldata channelName
    ) external view returns (string memory);
}

contract SimpleChannelTokenURIGenerator is ChannelTokenURIGenerator {
    function _base64Encode(bytes memory unencoded) internal pure returns (string memory) {
        return Base64.encode(unencoded);
    }

    /// Encodes the argument json bytes into base64-data uri format
    /// @param json Raw json to base64 and turn into a data-uri
    function _encodeMetadataJSON(bytes memory json) internal pure returns (string memory) {
        return string(abi.encodePacked("data:application/json;base64,", _base64Encode(json)));
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        // Inspired by OraclizeAPI's implementation - MIT licence
        // https://github.com/oraclize/ethereum-api/blob/b42146b063c7d6ee1358846c198246239e9360e8/oraclizeAPI_0.4.25.sol

        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function generateTokenURI(
        uint256 channelId,
        address owner,
        string calldata channelName
    ) external view returns (string memory) {
        return
            _encodeMetadataJSON(
                abi.encodePacked(
                    '{"name": "Channel: ',
                    channelName,
                    unicode'", "description": "The Lattice Channels are used for the permisionless distribution of open games on the Lattice Protocol.\\n\\nView this NFT at [https://lattice.xyz/channel/',
                    channelName,
                    "](https://lattice.xyz/channel/",
                    channelName,
                    ')"}'
                )
            );
    }
}
