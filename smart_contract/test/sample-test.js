const { expect } = require("chai");
const { ethers,network } = require("hardhat");

describe("Transactions", function () {
  // 重置网络数据
  beforeEach(async function () {
    await network.provider.send("hardhat_reset")
  });

  it("Should return the new transaction count once it's changed", async function () {
    const transactionsFactory = await ethers.getContractFactory("Transactions");
    const transactionsContract = await transactionsFactory.deploy();
    await transactionsContract.deployed();
    const [owner, addr1, addr2] = await ethers.getSigners();
    const addToBlockchainTx = await transactionsContract.addToBlockchain(
      addr1.address,
      ethers.utils.parseEther("0.1"),
      "test",
      "test",
    );

    console.log(`Loading - ${addToBlockchainTx.hash}`);
    await addToBlockchainTx.wait();
    console.log(`Success - ${addToBlockchainTx.hash}`);
    expect( await transactionsContract.getAllTransactions()).to.have.lengthOf(1);
  });
});