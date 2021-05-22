// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/utils/TokenTimelock.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./YieldFarmingToken.sol";
import "./RewardCalculator.sol";

contract YieldFarming is Ownable {
    using SafeERC20 for YieldFarmingToken;
    using SafeERC20 for IERC20;

    event AcceptedTokenDeposit(address messageSender, uint amount);
    event YieldFarmingTokenBurn(address burner, uint amount);
    event YieldFarmingTokenRelease(address releaser, uint amount);

    RewardCalculator immutable private rewardCalculator;
    YieldFarmingToken immutable public yieldFarmingToken;
    IERC20 immutable private acceptedToken;
    bytes16 private interestRate;
    bytes16 private multiplier;
    uint private lockTime;
    uint private tokenomicsTimestamp;

    mapping(address => TokenTimelock) private tokenTimeLocks;

    constructor(IERC20 _acceptedToken, RewardCalculator _rewardCalculator, string memory _tokenName, string memory _tokenSymbol, bytes16 _interestRate, bytes16 _multiplier, uint _lockTime){
        updateTokenomics(_interestRate, _multiplier, _lockTime);
        yieldFarmingToken = new YieldFarmingToken(_tokenName, _tokenSymbol);
        rewardCalculator = _rewardCalculator;
        acceptedToken = _acceptedToken;
    }

    function updateTokenomics(bytes16 _newInterestRate, bytes16 _newMultiplier, uint _newLockTime) public onlyOwner{
        interestRate = _newInterestRate;
        multiplier = _newMultiplier;
        lockTime = _newLockTime;
        // solhint-disable-next-line not-rely-on-time
        tokenomicsTimestamp = block.timestamp;
    }

    function deposit(uint amount) public {
        address messageSender = _msgSender();
        acceptedToken.safeTransferFrom(messageSender, address(this), amount);
        emit AcceptedTokenDeposit(messageSender, amount);
        // solhint-disable-next-line not-rely-on-time
        TokenTimelock tokenTimeLock = new TokenTimelock(yieldFarmingToken, messageSender, block.timestamp + lockTime);
        tokenTimeLocks[messageSender] = tokenTimeLock;
        yieldFarmingToken.mint(
            address(tokenTimeLock),
            rewardCalculator.calculateQuantity(amount, multiplier, interestRate, tokenomicsTimestamp)
        );
    }

    function burn(uint amount) public {
        address burner = _msgSender();
        // // Original implementation:
        // yieldFarmingToken.safeTransferFrom(burner, address(this), amount);
        // yieldFarmingToken.safeIncreaseAllowance(address(this), amount);
        // yieldFarmingToken.burn(amount);
        
        // Optimized implementation:
        yieldFarmingToken.burnFrom(burner, amount);
        
        emit YieldFarmingTokenBurn(burner, amount);
    }

    function getMyTokenTimelock() public view returns (TokenTimelock) {
        address msgSender = _msgSender();
        require(address(tokenTimeLocks[msgSender]) != address(0), "TokenTimelock not found!");
        return tokenTimeLocks[msgSender];
    }

    function releaseTokens() public {
        address releaser = _msgSender();
        TokenTimelock tokenTimelock = getMyTokenTimelock();
        uint amount = yieldFarmingToken.balanceOf(address(tokenTimelock));
        tokenTimelock.release();
        emit YieldFarmingTokenRelease(releaser, amount);
    }
}