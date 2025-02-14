// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ico is ReentrancyGuard, Ownable {
    using SafeMath for uint256;
    using SafeMath for uint64;
    using SafeMath for uint8;

    IERC20 token;
    uint256 public pricePerToken;
    uint64 public startTime;
    uint64 public endTime;
    uint256 public totalTokenSold;
    uint8 public bonusPercentage;
    uint256 decimals = 10 ** 18;

    enum SaleStage {
        preICO,
        ICO,
        postICO
    }

    SaleStage stage = SaleStage.preICO;

    mapping(address => uint256) public contributers;
    mapping(address => uint) public bonusAmounts;

    event ClaimToken(uint256 amount, address to);
    event UpdateBalance(
        address user,
        uint256 usdtSent,
        uint256 tokenAmount,
        uint256 timestamp
    );
    event PriceUpdate(uint256 newPrice, uint256 updateTime);
    event ClaimBonusToken(uint256 amount, address claimer);
    event ChangeEndTime(uint256 newTime);
    event UpdateBonusPercentage(uint8 newPercentage);
    event UpdatePricePerToken(uint256 newPricePerToken);

    constructor(
        address _token,
        uint64 _startTime,
        uint64 _endTime,
        uint8 _bonusPercentage
    ) {
        require(
            _startTime > block.timestamp && _startTime < _endTime,
            "ICO: Invalid Timestamps"
        );
        Ownable(msg.sender);
        pricePerToken = 3 * (10 ** 4);
        token = IERC20(_token);
        startTime = _startTime;
        endTime = _endTime;
        bonusPercentage = _bonusPercentage;
    }

    function getIcoStage() public view returns (uint8) {
        if (block.timestamp < startTime) return uint8(SaleStage.preICO);
        else if (block.timestamp >= startTime && block.timestamp <= endTime)
            return uint8(SaleStage.ICO);
        else if (block.timestamp > endTime) return uint8(SaleStage.postICO);
        return 3;
    }

    function updateBalance(
        uint256 _sentUsdt,
        address _user,
        address _refAddress
    ) external onlyOwner nonReentrant returns (uint256) {
        require(block.timestamp >= startTime, "ICO: ICO not started yet");
        require(block.timestamp <= endTime, "ICO: ICO already ended");
        require(_sentUsdt > 0, "ICO: received amount can't be 0");
        uint256 updatedBalance = _sentUsdt.mul(decimals).div(pricePerToken);
        require(
            updatedBalance + totalTokenSold <= token.balanceOf(address(this)),
            "ICO: Tokens sold out"
        );
        if (_refAddress != address(0) && _user != _refAddress) {
            require(
                contributers[_refAddress] > 0,
                "ICO: Invalid investor referral address"
            );
            uint256 bonusAmount = updatedBalance.mul(bonusPercentage).div(100);
            bonusAmounts[_refAddress] = bonusAmounts[_refAddress].add(
                bonusAmount
            );
            // bonusAmounts[_user] = bonusAmounts[_user].add(bonusAmount);
        }

        contributers[_user] = contributers[_user].add(updatedBalance);
        totalTokenSold = totalTokenSold.add(updatedBalance);
        emit UpdateBalance(_user, _sentUsdt, updatedBalance, block.timestamp);
        return updatedBalance;
    }

    function claimToken(
        address account,
        uint256 claimAmount
    ) external nonReentrant returns (uint256) {
        require(account == msg.sender, "ICO: not authorised");
        require(block.timestamp > endTime, "ICO: ICO not yet ended.");
        uint256 transferableToken = contributers[account];
        require(transferableToken > 0, "ICO: Insufficient user balance");
        require(transferableToken >= claimAmount, "ICO: claim amount exceeds");
        require(
            transferableToken <= token.balanceOf(address(this)),
            "ICO: Insufficient token to transfer"
        );
        contributers[account] -= claimAmount;
        token.transfer(account, claimAmount);
        if (contributers[account] == 0) delete contributers[account];
        emit ClaimToken(claimAmount, account);
        return claimAmount;
    }

    function claimBonusToken(
        address account,
        uint256 claimAmount
    ) external nonReentrant returns (uint256) {
        require(account == msg.sender, "ICO: not authorised");
        require(block.timestamp > endTime, "ICO: ICO not yet ended.");
        uint256 transferableToken = contributers[account];
        require(transferableToken > 0, "ICO: No token to transfer");
        require(transferableToken >= claimAmount, "ICO: claim amount exceeds");
        require(
            transferableToken <= token.balanceOf(address(this)),
            "ICO: Insufficient token to transfer"
        );
        bonusAmounts[account] -= claimAmount;
        token.transfer(account, claimAmount);
        if (bonusAmounts[account] == 0) delete bonusAmounts[account];
        emit ClaimBonusToken(claimAmount, account);
        return claimAmount;
    }

    function changeEndTime(uint64 _endTime) external onlyOwner {
        require(
            startTime < _endTime,
            "IOC: Ensure that the end time occurs after the start time."
        );
        endTime = _endTime;
        emit ChangeEndTime(endTime);
    }

    function updateBonusPercentage(uint8 _newPercentaeg) external onlyOwner {
        bonusPercentage = _newPercentaeg;
        emit UpdateBonusPercentage(bonusPercentage);
    }

    function updatePricePerToken(uint256 _newPrice) external onlyOwner {
        require(_newPrice > 0, "Price can't be zero");
        pricePerToken = _newPrice;
        emit UpdatePricePerToken(pricePerToken);
    }

    function withdrawRemainingToken(address _to) external onlyOwner {
        require(block.timestamp > endTime, "ICO: ICO not yet ended.");
        require(
            token.balanceOf(address(this)) > 0,
            "ICO: No token to transfer"
        );
        token.transfer(_to, token.balanceOf(address(this)));
    }
}
