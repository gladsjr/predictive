import hre from "hardhat";

async function main() {
    const contractAddress = "0xE5e9feEe2Dc4cd4C7860241155ca0C684a88Ee57";

    console.log("Verificando contrato em:", contractAddress);

    await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
