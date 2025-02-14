// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CFNC is ERC20, Ownable {
    constructor() ERC20("Chief Finance Token", "CFNC") {
        Ownable(msg.sender);
        uint256 maxSupply = 750000000 * 10 ** decimals();
        _mint(msg.sender, maxSupply);
    }

    function mint(address _toAddress, uint256 _amount) public onlyOwner {
        require(_amount > 0, "Invalid amount");
        _mint(_toAddress, _amount);
    }

    function transferToIco(address _ico) public onlyOwner {
        transfer(_ico, balanceOf(msg.sender));
    }
}
