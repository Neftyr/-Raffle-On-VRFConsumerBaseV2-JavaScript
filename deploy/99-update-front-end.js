const { FRONT_END_ADDRESSES_FILE, FRONT_END_ABI_FILE } = require("../helper-hardhat-config")
const { ethers, network } = require("hardhat")
const fs = require("fs")

// We can run below LOCALLY using `yarn hardhat node`

module.exports = async function () {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Updating Front End...")
        // We are checking if proper file exists
        if (!fs.existsSync(FRONT_END_ADDRESSES_FILE)) {
            // We need to add {} to specify .json format in created file, otherwise updateContractAddresses() function won't work if file will be just empty for example
            fs.writeFileSync(FRONT_END_ADDRESSES_FILE, "{}")
            updateContractAddresses()
        } else {
            updateContractAddresses()
        }
        updateAbi()
    }
}

async function updateContractAddresses() {
    const chainId = network.config.chainId.toString()
    const raffle = await ethers.getContract("Raffle")

    // We are reading given file location (file) in "utf8" format
    const currentAddresses = JSON.parse(fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf8"))
    if (chainId in currentAddresses) {
        if (!currentAddresses[chainId].includes(raffle.address)) {
            currentAddresses[chainId].push(raffle.address)
        }
    } else {
        // If "chainId" does not exist, we create new array
        currentAddresses[chainId] = [raffle.address]
    }
    // Saving changes to file after above updates
    // "writeFileSync" means that if specified file does not exist create that file, and "writeFile" without won't do that
    fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddresses))
}

async function updateAbi() {
    const raffle = await ethers.getContract("Raffle")
    fs.writeFileSync(FRONT_END_ABI_FILE, raffle.interface.format(ethers.utils.FormatTypes.json))
}

module.exports.tags = ["all", "update"]
