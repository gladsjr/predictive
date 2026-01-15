import { defineConfig } from "hardhat/config";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  solidity: {
    compilers: [
      {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      type: "edr-simulated" as const,
      chainId: 1337,
    },
    sepolia: {
      type: "http" as const,
      url: process.env.SEPOLIA_URL || "https://eth-sepolia.g.alchemy.com/v2/demo",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
});
