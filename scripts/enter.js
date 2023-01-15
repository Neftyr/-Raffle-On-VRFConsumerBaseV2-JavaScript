const { ethers, getNamedAccounts } = require("hardhat")

async function enterRaffle() {
    const raffle = await ethers.getContract("Raffle")
    const entranceFee = await raffle.getEntranceFee()
    await raffle.enterRaffle({ value: entranceFee + 1 })
    const { deployer } = await getNamedAccounts()
    console.log(`You Have Successfully Entered Raffle as: ${deployer}`)
}

enterRaffle()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
