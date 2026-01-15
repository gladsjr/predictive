# 🔮 Mercado de Predição Descentralizado

Teaching example of decentralized (but not that much) predictive markets

Um dApp simplificado de mercados de predição usando Hardhat, Solidity e Ethereum.

## 📋 Características

- **Smart Contract em Solidity**: Contrato simplificado de predição descentralizada
- **Frontend em HTML/CSS/JS**: Interface web responsiva usando ethers.js
- **Suporte Multi-rede**: Funciona em rede local Hardhat e Sepolia testnet
- **Painel do Owner**: Criar, deletar e resolver predições
- **Apostas YES/NO**: Usuários apostam um valor fixo em resultados binários
- **Visualização em Tempo Real**: Volumes de apostas atualizados automaticamente
- **Distribuição Automática**: Prêmios distribuídos automaticamente aos vencedores

## 🏗️ Funcionalidades do Contrato

### Owner (Dono do Contrato)
- ✅ Criar predição com nome, descrição, data e valor fixo de aposta
- ✅ Deletar predição ativa (todas apostas são devolvidas)
- ✅ Resolver predição definindo resultado (YES ou NO)
- ⚠️ Apenas uma predição ativa por vez

### Usuários
- ✅ Conectar carteira MetaMask
- ✅ Apostar valor fixo em YES ou NO
- ✅ Visualizar volumes totais de apostas em tempo real
- ✅ Receber prêmio automaticamente se ganhar
- ⚠️ Cada carteira pode apostar apenas uma vez por predição

## 🚀 Começando

### Pré-requisitos

- Node.js (v16 ou superior)
- npm ou yarn
- MetaMask instalado no navegador
- (Opcional) Conta Alchemy ou Infura para deploy na Sepolia

### Instalação

```bash
# Clone o repositório
git clone https://github.com/gladsjr/predictive.git
cd predictive

# Instale as dependências
npm install --legacy-peer-deps
```

### Compilar o Contrato

**Opção A - Via Hardhat:**
```bash
npx hardhat compile
```

**Opção B - Compilador Local (para ambientes com restrições de rede):**
```bash
npm run compile:local
```

A opção B usa o compilador Solidity instalado localmente, evitando downloads durante a compilação.

### Executar Testes

```bash
npx hardhat test
```

## 🧪 Desenvolvimento Local

### 1. Iniciar Rede Local Hardhat

```bash
npx hardhat node
```

Isso iniciará uma rede Ethereum local em `http://127.0.0.1:8545/`

### 2. Deploy do Contrato na Rede Local

Em outro terminal:

```bash
npx hardhat run scripts/deploy.ts --network localhost
```

Isso irá:
- Fazer deploy do contrato `PredictionMarket`
- Salvar o endereço em `frontend/contract-address.json`
- Salvar o ABI em `frontend/PredictionMarket.json`

### 3. Configurar MetaMask

1. Adicione a rede local do Hardhat no MetaMask:
   - **Nome da Rede**: Hardhat Local
   - **RPC URL**: http://127.0.0.1:8545
   - **Chain ID**: 1337
   - **Símbolo**: ETH

2. Importe uma conta de teste do Hardhat usando uma das chaves privadas exibidas no console

### 4. Abrir o Frontend

Abra `frontend/index.html` no seu navegador ou use um servidor local:

```bash
# Usando Python
cd frontend
python -m http.server 8000

# Usando Node.js (http-server)
npx http-server frontend -p 8000
```

Acesse: `http://localhost:8000`

## 🌐 Deploy na Sepolia Testnet

### 1. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite `.env` e adicione:

```env
SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
PRIVATE_KEY=your_private_key_here
```

**⚠️ NUNCA commite o arquivo `.env` com suas chaves privadas!**

### 2. Obter ETH de Teste

Obtenha Sepolia ETH em um dos faucets:
- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia

### 3. Deploy na Sepolia

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

### 4. Configurar MetaMask para Sepolia

O MetaMask já vem com a rede Sepolia configurada. Certifique-se de estar conectado nela.

## 📱 Usando o dApp

### Como Owner

1. Conecte sua carteira (deve ser a carteira que fez o deploy)
2. Preencha o formulário "Criar Nova Predição":
   - Nome curto (ex: "Bitcoin $100k?")
   - Descrição detalhada
   - Data de apuração
   - Valor fixo da aposta em ETH (ex: 0.1)
3. Clique em "Criar Predição"
4. Aguarde usuários apostarem
5. Quando quiser, resolva a predição clicando em "Resolver como YES" ou "Resolver como NO"
6. Ou delete a predição (devolve todas as apostas)

### Como Usuário

1. Conecte sua carteira
2. Visualize a predição ativa
3. Veja os volumes de apostas YES e NO
4. Clique em "Apostar em YES" ou "Apostar em NO"
5. Confirme a transação no MetaMask
6. Aguarde a resolução
7. Se ganhar, receba automaticamente seu prêmio!

## 📂 Estrutura do Projeto

```
predictive/
├── contracts/
│   └── PredictionMarket.sol      # Smart contract principal
├── scripts/
│   └── deploy.ts                 # Script de deploy
├── test/
│   └── PredictionMarket.test.ts  # Testes do contrato
├── frontend/
│   ├── index.html                # Interface web
│   ├── style.css                 # Estilos
│   ├── app.js                    # Lógica frontend
│   ├── contract-address.json     # Endereço do contrato (gerado)
│   └── PredictionMarket.json     # ABI do contrato (gerado)
├── hardhat.config.ts             # Configuração Hardhat
├── package.json
└── README.md
```

## 🚀 Deploy no GitHub Pages

### 1. Criar Branch gh-pages

```bash
# Copie os arquivos do frontend
cp -r frontend/* .

# Faça commit
git add .
git commit -m "Deploy to GitHub Pages"

# Push para branch gh-pages
git push origin main:gh-pages
```

### 2. Configurar GitHub Pages

1. Vá em Settings > Pages no seu repositório
2. Em "Source", selecione a branch `gh-pages`
3. Clique em "Save"

Seu site estará disponível em: `https://gladsjr.github.io/predictive/`

**Nota**: Certifique-se de fazer deploy do contrato na Sepolia antes de publicar no GitHub Pages, pois o localhost não funcionará online!

## 🔧 Tecnologias Utilizadas

- **Solidity**: Linguagem para smart contracts
- **Hardhat**: Framework de desenvolvimento Ethereum
- **ethers.js**: Biblioteca para interação com Ethereum
- **MetaMask**: Carteira Web3
- **HTML/CSS/JavaScript**: Frontend vanilla
- **Sepolia**: Testnet Ethereum

## ⚠️ Avisos Importantes

- Este é um projeto educacional e não deve ser usado em produção
- Nunca compartilhe suas chaves privadas
- Use apenas testnets (Sepolia) para testes
- O contrato é simplificado e não possui todas as medidas de segurança necessárias

## 📝 Melhorias Futuras

- [ ] Suporte a múltiplas predições simultâneas
- [ ] Sistema de categorias
- [ ] Histórico de predições
- [ ] Sistema de reputação
- [ ] Oracle integration para resolução automática
- [ ] Tokens de governança
- [ ] Interface mobile dedicada

## 📄 Licença

ISC

## 👨‍💻 Autor

Desenvolvido como exemplo educacional de dApp usando Hardhat e Ethereum.

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

---

**Divirta-se aprendendo sobre desenvolvimento blockchain! 🚀**
