const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const token = await hre.ethers.deployContract("CFNC");
  await token.waitForDeployment();

  const ico = await hre.ethers.deployContract("ico", [
    token.target,
    process.env.startTime,
    process.env.endTime,
    5,
  ]);
  await ico.waitForDeployment();

  await token.transferToIco(ico.target);

  console.log(`Token deployed @ ${token.target}`);
  console.log(`ICO deployed @ ${ico.target}`);
  await token.transferToIco(ico.target);
  console.log("Token transferd to ICO");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});