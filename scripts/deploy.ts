import hre from "hardhat";
import "@nomicfoundation/hardhat-ethers";
import fs from "fs";

async function main() {
  console.log("Deployando PredictionMarket...");

  const { ethers } = await hre.network.connect();

  const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
  const predictionMarket = await PredictionMarket.deploy();

  await predictionMarket.waitForDeployment();

  const address = await predictionMarket.getAddress();
  console.log(`PredictionMarket deployed to: ${address}`);

  // Salva o endereço para o frontend
  const contractsDir = "./frontend";

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    contractsDir + "/contract-address.json",
    JSON.stringify({ PredictionMarket: address }, undefined, 2)
  );

  // Copia o ABI
  const artifact = await hre.artifacts.readArtifact("PredictionMarket");
  fs.writeFileSync(
    contractsDir + "/PredictionMarket.json",
    JSON.stringify(artifact, null, 2)
  );

  console.log("Endereço e ABI salvos no diretório frontend/");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
