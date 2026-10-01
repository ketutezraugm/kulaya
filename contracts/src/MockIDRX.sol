// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @notice TESTNET ONLY stand-in for IDRX (IDR stablecoin, 2 decimals). Open mint = faucet.
contract MockIDRX is ERC20, ERC20Permit {
    constructor() ERC20("Mock IDRX", "IDRX") ERC20Permit("Mock IDRX") {}

    function decimals() public pure override returns (uint8) {
        return 2;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
