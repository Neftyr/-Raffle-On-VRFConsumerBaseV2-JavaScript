const { assert, expect } = require("chai")
const { getNamedAccounts, ethers, network } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

// In order to perform below test make sure:
// 1. Get SubId on ChainLink VRF
// 2. Deploy our contract using that subId on testnet
// 3. Add deployed Raffle contract as consumer on ChainLinkVRF
// 4. Register contract with ChainLink Keepers => go to: https://automation.chain.link/, crontab.guru
// 5. Run staging tests

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Staging Tests", function () {
          let raffle, raffleEntranceFee, deployer

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              raffle = await ethers.getContract("Raffle", deployer)
              console.log(`Working On Raffle Contract: ${raffle.address}`)
              raffleEntranceFee = await raffle.getEntranceFee()
          })

          describe("fulfillRandomWords", function () {
              it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function () {
                  // Enter the raffle as first step
                  console.log("Setting up test...")
                  const startingTimeStamp = await raffle.getLastTimeStamp()
                  const accounts = await ethers.getSigners()

                  console.log("Setting up Listener...")
                  await new Promise(async (resolve, reject) => {
                      // Setup listener before we enter the raffle
                      // Just in case the blockchain moves REALLY fast
                      // Below will be executed ONCE listener catch that "WinnerPicked" event emit
                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!")
                          try {
                              // add our asserts here
                              const recentWinner = await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const winnerEndingBalance = await accounts[0].getBalance() //deployer acc
                              const endingTimeStamp = await raffle.getLastTimeStamp()

                              // Checking if players array has been reset
                              await expect(raffle.getPlayer(0)).to.be.reverted
                              assert.equal(recentWinner.toString(), accounts[0].address)
                              assert.equal(raffleState, 0)
                              assert.equal(winnerEndingBalance.toString(), winnerStartingBalance.add(raffleEntranceFee).toString())
                              assert(endingTimeStamp > startingTimeStamp)
                              // If all above passed => resolve()
                              resolve()
                          } catch (error) {
                              console.log(error)
                              reject(error)
                          }
                      })
                      // Then entering the raffle
                      console.log("Entering Raffle...")
                      const tx = await raffle.enterRaffle({ value: raffleEntranceFee })
                      await tx.wait(1)
                      console.log("Ok, time to wait...")
                      const winnerStartingBalance = await accounts[0].getBalance()
                      // Once above is done execute code in `raffle.once`

                      // and this code WONT complete until our listener has finished listening!
                  })
              })
          })
      })
