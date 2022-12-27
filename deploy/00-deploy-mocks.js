const { network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

const BASE_FEE = ethers.utils.parseEther("0.25") // 0.25 is PREMIUM. It costs 0.25 LINK per request.
const GAS_PRICE_LINK = 1e9 // 0.000000001 LINK per gas

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const arguments = [BASE_FEE, GAS_PRICE_LINK]

    if (developmentChains.includes(network.name)) {
        log("----------------------------------------------------")
        log("Local Network Detected!")
        log("Deploying Mocks...")
        const vrfCoordinatorV2 = await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            args: arguments,
            log: true,
        })
        log(`VRFCoordinatorV2Mock Successfully Deployed At ${vrfCoordinatorV2.address}`)
    }
}

module.exports.tags = ["all", "mocks"]
