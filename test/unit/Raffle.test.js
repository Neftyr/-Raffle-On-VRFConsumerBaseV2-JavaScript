const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", async function () {
          let raffle, raffleContract, vrfCoordinatorV2Mock, raffleEntranceFee, interval, player // , deployer

          beforeEach(async () => {
              // could also do with getNamedAccounts
              accounts = await ethers.getSigners()
              // deployer = accounts[0]
              player = accounts[1]
              // Deploys modules with the tags "mocks" and "raffle"
              await deployments.fixture(["mocks", "raffle"])
              // Returns a new connection to the VRFCoordinatorV2Mock contract
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
              // Returns a new connection to the Raffle contract
              raffleContract = await ethers.getContract("Raffle")
              // Returns a new instance of the Raffle contract connected to player
              raffle = raffleContract.connect(player)
              raffleEntranceFee = await raffle.getEntranceFee()
              interval = await raffle.getInterval()
          })

          describe("constructor", function () {
              it("initializes the raffle correctly", async () => {
                  // Ideally, we'd separate these out so that only 1 assert per "it" block
                  const raffleState = (await raffle.getRaffleState()).toString()
                  // Comparisons for Raffle initialization:
                  assert.equal(raffleState, "0")
                  assert.equal(interval.toString(), networkConfig[network.config.chainId]["keepersUpdateInterval"])
              })
          })

          describe("enterRaffle", function () {
              it("reverts when you don't pay enough", async () => {
                  await expect(raffle.enterRaffle()).to.be.revertedWith("Raffle__SendMoreToEnterRaffle")
              })
              it("allows players to participate and record them in raffle", async function () {
                  const startingPlayers = await raffle.getNumberOfPlayers()
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  const getPlayers = await raffle.getNumberOfPlayers()
                  assert.equal(startingPlayers.toString(), "0")
                  assert.equal(getPlayers.toString(), "1")
              })
              it("emits event when enter", async function () {
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(raffle, "RaffleEnter")
              })
              it("doesn't allow entrance when raffle is in calculating state", async function () {
                  /* To turn raffle into "calculating" state we need to make below bool's true: */
                  // bool isOpen
                  // bool timePassed
                  // bool hasPlayers
                  // bool hasBalance
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  // Checking "bool timePassed"
                  // For a documentation of the methods below, go here: https://hardhat.org/hardhat-network/reference
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  // Creating 1 extra block (It is not necessary)
                  // await network.provider.send("evm_mine", []) -> It is the same as below
                  await network.provider.request({ method: "evm_mine", params: [] })
                  // We pretend to be a ChainLink Keeper for a second
                  // Changes the state to calculating for our comparison below
                  // "0x" == []
                  await raffle.performUpkeep([])
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith("Raffle__RaffleNotOpen")
              })
          })
          describe("checkUpkeep", function () {
              it("returns false if raffle isn't open", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  await raffle.performUpkeep([]) //Changing state to "calculating"
                  const raffleState = await raffle.getRaffleState()
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x")
                  assert.equal(raffleState.toString() == "1", upkeepNeeded == false)
              })
              it("returns false if enough time hasn't passed", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 3]) // use a higher number here if this test fails
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert(!upkeepNeeded)
              })
              it("returns true if enough time has passed, has players, eth, and is open", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert(upkeepNeeded)
              })
              it("returns false if people haven't sent any ETH", async function () {
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const getUpkeep = await raffle.checkUpkeep([])
                  const { 0: upkeepNeeded, 1: performData } = getUpkeep
                  assert(!upkeepNeeded)
              })
          })
          describe("performUpkeep", function () {
              it("can only run if checkUpkeep is true", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  // "0x" == []
                  const tx = await raffle.performUpkeep("0x")
                  assert(tx)
              })
              it("revert if upkeep not needed", async () => {
                  await expect(raffle.performUpkeep([])).to.be.revertedWith("Raffle__UpkeepNotNeeded")
              })
              it("updates the raffle state and emits a requestId", async () => {
                  const startingRaffleState = await raffle.getRaffleState()
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const txResponse = await raffle.performUpkeep([])
                  const txReceipt = await txResponse.wait()
                  const requestId = txReceipt.events[1].args.requestId
                  const raffleState = await raffle.getRaffleState()
                  assert.equal(startingRaffleState == 0, raffleState == 1, requestId.toNumber() > 0)
                  // We cannot call "performUpkeep" twice! To run below comment out lines from "txResponse" to "assert.equal"
                  // await expect(raffle.performUpkeep("0x")).to.emit(raffle, "RequestedRaffleWinner")
              })
              describe("fulfillRandomWords", function () {
                  beforeEach(async () => {
                      await raffle.enterRaffle({ value: raffleEntranceFee })
                      await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                      await network.provider.request({ method: "evm_mine", params: [] })
                  })
                  it("can only be called after performupkeep", async () => {
                      await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)).to.be.revertedWith("nonexistent request")
                      await expect(vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)).to.be.revertedWith("nonexistent request")
                  })
                  it("picks a winner, resets, and sends money", async () => {
                      const additionalEntrances = 3 // to test
                      const startingIndex = 2
                      // Connecting New Players To Raffle
                      for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
                          raffle = raffleContract.connect(accounts[i])
                          await raffle.enterRaffle({ value: raffleEntranceFee })
                      }
                      const startingTimeStamp = await raffle.getLastTimeStamp() // stores starting timestamp (before we fire our event)
                  })
              })
          })
      })
