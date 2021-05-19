// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract YieldFarmingToken is ERC20Burnable, Ownable {
    constructor (
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) {
    }
    function mint(address recipient, uint amount) public onlyOwner{
        _mint(recipient, amount);
    }
}
