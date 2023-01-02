const { ethers } = require("hardhat")

const networkConfig = {
    default: {
        name: "hardhat",
        keepersUpdateInterval: "30",
    },
    31337: {
        name: "localhost",
        subscriptionId: "0",
        gasLane: "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef", // Our Mock doesnt care with what keyHash we are working with (From Mainnet)
        keepersUpdateInterval: "30",
        raffleEntranceFee: ethers.utils.parseEther("0.01"), // 0.01 ETH
        callbackGasLimit: "500000", // 500,000 gas (showed in Gwei) = 0,0005 ETH
    },
    5: {
        name: "goerli",
        subscriptionId: "8069",
        gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15", // 30 gwei
        keepersUpdateInterval: "30",
        raffleEntranceFee: ethers.utils.parseEther("0.01"), // 0.01 ETH
        callbackGasLimit: "500000", // 500,000 gas (showed in Gwei) = 0,0005 ETH
        vrfCoordinatorV2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
        linkToken: "0x326C977E6efc84E512bB9C30f76E30c160eD06FB",
    },
    1: {
        name: "mainnet",
        keepersUpdateInterval: "30",
    },
}

const developmentChains = ["hardhat", "localhost"]
const VERIFICATION_BLOCK_CONFIRMATIONS = 6

module.exports = {
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
}
