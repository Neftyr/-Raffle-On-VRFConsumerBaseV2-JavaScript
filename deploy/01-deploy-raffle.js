const { network } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
require("dotenv").config()

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    const arguments = []

    let vrfCoordinatorV2
    if (chainId == 31337) {
        vrfCoordinatorV2 = await deployments.get("VRFCoordinatorV2Mock")
    } else {
        vrfCoordinatorV2 = networkConfig[chainId]["vrf_coordinator_v2"]
    }
    log("----------------------------------------------------")
    log("Deploying Raffle and waiting for confirmations...")
}

module.exports.tags = ["all", "raffle"]
