// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract StagedICO is ERC20, Ownable, ReentrancyGuard {
    enum Stage {
        Preseed,
        Seed,
        Private,
        Public
    }

    Stage public currentStage;
    mapping(Stage => uint256) public stagePrices;
    mapping(Stage => uint256) public stageSupplies;
    mapping(Stage => uint256) public stageCaps;
    mapping(Stage => uint256) public stageStartTimes;
    mapping(Stage => uint256) public stageEndTimes;
    mapping(address => bool) public whitelist;

    uint256 public constant TOTAL_SUPPLY = 1000000 * 10 ** 18; // 1 million tokens

    constructor() ERC20("StagedICOToken", "SIT") {
        _mint(address(this), TOTAL_SUPPLY);

        // Set up stage details
        stagePrices[Stage.Preseed] = 100; // 1 ETH = 100 tokens
        stagePrices[Stage.Seed] = 80;
        stagePrices[Stage.Private] = 60;
        stagePrices[Stage.Public] = 40;

        stageSupplies[Stage.Preseed] = 100000 * 10 ** 18;
        stageSupplies[Stage.Seed] = 200000 * 10 ** 18;
        stageSupplies[Stage.Private] = 300000 * 10 ** 18;
        stageSupplies[Stage.Public] = 400000 * 10 ** 18;

        stageCaps[Stage.Preseed] = 1000 ether;
        stageCaps[Stage.Seed] = 2500 ether;
        stageCaps[Stage.Private] = 5000 ether;
        stageCaps[Stage.Public] = 10000 ether;

        // Set stage times (example: each stage lasts 7 days)
        uint256 startTime = block.timestamp;
        for (uint i = 0; i < 4; i++) {
            Stage stage = Stage(i);
            stageStartTimes[stage] = startTime + (i * 7 days);
            stageEndTimes[stage] = stageStartTimes[stage] + 7 days;
        }

        currentStage = Stage.Preseed;
    }

    function addToWhitelist(address[] memory addresses) external onlyOwner {
        for (uint i = 0; i < addresses.length; i++) {
            whitelist[addresses[i]] = true;
        }
    }

    function removeFromWhitelist(
        address[] memory addresses
    ) external onlyOwner {
        for (uint i = 0; i < addresses.length; i++) {
            whitelist[addresses[i]] = false;
        }
    }

    function buyTokens() external payable nonReentrant {
        require(
            block.timestamp >= stageStartTimes[currentStage],
            "Sale has not started"
        );
        require(
            block.timestamp <= stageEndTimes[currentStage],
            "Sale has ended"
        );
        require(msg.value > 0, "Must send ETH");

        if (currentStage != Stage.Public) {
            require(whitelist[msg.sender], "Not whitelisted");
        }

        uint256 tokensToBuy = msg.value * stagePrices[currentStage];
        require(
            tokensToBuy <= stageSupplies[currentStage],
            "Not enough tokens left in this stage"
        );

        stageSupplies[currentStage] -= tokensToBuy;
        _transfer(address(this), msg.sender, tokensToBuy);

        if (address(this).balance >= stageCaps[currentStage]) {
            moveToNextStage();
        }
    }

    function moveToNextStage() internal {
        if (currentStage == Stage.Preseed) {
            currentStage = Stage.Seed;
        } else if (currentStage == Stage.Seed) {
            currentStage = Stage.Private;
        } else if (currentStage == Stage.Private) {
            currentStage = Stage.Public;
        }
    }

    function withdrawFunds() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
