import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Deployando PredictionMarket na rede local...');

  // Carrega o artefato compilado
  const artifactPath = path.join(__dirname, '../artifacts/contracts/PredictionMarket.sol/PredictionMarket.json');
  
  if (!fs.existsSync(artifactPath)) {
    console.error('❌ Artefato não encontrado! Execute primeiro: npm run compile:local');
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  // Conecta à rede local
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  
  // Usa a primeira conta do Hardhat
  const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log('Deploying com a conta:', wallet.address);

  // Cria a factory do contrato
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  
  // Faz o deploy
  console.log('Enviando transação de deploy...');
  const contract = await factory.deploy();
  
  console.log('Aguardando confirmação...');
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log(`✅ PredictionMarket deployed to: ${address}`);
  
  // Salva o endereço para o frontend
  const contractsDir = path.join(__dirname, '../frontend');

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(contractsDir, 'contract-address.json'),
    JSON.stringify({ PredictionMarket: address }, undefined, 2)
  );

  // Copia o ABI
  fs.writeFileSync(
    path.join(contractsDir, 'PredictionMarket.json'),
    JSON.stringify(artifact, null, 2)
  );

  console.log('📁 Endereço e ABI salvos no diretório frontend/');
  console.log('\n🎉 Deploy concluído com sucesso!');
  console.log('\nPróximos passos:');
  console.log('1. Configure o MetaMask para a rede local (http://127.0.0.1:8545, Chain ID: 1337)');
  console.log('2. Importe a conta de teste usando a chave privada acima');
  console.log('3. Abra frontend/index.html no navegador');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erro ao fazer deploy:', error);
    process.exit(1);
  });
