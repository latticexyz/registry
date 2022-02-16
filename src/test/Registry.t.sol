// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {BaseTest, console} from "./base/BaseTest.sol";

import {Registry} from "../Registry.sol";
import "./utils/console.sol";

contract RegistryTest is BaseTest {
    Registry registry;

    address deployer = address(1);
    address alice = address(2);

    function setUp() public {
        vm.startPrank(deployer);
        registry = new Registry("L", "L");
        vm.stopPrank();
    }

    /*///////////////////////////////////////////////////////////////
                            PERSONA TESTS
    //////////////////////////////////////////////////////////////*/
    // Access Control \\
    function testSetOwner() public {
        vm.prank(deployer);
        registry.setOwner(alice);
        assertEq(registry.contractOwner(), alice);
    }

    function testFailSetOwnerZeroAddr() public {
        vm.prank(deployer);
        registry.setOwner(address(0));
    }
}
