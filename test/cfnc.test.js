const { expect } = require("chai");
const { ethers } = require("hardhat");
require("dotenv").config();

const toWei = (amount) => ethers.parseEther(amount.toString());

const parseAndTruncate = (amount) => {
  const a = ethers.formatEther(amount.toString());
  return Math.trunc(a * 100) / 100;
};

describe("CFNC token", () => {
  let token;
  let addr1, addr2;
  beforeEach(async () => {
    [addr1, addr2] = await ethers.getSigners();
    token = await hre.ethers.deployContract("CFNC");
    await token.waitForDeployment();
  });

  it("Should have correct name and symbol", async () => {
    const name = await token.name();
    const symbol = await token.symbol();
    expect(name).to.equal("Chief Finance Token");
    expect(symbol).to.equal("CFNC");
  });

  it("Should have correct decimals", async () => {
    const decimals = await token.decimals();
    expect(decimals).to.equal(18);
  });

  it("Should have correct total supply", async () => {
    const totalSupply = await token.totalSupply();
    expect(parseAndTruncate(totalSupply)).to.equal(750000000);
  });

  it("Should mint tokens to user", async () => {
    const amount = toWei(1000);
    await token.mint(addr1.address, amount);
    const balance = await token.balanceOf(addr1.address);
    expect(parseAndTruncate(balance)).to.equal(750001000);
  });

  describe("Revert cases", () => {
    beforeEach(async () => {
      addr2 = await ethers.getSigner(
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
      );
    });

    it("Should revert if caller is not owner", async () => {
      const amount = toWei(1000);
      await expect(
        token.connect(addr2).mint(addr1.address, amount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
