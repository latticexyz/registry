// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {ERC721} from "solmate/tokens/ERC721.sol";
import {BaseRelayRecipient} from "gsn/BaseRelayRecipient.sol";

/// @notice A generic interface for a contract which properly accepts ERC721 tokens.
/// @author Solmate (https://github.com/Rari-Capital/solmate/blob/main/src/tokens/ERC721.sol)
interface ERC721TokenReceiver {
    function onERC721Received(
        address operator,
        address from,
        uint256 id,
        bytes calldata data
    ) external returns (bytes4);
}

interface ChannelTokenURIGenerator {
    function generateTokenURI(
        uint256 channelId,
        address owner,
        string calldata channelName
    ) external view returns (string memory);
}

contract Registry is BaseRelayRecipient, ERC721 {
    event ChannelCreated(uint256 indexed channelId, string indexed channelName, address indexed channelOwner);
    event InstanceCreated(uint256 indexed instanceId, address indexed creator, Instance instance);
    event InstanceURIUpdated(uint256 indexed instanceId, string instanceURI);
    event InstanceAddedToChannel(uint256 indexed channelId, uint256 indexed instanceId);
    event InstanceRemovedFromChannel(uint256 indexed channelId, uint256 indexed instanceId);
    event NewChannelTokenURIGenerator(address indexed generator);

    address public contractOwner;
    uint256 public currentChannelId;
    uint256 internal currentInstanceId;

    ChannelTokenURIGenerator public channelTokenURIGenerator;

    struct Instance {
        address creator;
        address contractAddress;
        uint256 chainId;
        string instanceURI;
    }

    // CHANNELS
    // address => can mint channel
    mapping(address => bool) public isMinter;
    // channel name => channel id
    mapping(string => uint256) public channelNameToChannelId;
    // channel id => channel name
    mapping(uint256 => string) public channelIdToChannelName;

    // INSTANCES
    // instance id => instance
    mapping(uint256 => Instance) public instances;

    constructor(
        string memory name,
        string memory symbol,
        address channelTokenURIGeneratorAddr
    ) ERC721(name, symbol) {
        currentInstanceId = 1;
        currentChannelId = 1;
        contractOwner = msg.sender;
        channelTokenURIGenerator = ChannelTokenURIGenerator(channelTokenURIGeneratorAddr);
    }

    /*///////////////////////////////////////////////////////////////
                            ACCESS CONTROL
    //////////////////////////////////////////////////////////////*/

    modifier onlyMinter() {
        require(isMinter[_msgSender()], "ONLY_MINTER");
        _;
    }

    modifier onlyContractOwner() {
        require(_msgSender() == contractOwner, "ONLY_CONTRACT_OWNER");
        _;
    }

    modifier onlyChannelOwner(uint256 channelId) {
        require(_msgSender() == ownerOf[channelId], "ONLY_CHANNEL_OWNER");
        _;
    }

    modifier onlyInstanceCreator(uint256 instanceId) {
        require(_msgSender() == instances[instanceId].creator, "ONLY_INSTANCE_CREATOR");
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

    function setMinter(address minter, bool allowMint) public onlyContractOwner {
        isMinter[minter] = allowMint;
    }

    function setChannelTokenURIGeneratorAddress(address channelTokenURIGeneratorAddr) public onlyContractOwner {
        channelTokenURIGenerator = ChannelTokenURIGenerator(channelTokenURIGeneratorAddr);
        emit NewChannelTokenURIGenerator(channelTokenURIGeneratorAddr);
    }

    function setOwner(address newContractOwner) public onlyContractOwner {
        require(newContractOwner != address(0), "ZERO_ADDR");
        contractOwner = newContractOwner;
    }

    /*///////////////////////////////////////////////////////////////
                               INSTANCES
    //////////////////////////////////////////////////////////////*/

    function createInstance(
        address contractAddress,
        uint256 chainId,
        string calldata instanceURI
    ) public {
        require(contractAddress != address(0), "ZERO_ADDR");
        require(chainId != 0, "NO_CHAIN_ID");
        require(bytes(instanceURI).length != 0, "NO_INSTANCE_URI");

        instances[currentInstanceId] = Instance({
            contractAddress: contractAddress,
            chainId: chainId,
            instanceURI: instanceURI,
            creator: _msgSender()
        });

        emit InstanceCreated(currentInstanceId, _msgSender(), instances[currentInstanceId]);
        currentInstanceId++;
    }

    function updateInstanceURI(uint256 instanceId, string calldata instanceURI) public onlyInstanceCreator(instanceId) {
        require(bytes(instanceURI).length != 0, "NO_INSTANCE_URI");
        instances[instanceId].instanceURI = instanceURI;
        emit InstanceURIUpdated(instanceId, instanceURI);
    }

    /*///////////////////////////////////////////////////////////////
                               CHANNELS
    //////////////////////////////////////////////////////////////*/

    function _validateChannelName(string memory channelName) internal pure returns (bool) {
        bytes memory _bytes = abi.encodePacked(bytes(channelName));

        // Validation: Name between 3 - 30 characters
        if (_bytes.length < 3 || _bytes.length > 30) return false;

        // Validation: No special characters
        // Only lowercase letters and "-"
        for (uint256 i = 0; i < _bytes.length; i++) {
            bytes1 char = _bytes[i];
            uint8 charInt = uint8(char);
            if (!((charInt >= 97 && charInt <= 122) || (charInt == 45))) return false;
        }

        return true;
    }

    function addInstanceToChannel(uint256 channelId, uint256 instanceId) public onlyChannelOwner(channelId) {
        require(instances[instanceId].creator != address(0), "INSTANCE_DOES_NOT_EXIST");
        emit InstanceAddedToChannel(channelId, instanceId);
    }

    function removeInstanceFromChannel(uint256 channelId, uint256 instanceId) public onlyChannelOwner(channelId) {
        require(instances[instanceId].creator != address(0), "INSTANCE_DOES_NOT_EXIST");
        emit InstanceRemovedFromChannel(channelId, instanceId);
    }

    /*///////////////////////////////////////////////////////////////
                               ERC721
    //////////////////////////////////////////////////////////////*/

    // Note: This mints channel
    function mint(address to, string memory channelName) public onlyMinter returns (uint256 id) {
        require(_validateChannelName(channelName), "CHANNEL_NAME_INVALID");
        require(channelNameToChannelId[channelName] == 0, "CHANNEL_ALREADY_EXISTS");

        id = currentChannelId;
        _mint(to, currentChannelId);

        channelNameToChannelId[channelName] = currentChannelId;
        channelIdToChannelName[currentChannelId] = channelName;

        emit ChannelCreated(currentChannelId, channelName, ownerOf[currentChannelId]);
        currentChannelId++;
    }

    function approve(address spender, uint256 id) public override {
        address owner = ownerOf[id];
        require(_msgSender() == owner || isApprovedForAll[owner][_msgSender()], "NOT_AUTHORIZED");

        getApproved[id] = spender;

        emit Approval(owner, spender, id);
    }

    function setApprovalForAll(address operator, bool approved) public override {
        isApprovedForAll[_msgSender()][operator] = approved;

        emit ApprovalForAll(_msgSender(), operator, approved);
    }

    function _transferFrom(
        address from,
        address to,
        uint256 id
    ) internal {
        require(from == ownerOf[id], "WRONG_FROM");

        require(to != address(0), "INVALID_RECIPIENT");

        require(
            _msgSender() == from || _msgSender() == getApproved[id] || isApprovedForAll[from][_msgSender()],
            "NOT_AUTHORIZED"
        );

        // Underflow of the sender's balance is impossible because we check for
        // ownership above and the recipient's balance can't realistically overflow.
        unchecked {
            balanceOf[from]--;

            balanceOf[to]++;
        }

        ownerOf[id] = to;

        delete getApproved[id];

        emit Transfer(from, to, id);
    }

    function transferFrom(
        address from,
        address to,
        uint256 id
    ) public override {
        _transferFrom(from, to, id);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id
    ) public override {
        // we call the internal transfer from
        _transferFrom(from, to, id);

        require(
            to.code.length == 0 ||
                ERC721TokenReceiver(to).onERC721Received(_msgSender(), from, id, "") ==
                ERC721TokenReceiver.onERC721Received.selector,
            "UNSAFE_RECIPIENT"
        );
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        bytes memory data
    ) public override {
        _transferFrom(from, to, id);

        require(
            to.code.length == 0 ||
                ERC721TokenReceiver(to).onERC721Received(_msgSender(), from, id, data) ==
                ERC721TokenReceiver.onERC721Received.selector,
            "UNSAFE_RECIPIENT"
        );
    }

    function tokenURI(uint256 channelId) public view override returns (string memory) {
        require(channelId < currentChannelId, "TOKEN_DOES_NOT_EXIST");
        return
            channelTokenURIGenerator.generateTokenURI(channelId, ownerOf[channelId], channelIdToChannelName[channelId]);
    }
}
