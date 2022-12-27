const networkConfig = {
    31337: {
        name: "localhost",
        callbackGasLimit: 500000, // <- showed in Gwei -> 0,0005 ETH
        gasLane: "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef",
    },
    // Price Feed Address, values can be obtained at https://docs.chain.link/docs/reference-contracts
    5: {
        name: "goerli",
        subscriptionId: "0",
        callbackGasLimit: 500000, // <- showed in Gwei -> 0,0005 ETH
        gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        vrf_coordinator_v2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
        link_token: "0x326C977E6efc84E512bB9C30f76E30c160eD06FB",
    },
}

const developmentChains = ["hardhat", "localhost"]

module.exports = {
    networkConfig,
    developmentChains,
}
