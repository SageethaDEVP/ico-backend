const { expect } = require("chai");
const { ethers } = require("hardhat");
const { zeroAddress } = require("../helpers/index");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
require("dotenv").config();

const toWei = (amount) => ethers.parseEther(amount.toString());

const parseAndTruncate = (amount) => {
  const a = ethers.formatEther(amount.toString());
  return Math.trunc(a * 100) / 100;
};

const setBlockTimeWithIncrement = async (additionalTime) => {
  const currentTimeInSeconds = await getCurrentBlockTime();
  await time.increaseTo(currentTimeInSeconds + additionalTime);
};

const getCurrentBlockTime = async () => {
  return await time.latest();
};

describe("1. ICO", () => {
  const user2 = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";
  let ico;
  const oneUsdt = 10 ** 6;
  const cfncPerUsdt = 33.33;
  const bonusPerUsdt = 1.66;
  const claimTokens = toWei(cfncPerUsdt);
  let owner = process.env.admin_address;
  let token;
  let user = process.env.user_address;
  let addr1, addr2;

  beforeEach(async () => {
    [addr1, addr2] = await ethers.getSigners();
    token = await hre.ethers.deployContract("CFNC");
    let startTime = (await getCurrentBlockTime()) + 7;
    let endTime = (await getCurrentBlockTime()) + 60 * 60;
    await token.waitForDeployment();
    ico = await ethers.deployContract("ico", [
      token.target,
      startTime,
      endTime,
      5,
    ]);
    await token.transferToIco(ico.target);
    await ico.waitForDeployment();
  });

  it("should set the correct owner", async () => {
    expect(await ico.owner()).to.equal(owner);
  });

  it("Should test global states", async () => {
    expect(await ico.pricePerToken()).to.equal(3 * 10 ** 4);
    expect(await ico.startTime()).to.be.above(0);
    expect(await ico.endTime()).to.be.above(0);
    expect(await ico.bonusPercentage()).to.equal(5);
  });

  it("should test ICO state", async () => {
    expect(await ico.getIcoStage()).to.equal(0);
  });

  describe("2. Test update balance", () => {
    it("Should update balance of the user account", async () => {
      await setBlockTimeWithIncrement(7);
      await ico.updateBalance(oneUsdt, user, zeroAddress);
      const res = parseAndTruncate(await ico.contributers(user));
      expect(res).to.equal(cfncPerUsdt);
    });

    it("Should update bonus amount to the referal address", async () => {
      await setBlockTimeWithIncrement(7);
      await ico.updateBalance(oneUsdt, user, zeroAddress);
      await ico.updateBalance(oneUsdt, user2, user);
      const res = parseAndTruncate(await ico.bonusAmounts(user));
      expect(res).to.equal(bonusPerUsdt);
    });

    describe("- Revert cases", () => {
      it("Should revert if caller is not owner", async () => {
        await setBlockTimeWithIncrement(7);
        expect(
          ico.connect(addr2).updateBalance(oneUsdt, user, zeroAddress)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });
      it("Should revert if ref address has not invested", async () => {
        await setBlockTimeWithIncrement(7);
        await expect(
          ico.updateBalance(oneUsdt, user2, user)
        ).to.be.revertedWith("ICO: Invalid investor referral address");
      });

      it("Should revert if ICO not started", async () => {
        await expect(
          ico.updateBalance(oneUsdt, user, zeroAddress)
        ).to.be.revertedWith("ICO: ICO not started yet");
      });

      it("Should revert if ICO finished", async () => {
        await setBlockTimeWithIncrement(10);
        const blockTime = await getCurrentBlockTime();
        await ico.changeEndTime(blockTime);
        let res;
        expect(
          (res = ico.updateBalance(oneUsdt, user, zeroAddress))
        ).to.be.revertedWith("ICO: ICO already ended");
        await res;
      });
    });
  });

  describe("3. Test Token claim", () => {
    const applyAndEnd = async () => {
      await setBlockTimeWithIncrement(7);
      await ico.updateBalance(oneUsdt, addr1.address, zeroAddress);
      await setBlockTimeWithIncrement(10);
      const blockTime = await getCurrentBlockTime();
      await ico.changeEndTime(blockTime);
      await setBlockTimeWithIncrement(10);
    };

    it("Should claim tokens", async () => {
      await applyAndEnd();
      await ico.connect(addr1).claimToken(addr1.address, claimTokens);
      const balance = await token.balanceOf(addr1.address);
      expect(balance).to.equal(claimTokens);
    });

    describe("- Revert cases", () => {
      it("Should revert if caller is not owner", async () => {
        await applyAndEnd();
        await expect(ico.claimToken(user, claimTokens)).to.be.revertedWith(
          "ICO: not authorised"
        );
      });

      it("Should revert if ICO not ended", async () => {
        await setBlockTimeWithIncrement(7);
        await ico.updateBalance(oneUsdt, addr1.address, zeroAddress);
        await expect(
          ico.connect(addr1).claimToken(addr1.address, claimTokens)
        ).to.be.revertedWith("ICO: ICO not yet ended.");
      });

      it("Should revert if user has not invested", async () => {
        await applyAndEnd();
        let res;
        expect(
          (res = ico.connect(addr2).claimToken(addr1.address, claimTokens))
        ).to.be.revertedWith("ICO: Insufficient user balance");
      });

      it("Should revert if user claim more then his balance", async () => {
        await applyAndEnd();
        await expect(
          ico
            .connect(addr1)
            .claimToken(addr1.address, claimTokens + claimTokens)
        ).to.be.revertedWith("ICO: claim amount exceeds");
      });
    });
  });

  describe("4. Test Bonus claim", () => {
    const claimAmount = toWei(1);
    let addr2;
    const applyAndEnd = async () => {
      addr2 = await ethers.getSigner(
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
      );
      await setBlockTimeWithIncrement(7);
      await ico.updateBalance(oneUsdt, addr1.address, zeroAddress);
      await ico.updateBalance(oneUsdt, addr2.address, addr1.address);
      await setBlockTimeWithIncrement(10);
      const blockTime = await getCurrentBlockTime();
      await ico.changeEndTime(blockTime);
      await setBlockTimeWithIncrement(10);
    };

    it("Should claim bonus", async () => {
      await applyAndEnd();
      await ico.connect(addr1).claimBonusToken(addr1.address, claimAmount);
      const balance = await token.balanceOf(addr1.address);
      expect(balance).to.equal(claimAmount);
    });

    describe("- Revert cases", () => {
      it("Should revert if caller is not owner", async () => {
        await applyAndEnd();
        await expect(ico.claimBonusToken(user, claimTokens)).to.be.revertedWith(
          "ICO: not authorised"
        );
      });

      it("Should revert if ICO not ended", async () => {
        await setBlockTimeWithIncrement(7);
        await ico.updateBalance(oneUsdt, addr1.address, zeroAddress);
        await expect(
          ico.connect(addr1).claimBonusToken(addr1.address, claimTokens)
        ).to.be.revertedWith("ICO: ICO not yet ended.");
      });

      it("Should revert if user has not invested", async () => {
        await applyAndEnd();
        let res;
        expect(
          (res = ico.connect(addr2).claimBonusToken(addr1.address, claimTokens))
        ).to.be.revertedWith("ICO: Insufficient user balance");
      });

      it("Should revert if user claim more then his balance", async () => {
        await applyAndEnd();
        await expect(
          ico
            .connect(addr1)
            .claimBonusToken(addr1.address, claimTokens + claimTokens)
        ).to.be.revertedWith("ICO: claim amount exceeds");
      });
    });
  });

  describe("5. Test admin functions", () => {
    it("Should update end time", async () => {
      const blockTime = await getCurrentBlockTime();
      await ico.changeEndTime(blockTime + 1000);
      expect(await ico.endTime()).to.equal(blockTime + 1000);
    });

    it("Should update bonus percentage", async () => {
      await ico.updateBonusPercentage(10);
      expect(await ico.bonusPercentage()).to.equal(10);
    });

    it("Should update price per token", async () => {
      await ico.updatePricePerToken(10);
      expect(await ico.pricePerToken()).to.equal(10);
    });

    it("Should withdraw all remaining tokens", async () => {
      addr2 = await ethers.getSigner(
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
      );
      await setBlockTimeWithIncrement(10);
      const blockTime = await getCurrentBlockTime();
      await ico.changeEndTime(blockTime);
      await setBlockTimeWithIncrement(10);

      const balance = await token.balanceOf(ico.target);
      expect(balance).to.be.gt(0);
      await ico.withdrawRemainingToken(addr1.address);
      expect(await token.balanceOf(ico.target)).to.equal(0);
    });

    describe("- Revert cases", () => {
      it("Change end time Should revert if caller is not owner", async () => {
        expect(ico.connect(addr2).changeEndTime(1000)).to.be.revertedWith(
          "Ownable: caller is not the owner"
        );
      });

      it("Should revert if start time is greater than end time", async () => {
        let startTime = await ico.startTime();
        expect(ico.changeEndTime(startTime)).to.be.revertedWith(
          "IOC: Ensure that the end time occurs after the start time."
        );
      });

      it("Update bonus percentage Should revert if caller is not owner", async () => {
        expect(ico.connect(addr2).updateBonusPercentage(10)).to.be.revertedWith(
          "Ownable: caller is not the owner"
        );
      });
      it("Update price per token Should revert if caller is not owner", async () => {
        expect(ico.connect(addr2).updatePricePerToken(10)).to.be.revertedWith(
          "Ownable: caller is not the owner"
        );
      });
      it("Should revert if new price per token is less than or equal to 0", async () => {
        expect(ico.updatePricePerToken(0)).to.be.revertedWith(
          "Price can't be zero"
        );
      });
      it("Withdraw all remaining tokens Should revert if caller is not owner", async () => {
        expect(
          ico.connect(addr2).withdrawRemainingToken(addr1.address)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });
      it("Should revert if ICO not ended", async () => {
        await setBlockTimeWithIncrement(7);
        await ico.updateBalance(oneUsdt, addr1.address, zeroAddress);
        await expect(
          ico.connect(addr1).withdrawRemainingToken(addr1.address)
        ).to.be.revertedWith("ICO: ICO not yet ended.");
      });
      it("Should revert if there are no tokens to withdraw", async () => {
        await setBlockTimeWithIncrement(10);
        const blockTime = await getCurrentBlockTime();
        await ico.changeEndTime(blockTime);
        await setBlockTimeWithIncrement(10);
        await ico.connect(addr1).withdrawRemainingToken(addr1.address);
        expect(
          ico.connect(addr1).withdrawRemainingToken(addr1.address)
        ).to.be.revertedWith("ICO: There are no tokens to withdraw");
      });
    });
  });
});
