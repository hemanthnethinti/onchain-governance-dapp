const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const moveBlocks = async (count) => {
  for (let i = 0; i < count; i += 1) {
    await time.advanceBlock();
  }
};

describe("MyGovernor", function () {
  let token;
  let governor;
  let deployer;
  let voter1;
  let voter2;
  let outsider;

  const initialSupply = ethers.parseEther("1000");
  const proposalThreshold = ethers.parseEther("100");
  const votingDelay = 1;
  const votingPeriod = 5;
  const quorumPercent = 4;

  beforeEach(async function () {
    [deployer, voter1, voter2, outsider] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("GovernanceToken");
    token = await Token.deploy(deployer.address, initialSupply);
    await token.waitForDeployment();

    const Governor = await ethers.getContractFactory("MyGovernor");
    governor = await Governor.deploy(
      token.target,
      votingDelay,
      votingPeriod,
      proposalThreshold,
      quorumPercent
    );
    await governor.waitForDeployment();

    await token.transfer(voter1.address, ethers.parseEther("500"));
    await token.transfer(voter2.address, ethers.parseEther("300"));

    await token.connect(voter1).delegate(voter1.address);
    await token.connect(voter2).delegate(voter2.address);
    await token.delegate(deployer.address);

    await moveBlocks(1);
  });

  it("rejects proposals below threshold", async function () {
    const targets = [];
    const values = [];
    const calldatas = [];
    const description = "Tiny proposal";

    await expect(
      governor.connect(outsider).propose(targets, values, calldatas, description)
    ).to.be.reverted;
  });

  it("runs a standard proposal lifecycle", async function () {
    const targets = [token.target];
    const values = [0];
    const calldatas = [
      token.interface.encodeFunctionData("transfer", [voter2.address, ethers.parseEther("1")])
    ];
    const description = "Transfer 1 GOV to voter2";

    await token.transfer(governor.target, ethers.parseEther("10"));

    const proposalId = await governor.propose.staticCall(
      targets,
      values,
      calldatas,
      description
    );
    await governor.propose(targets, values, calldatas, description);

    expect(await governor.state(proposalId)).to.equal(0);

    await expect(governor.connect(voter1).castVote(proposalId, 1)).to.be.reverted;

    await moveBlocks(votingDelay + 1);
    expect(await governor.state(proposalId)).to.equal(1);

    await governor.connect(voter1).castVote(proposalId, 1);
    await governor.connect(voter2).castVote(proposalId, 0);

    await moveBlocks(votingPeriod + 1);
    expect(await governor.state(proposalId)).to.equal(4);

    const descriptionHash = ethers.id(description);
    await expect(
      governor.execute(targets, values, calldatas, descriptionHash)
    ).to.emit(governor, "ProposalExecuted");

    expect(await governor.state(proposalId)).to.equal(7);
  });

  it("supports quadratic voting", async function () {
    const targets = [token.target];
    const values = [0];
    const calldatas = [
      token.interface.encodeFunctionData("transfer", [voter1.address, ethers.parseEther("1")])
    ];
    const description = "Quadratic transfer";

    const proposalId = await governor.proposeWithType.staticCall(
      targets,
      values,
      calldatas,
      description,
      1
    );
    await governor.proposeWithType(targets, values, calldatas, description, 1);

    await moveBlocks(votingDelay + 1);

    await expect(
      governor.connect(voter1).castQuadraticVote(proposalId, 1, 30)
    ).to.be.reverted;

    await governor.connect(voter1).castQuadraticVote(proposalId, 1, 9);

    const votes = await governor.proposalVotes(proposalId);
    expect(votes.forVotes).to.equal(ethers.parseEther("9"));
  });
});
