import solc from 'solc';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lê o arquivo do contrato
const contractPath = path.join(__dirname, '../contracts/PredictionMarket.sol');
const source = fs.readFileSync(contractPath, 'utf8');

// Configuração do input para o compilador
const input = {
  language: 'Solidity',
  sources: {
    'PredictionMarket.sol': {
      content: source,
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode'],
      },
    },
  },
};

console.log('Compilando contrato com solc local...');

// Compila o contrato
const output = JSON.parse(solc.compile(JSON.stringify(input)));

// Verifica erros
if (output.errors) {
  const errors = output.errors.filter((e) => e.severity === 'error');
  if (errors.length > 0) {
    console.error('Erros de compilação:');
    errors.forEach((err) => console.error(err.formattedMessage));
    process.exit(1);
  }
  
  // Mostra warnings
  const warnings = output.errors.filter((e) => e.severity === 'warning');
  if (warnings.length > 0) {
    console.warn('Avisos:');
    warnings.forEach((warn) => console.warn(warn.formattedMessage));
  }
}

// Salva os artefatos
const contract = output.contracts['PredictionMarket.sol']['PredictionMarket'];

const artifactsDir = path.join(__dirname, '../artifacts/contracts/PredictionMarket.sol');
if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

const artifact = {
  _format: 'hh-sol-artifact-1',
  contractName: 'PredictionMarket',
  sourceName: 'contracts/PredictionMarket.sol',
  abi: contract.abi,
  bytecode: contract.evm.bytecode.object,
  deployedBytecode: contract.evm.deployedBytecode.object,
  linkReferences: {},
  deployedLinkReferences: {},
};

fs.writeFileSync(
  path.join(artifactsDir, 'PredictionMarket.json'),
  JSON.stringify(artifact, null, 2)
);

// Também salva no formato do build info
const buildInfoDir = path.join(__dirname, '../artifacts/build-info');
if (!fs.existsSync(buildInfoDir)) {
  fs.mkdirSync(buildInfoDir, { recursive: true });
}

console.log('✅ Compilação concluída com sucesso!');
console.log('📁 Artefatos salvos em: artifacts/contracts/PredictionMarket.sol/');
