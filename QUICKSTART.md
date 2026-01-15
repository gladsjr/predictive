# 🚀 Guia de Início Rápido

## Primeiros Passos

### 1. Instalar Dependências

```bash
npm install --legacy-peer-deps
```

### 2. Criar arquivo .env

Copie o `.env.example` para `.env`:

```bash
cp .env.example .env
```

### 3. Compilar o Contrato

**Opção A - Compilação via Hardhat (requer conexão com internet):**
```bash
npx hardhat compile
```

**Opção B - Compilação local (recomendado para ambientes restritos):**
```bash
npm run compile:local
```

Esta opção usa o compilador Solidity instalado localmente via npm, evitando downloads durante a compilação. Ideal para ambientes corporativos com restrições de rede.

Se houver erro de conexão na Opção A, use sempre a Opção B.

### 4. Executar Testes (Opcional)

```bash
npm test
```

## Desenvolvimento Local

### Passo 1: Iniciar Rede Local

Em um terminal, execute:

```bash
npm run node
```

Deixe esse terminal rodando. Você verá várias contas de teste com suas chaves privadas.

### Passo 2: Deploy do Contrato

Em OUTRO terminal, execute:

```bash
npm run deploy:localhost
```

Isso criará os arquivos:
- `frontend/contract-address.json`
- `frontend/PredictionMarket.json`

### Passo 3: Configurar MetaMask

1. Abra o MetaMask
2. Adicione uma rede personalizada:
   - **Nome**: Hardhat Local
   - **RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `1337`
   - **Símbolo**: `ETH`

3. Importe uma conta de teste:
   - Copie uma das chaves privadas mostradas no terminal do `npm run node`
   - No MetaMask: Importar Conta > Cole a chave privada

### Passo 4: Abrir o Frontend

**Opção A - Servidor Python:**
```bash
cd frontend
python -m http.server 8000
```

**Opção B - Servidor Node (http-server):**
```bash
npx http-server frontend -p 8000
```

**Opção C - Abrir diretamente:**
Abra o arquivo `frontend/index.html` no navegador

Acesse: http://localhost:8000

### Passo 5: Usar o dApp

1. Clique em "Conectar MetaMask"
2. Aceite a conexão
3. Se você for o owner (conta que fez deploy), poderá criar predições
4. Crie uma predição de teste
5. Mude para outra conta no MetaMask e faça apostas
6. Volte para a conta owner e resolva a predição

## Deploy na Sepolia

### Pré-requisitos

1. **Criar conta Alchemy** (grátis):
   - Acesse: https://www.alchemy.com/
   - Crie uma conta
   - Crie um novo app na Sepolia
   - Copie a "HTTP URL"

2. **Obter Sepolia ETH**:
   - Acesse: https://sepoliafaucet.com/
   - Cole seu endereço de carteira
   - Solicite ETH de teste

### Configurar .env

Edite o arquivo `.env`:

```env
SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
```

⚠️ **IMPORTANTE**: 
- Use uma carteira APENAS PARA TESTE
- NUNCA commite o arquivo `.env`
- A chave privada deve incluir o `0x` no início

### Fazer Deploy

```bash
npm run deploy:sepolia
```

Aguarde a confirmação. O endereço do contrato será salvo em `frontend/contract-address.json`.

### Usar no Sepolia

1. No MetaMask, mude para a rede Sepolia
2. Abra o frontend
3. Conecte sua carteira
4. Use o dApp normalmente!

## Publicar no GitHub Pages

### Opção 1 - Via GitHub Actions (Recomendado)

Crie `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./frontend
```

### Opção 2 - Manual

```bash
# Certifique-se de ter feito deploy na Sepolia primeiro!

# Crie branch gh-pages
git checkout --orphan gh-pages

# Limpe arquivos desnecessários
git rm -rf .

# Copie apenas o frontend
cp -r frontend/* .
git add .
git commit -m "Deploy to GitHub Pages"

# Push
git push origin gh-pages

# Volte para main
git checkout main
```

### Configurar no GitHub

1. Vá em **Settings** > **Pages**
2. Em **Source**, selecione a branch `gh-pages`
3. Clique em **Save**

Seu site estará em: `https://gladsjr.github.io/predictive/`

## Solução de Problemas

### Erro ao compilar: "Couldn't download compiler version list"

Se você estiver em um ambiente corporativo com restrições de rede, use o compilador local:

```bash
npm run compile:local
```

Este comando usa o compilador Solidity instalado localmente (via npm) ao invés de baixar da internet.

### MetaMask não conecta

- Certifique-se de estar na rede correta (Hardhat Local ou Sepolia)
- Limpe o cache do MetaMask: Settings > Advanced > Clear activity tab data

### Erro "Nonce too high"

No MetaMask:
1. Settings > Advanced
2. Clear activity tab data
3. Tente novamente

### Frontend não carrega contrato

- Verifique se os arquivos `contract-address.json` e `PredictionMarket.json` existem em `frontend/`
- Certifique-se de ter executado o deploy primeiro

### Transação falha

- Verifique se tem ETH suficiente
- Verifique se está na rede correta
- Leia a mensagem de erro no MetaMask

### Rede local não funciona

- Certifique-se de que `npm run node` está rodando
- Verifique se a porta 8545 não está em uso
- Tente reiniciar o node

## Comandos Úteis

```bash
# Compilar contrato (via Hardhat)
npm run compile

# Compilar contrato (local - sem download)
npm run compile:local

# Executar testes
npm test

# Iniciar rede local
npm run node

# Deploy local
npm run deploy:localhost

# Deploy Sepolia
npm run deploy:sepolia

# Abrir frontend
npm run frontend
```

## Próximos Passos

1. ✅ Configure o ambiente local
2. ✅ Teste localmente
3. ✅ Faça deploy na Sepolia
4. ✅ Publique no GitHub Pages
5. 🎉 Compartilhe seu dApp!

---

**Precisa de ajuda?** Abra uma issue no GitHub!
