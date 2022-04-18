// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {BaseRelayRecipient} from "gsn/BaseRelayRecipient.sol";

interface Registry {
    function addInstanceToChannel(uint256 channelId, uint256 instanceId) external;

    function removeInstanceFromChannel(uint256 channelId, uint256 instanceId) external;

    function safeTransferFrom(
        address from,
        address to,
        uint256 id
    ) external;
}

contract ProxyRegistryInstanceAdder is BaseRelayRecipient {
    address public contractOwner;

    Registry public registry;

    constructor() {
        contractOwner = msg.sender;
    }

    /*///////////////////////////////////////////////////////////////
                            ACCESS CONTROL
    //////////////////////////////////////////////////////////////*/

    modifier onlyContractOwner() {
        require(_msgSender() == contractOwner, "ONLY_CONTRACT_OWNER");
        _;
    }

    /*///////////////////////////////////////////////////////////////
                            GSN SUPPORT
    //////////////////////////////////////////////////////////////*/

    function versionRecipient() public pure override returns (string memory) {
        return "0.0.1";
    }

    /*///////////////////////////////////////////////////////////////
                               ADMIN
    //////////////////////////////////////////////////////////////*/

    function setTrustedForwarder(address trustedForwarderAddr) public onlyContractOwner {
        _setTrustedForwarder(trustedForwarderAddr);
    }

    function setOwner(address newContractOwner) public onlyContractOwner {
        require(newContractOwner != address(0), "ZERO_ADDR");
        contractOwner = newContractOwner;
    }

    function setRegistryAddress(address registryAddress) public onlyContractOwner {
        registry = Registry(registryAddress);
    }

    function withdrawChannel(uint256 channelId) public onlyContractOwner {
        registry.safeTransferFrom(address(this), contractOwner, channelId);
    }

    /*///////////////////////////////////////////////////////////////
                              REGISTRY
    //////////////////////////////////////////////////////////////*/

    function addInstanceToChannel(uint256 channelId, uint256 instanceId) public {
        registry.addInstanceToChannel(channelId, instanceId);
    }

    function removeInstanceFromChannel(uint256 channelId, uint256 instanceId) public onlyContractOwner {
        registry.removeInstanceFromChannel(channelId, instanceId);
    }
}
