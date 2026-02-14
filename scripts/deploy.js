const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  const initialSupply = ethers.parseEther("1000000");
  const proposalThreshold = ethers.parseEther("100");
  const votingDelay = 1;
  const votingPeriod = 20;
  const quorumPercent = 4;

  const Token = await ethers.getContractFactory("GovernanceToken");
  const token = await Token.deploy(deployer.address, initialSupply);
  await token.waitForDeployment();

  const Governor = await ethers.getContractFactory("MyGovernor");
  const governor = await Governor.deploy(
    token.target,
    votingDelay,
    votingPeriod,
    proposalThreshold,
    quorumPercent
  );
  await governor.waitForDeployment();

  console.log("Deployer:", deployer.address);
  console.log("GovernanceToken:", token.target);
  console.log("MyGovernor:", governor.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
