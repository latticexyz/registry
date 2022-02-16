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
        address owner 
    ) external view returns (string memory);
}

struct Deployment {
    address contractAddress;
    uint256 chainId;
    string deploymentURI;
}
// TODO @smsunarto:
// Do we store the deployment IDs in channel on-chain?

contract Registry is BaseRelayRecipient, ERC721 {
    event ChannelCreated(uint256 indexed channelId, string indexed channelName, address indexed channelOwner);
    event DeploymentCreated(uint256 indexed deploymentId, address indexed deployer, Deployment deployment);
    event DeploymentAddedToChannel(uint256 indexed channelId, uint256 indexed deploymentId);
    event DeploymentRemovedFromChannel(uint256 indexed channelId, uint256 indexed deploymentId);

    address public contractOwner;
    uint256 internal currentDeploymentId;
    uint256 internal currentChannelId;

    ChannelTokenURIGenerator public channelTokenURIGenerator;

    // CHANNELS
    // address => can mint channel
    mapping(address => bool) public isMinter;
    // channel name => channel id
    mapping(string => uint256) public channelNameToChannelId;
    // channel id => channel name
    mapping(uint256 => string) public channelIdToChannelName;


    // DEPLOYMENTS

    // deployment id => deployer
    mapping(uint256 => address) public deployerOf;
    // deployment id => deployment
    mapping(uint256 => Deployment) public deployments;
    

    constructor(
        string memory name,
        string memory symbol,
        address channelTokenURIGeneratorAddr
    ) ERC721(name, symbol) {
        currentDeploymentId = 1;
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
    }

    function setOwner(address newContractOwner) public onlyContractOwner {
        require(newContractOwner != address(0), "ZERO_ADDR");
        contractOwner = newContractOwner;
    }

    /*///////////////////////////////////////////////////////////////
                               DEPLOYMENTS
    //////////////////////////////////////////////////////////////*/

    function createDeployment(address contractAddress, uint256 chainId, string calldata deploymentURI) public {
        require(contractAddress != address(0), "ZERO_ADDR");
        require(chainId != 0, "NO_CHAIN_ID");
        require(bytes(deploymentURI).length != 0, "NO_DEPLOYMENT_URI");

        address deployer = _msgSender();

        deployments[currentDeploymentId] = Deployment({
            contractAddress: contractAddress,
            chainId: chainId,
            deploymentURI: deploymentURI
        });

        deployerOf[currentDeploymentId] = deployer;
        emit DeploymentCreated(currentDeploymentId, deployer, deployments[currentDeploymentId]);
        currentDeploymentId++;
    }
    
    /*///////////////////////////////////////////////////////////////
                               CHANNELS
    //////////////////////////////////////////////////////////////*/

    function addDeploymentToChannel(uint256 channelId, uint256 deploymentId) public onlyChannelOwner(channelId) {
        require(deployerOf[deploymentId] != address(0));
        emit DeploymentAddedToChannel(channelId, deploymentId);
    }

    function removeDeploymentFromChannel(uint256 channelId, uint256 deploymentId) public onlyChannelOwner(channelId) {
        require(deployerOf[deploymentId] != address(0));
        emit DeploymentRemovedFromChannel(channelId, deploymentId);
    }

    /*///////////////////////////////////////////////////////////////
                               ERC721
    //////////////////////////////////////////////////////////////*/

    function mint(address to, string calldata channelName) public onlyMinter returns (uint256 id) {
        require(channelNameToChannelId[channelName] == 0, "CHANNEL_ALREADY_EXISTS");
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
        return channelTokenURIGenerator.generateTokenURI(channelId, ownerOf[channelId]);
    }
}
