const { network } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
require("dotenv").config()

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let vrfCoordinatorV2Address
    const entranceFee = networkConfig[chainId]["raffleEntranceFee"]

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
        log(`VRFCoordinatorV2: ${vrfCoordinatorV2Address}`)
    }
    log("----------------------------------------------------")
    log("Deploying Raffle and waiting for confirmations...")
    const arguments = [vrfCoordinatorV2Address]
    //const raffle = await deploy("Raffle", { from: deployer, args: arguments, log: true, waitConfirmations: network.config.blockConfirmations || 1 })
    //log(`Raffle deployed at ${raffle.address}`)
}

module.exports.tags = ["all", "raffle"]
