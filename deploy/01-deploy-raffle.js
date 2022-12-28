const { network, ethers } = require("hardhat")
const { networkConfig, developmentChains, VERIFICATION_BLOCK_CONFIRMATIONS } = require("../helper-hardhat-config")
const { vrfCoordinatorV2Interface_abi } = require("../utils/constants.js")
const { verify } = require("../utils/verify")

const FUND_AMOUNT = ethers.utils.parseEther("0.1") // 0.1 Ether

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let vrfCoordinatorV2, vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock
    const waitBlockConfirmations = developmentChains.includes(network.name) ? 1 : VERIFICATION_BLOCK_CONFIRMATIONS

    // Local Network \\
    if (chainId == 31337) {
        log("Local Network Detected!")
        // Creating VRFV2 Subscription
        log("Creating VRFV2 Subscription...")
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait()
        subscriptionId = transactionReceipt.events[0].args.subId
        log(`Subscription Id: ${subscriptionId}`)
        // Funding The Subscription
        // Our Mock Makes It, So We Don't Actually Have To Worry About Sending Fund
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    }
    // Goerli Network \\
    else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
        log(`Address: ${vrfCoordinatorV2Address}`)
        log(`ABI: ${vrfCoordinatorV2Interface_abi}`)
        // If SubscriptionId doesn't exists -> create subscription
        if (subscriptionId == 0) {
            log("Creating VRFV2 Subscription...")
            vrfCoordinatorV2 = new ethers.Contract(vrfCoordinatorV2Address, vrfCoordinatorV2Interface_abi, deployer)
            //log(`yyy: ${vrfCoordinatorV2.address}, aaa: ${vrfCoordinatorV2}`)
            const transactionResponse = await vrfCoordinatorV2.createSubscription()
            //const transactionReceipt = await transactionResponse.wait()
            subscriptionId = transactionReceipt.events[0].args.subId
            log(`Subscription Id: ${subscriptionId}`)
        }
    }

    log("----------------------------------------------------")
    log("Deploying Raffle Contract...")

    const arguments = [
        vrfCoordinatorV2Address,
        subscriptionId,
        networkConfig[chainId]["gasLane"],
        networkConfig[chainId]["keepersUpdateInterval"],
        networkConfig[chainId]["raffleEntranceFee"],
        networkConfig[chainId]["callbackGasLimit"],
    ]

    // const raffle = await deploy("Raffle", {
    //     from: deployer,
    //     args: arguments,
    //     log: true,
    //     waitConfirmations: waitBlockConfirmations,
    // })
    // log(`Raffle Contract Deployed At: ${raffle.address}`)

    // // Ensure the Raffle contract is a valid consumer of the VRFCoordinatorV2Mock contract.
    // if (developmentChains.includes(network.name)) {
    //     const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
    //     await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address)
    // }

    // // Verify the deployment
    // if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    //     log("Verifying Raffle Contract...")
    //     await verify(raffle.address, arguments)
    // }

    // log("Enter lottery with command:")
    // const networkName = network.name == "hardhat" ? "localhost" : network.name
    // log(`yarn hardhat run scripts/enterRaffle.js --network ${networkName}`)
    // log("----------------------------------------------------")
}

module.exports.tags = ["all", "raffle"]
