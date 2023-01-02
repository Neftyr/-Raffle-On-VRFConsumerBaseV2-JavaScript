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
                  // Getting contract balance:
                  const raffleBalance = await ethers.provider.getBalance(raffle.address)
                  console.log(`Raffle Balance Is: ${raffleBalance}`)
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
                  // "0x" == [] => empty bytes object
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
                  // Below "callStatic" works as getter of function returns, so we can use it instead of this:
                  // const { 0: upkeepNeeded, 1: performData } = getUpkeep
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x")
                  assert.equal(raffleState.toString() == "1", upkeepNeeded == false)
              })
              it("returns false if enough time hasn't passed", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 3]) // use a higher number here if this test fails
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded, performDa } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
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
                  // If there will be no transaction, test should fail meaning our performUpkeep didnt work
                  assert(tx)
              })
              it("revert if upkeep not needed", async () => {
                  await expect(raffle.performUpkeep([])).to.be.revertedWith("Raffle__UpkeepNotNeeded")
                  // We can also do below for multiple arguments errors using EXPECTED values of those arguments:

                  // const raffleBalance = await ethers.provider.getBalance(raffle.address)
                  // console.log(`Raffle Balance Is: ${raffleBalance}`)
                  // await expect(raffle.performUpkeep([])).to.be.revertedWith(`Raffle__UpkeepNotNeeded(${raffleBalance}, ${0}, ${0})`)
              })
              it("updates the raffle state and emits a requestId, and calls the vrf coordinator", async () => {
                  const startingRaffleState = await raffle.getRaffleState()
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const txResponse = await raffle.performUpkeep([])
                  const txReceipt = await txResponse.wait()
                  // We are using events[1] as vrfCoordinator will emit events 1st, so it's index will be 0
                  const requestId = txReceipt.events[1].args.requestId
                  console.log(`requestId: ${requestId}`)
                  // We can check this event from vrfCoordinator contract, where "requestId" is at 2nd argument place doing below:
                  const reqId = vrfCoordinatorV2Mock.interface.parseLog(txReceipt.events[0]).args.requestId
                  console.log(`vrfCoordinator requestId: ${reqId}`)
                  const raffleState = await raffle.getRaffleState()
                  assert.equal(startingRaffleState == 0, raffleState == 1, requestId.toNumber() > 0)
                  // We cannot call "performUpkeep" twice! To run below comment out lines from "txResponse" to "assert.equal"
                  // await expect(raffle.performUpkeep("0x")).to.emit(raffle, "RequestedRaffleWinner")
              })
          })
          describe("fulfillRandomWords", function () {
              beforeEach(async () => {
                  //await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
              })
              it("can only be called after performupkeep", async () => {
                  await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)).to.be.revertedWith("nonexistent request")
                  await expect(vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)).to.be.revertedWith("nonexistent request")
              })
              it("picks a winner, resets, and sends money", async () => {
                  const additionalEntrances = 3 // to test 3 more players
                  const startingIndex = 2 // deployer = 0, and player 1 defined in 1st beforeEach() at the top (total 5 players)
                  console.log(`Balance of Player 0: ${await accounts[0].getBalance()} and 1: ${await accounts[1].getBalance()}`)
                  console.log(`Player that didnt enter lottery: ${await accounts[5].getBalance()}`)
                  // Connecting New Players To Raffle
                  for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
                      raffle = raffleContract.connect(accounts[i])
                      await raffle.enterRaffle({ value: raffleEntranceFee })
                      const raffleBalance = await ethers.provider.getBalance(accounts[i].address)
                      console.log(`Player ${i} Balance Is: ${raffleBalance}`)
                  }

                  const startingTimeStamp = await raffle.getLastTimeStamp() // stores starting timestamp (before we fire our event)

                  // performUpkeep (mock being ChainLink Keepers)
                  // fulfillRandomWords (mock being ChainLink VRF)
                  // We will have to wait for the fulfillRandomWords to be called
                  await new Promise(async (resolve, reject) => {
                      // WinnerPicked is emit from fulfillRandomWords function
                      raffle.once("WinnerPicked", async () => {
                          // event listener for WinnerPicked
                          console.log("WinnerPicked event fired!")
                          // assert throws an error if it fails, so we need to wrap it in a try/catch so that the promise returns event if it fails.
                          try {
                              // Now lets get the ending values...
                              const recentWinner = await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const winnerBalance = await accounts[2].getBalance()
                              const endingTimeStamp = await raffle.getLastTimeStamp()

                              console.log(
                                  `All Players: ${accounts[0].address}, ${accounts[1].address}, ${accounts[2].address}, ${accounts[3].address}, ${accounts[4].address}, 6th acc didnt enter => ${accounts[5].address}`
                              )
                              console.log(`Recent Winner: ${recentWinner} his balance: ${winnerBalance}`)
                              console.log(`Raffle Balance: ${await ethers.provider.getBalance(raffle.address)}`)

                              await expect(raffle.getPlayer(0)).to.be.reverted
                              // Comparisons to check if our ending values are correct:
                              assert.equal(recentWinner.toString(), accounts[2].address)
                              assert.equal(raffleState, 0)
                              assert.equal(
                                  winnerBalance.toString(),
                                  startingBalance.add(raffleEntranceFee.mul(additionalEntrances).add(raffleEntranceFee)).toString()
                              )
                              assert(endingTimeStamp > startingTimeStamp)
                              resolve() // if try passes, resolves the promise
                          } catch (e) {
                              reject(e) // if try fails, rejects the promise
                          }
                      })

                      // Kicking off the event by mocking the chainlink keepers and vrf coordinator
                      const tx = await raffle.performUpkeep("0x")
                      const txReceipt = await tx.wait(1)
                      const startingBalance = await accounts[2].getBalance()
                      await vrfCoordinatorV2Mock.fulfillRandomWords(txReceipt.events[1].args.requestId, raffle.address)
                  })
              })
          })
          describe("getNumWords", function () {
              it("should return 1", async () => {
                  const ret = await raffle.getNumWords()
                  assert.equal(ret, 1)
              })
          })
          describe("getRequestConfirmations", function () {
              it("should return 3", async () => {
                  const ret = await raffle.getRequestConfirmations()
                  assert.equal(ret, 3)
              })
          })
      })
