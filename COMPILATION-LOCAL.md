# Compilação Local - Solução para Ambientes Restritos

## Problema

Em ambientes corporativos com restrições de rede (proxies, firewalls, etc.), o Hardhat pode falhar ao tentar baixar a lista de compiladores Solidity com o erro:

```
Error HHE905: Couldn't download compiler version list. 
Please check your internet connection and try again.
```

## Solução Implementada

Criamos um script customizado que usa o compilador Solidity instalado localmente via npm, eliminando a necessidade de downloads durante a compilação.

### O que foi feito:

1. **Instalação do compilador local:**
   ```bash
   npm install --save-dev solc@0.8.28
   ```

2. **Script de compilação customizado:**
   - Arquivo: `scripts/compile-local.ts`
   - Usa o módulo `solc` instalado localmente
   - Gera os mesmos artefatos que o Hardhat

3. **Comando npm simplificado:**
   ```bash
   npm run compile:local
   ```

## Como Usar

### Compilação Local

Execute o comando:

```bash
npm run compile:local
```

Isso irá:
- Ler o contrato `contracts/PredictionMarket.sol`
- Compilar usando o `solc` instalado localmente
- Gerar os artefatos em `artifacts/contracts/PredictionMarket.sol/PredictionMarket.json`
- Não fazer nenhum download da internet

### Quando usar cada método

**Use `npm run compile:local` quando:**
- Estiver em ambiente corporativo com restrições
- O proxy bloquear downloads do Hardhat
- Quiser compilação offline
- Receber o erro HHE905

**Use `npx hardhat compile` quando:**
- Estiver em ambiente sem restrições
- Precisar de features avançadas do Hardhat
- Quiser compilar múltiplos contratos automaticamente

## Vantagens da Solução

✅ Funciona offline após instalação inicial  
✅ Não depende de downloads durante build  
✅ Compatível com ambientes corporativos  
✅ Gera artefatos compatíveis com Hardhat  
✅ Mesma versão do compilador (0.8.28)  

## Limitações

⚠️ Precisa recompilar manualmente se mudar o contrato  
⚠️ Não compila dependências automaticamente  
⚠️ Não valida imports de outros contratos  

Para este projeto (contrato único sem dependências), essas limitações não são problema.

## Estrutura de Artefatos Gerada

```
artifacts/
├── build-info/
└── contracts/
    └── PredictionMarket.sol/
        └── PredictionMarket.json
```

O arquivo `PredictionMarket.json` contém:
- ABI do contrato
- Bytecode compilado
- Bytecode deployado
- Metadados

Este é exatamente o formato esperado pelos scripts de deploy e pelo frontend.

## Deploy Após Compilação Local

Após compilar com `npm run compile:local`, você pode fazer deploy normalmente:

```bash
# Deploy local
npm run deploy:localhost

# Deploy Sepolia
npm run deploy:sepolia
```

Os scripts de deploy usam os artefatos gerados, independentemente de terem sido criados pelo Hardhat ou pelo script local.

## Troubleshooting

### "Cannot find module 'solc'"

Execute:
```bash
npm install --save-dev solc@0.8.28 --legacy-peer-deps
```

### "Cannot find module 'tsx'"

Execute:
```bash
npm install --save-dev tsx --legacy-peer-deps
```

### Erro de sintaxe no contrato

Verifique se o contrato Solidity está correto. O compilador local mostrará os mesmos erros que o Hardhat.

### Artefatos não são gerados

Verifique se a pasta `artifacts` tem permissões de escrita e se o caminho do contrato está correto.

## Conclusão

Esta solução permite desenvolvimento e compilação de smart contracts Solidity em ambientes corporativos restritos, mantendo total compatibilidade com o ecossistema Hardhat.
