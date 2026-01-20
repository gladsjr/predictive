import hre from "hardhat";
import "@nomicfoundation/hardhat-ethers";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

async function askConfirmation(question: string): Promise<boolean> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === "s" || answer.toLowerCase() === "sim" || answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
        });
    });
}

async function main() {
    console.log("\n🔄 Script de Transferência de ETH na Sepolia");
    console.log("=".repeat(60));
    console.log("📄 Este script lê o arquivo: transfer.txt");
    console.log("📝 Formato esperado do arquivo:");
    console.log("   Linha 1: Quantidade de ETH por endereço (ex: 0.01)");
    console.log("   Linha 2+: Um endereço Ethereum por linha");
    console.log("=".repeat(60));
    console.log("");

    // Obter ethers do hardhat
    const { ethers } = await hre.network.connect();

    // Ler o arquivo transfer.txt
    const transferFilePath = path.join(process.cwd(), "transfer.txt");

    if (!fs.existsSync(transferFilePath)) {
        console.error("❌ Erro: Arquivo 'transfer.txt' não encontrado!");
        console.log("📝 Crie um arquivo 'transfer.txt' na raiz do projeto com:");
        console.log("   - Primeira linha: quantidade de ETH (ex: 0.01)");
        console.log("   - Linhas seguintes: endereços destinatários");
        process.exit(1);
    }

    const fileContent = fs.readFileSync(transferFilePath, "utf-8");
    const lines = fileContent.split("\n").map(line => line.trim()).filter(line => line.length > 0);

    if (lines.length < 2) {
        console.error("❌ Erro: O arquivo 'transfer.txt' deve ter pelo menos 2 linhas:");
        console.error("   - Primeira linha: quantidade de ETH");
        console.error("   - Segunda linha em diante: endereços");
        process.exit(1);
    }

    // Primeira linha é a quantidade
    const amountPerAddress = lines[0];
    const addresses = lines.slice(1);

    // Validar quantidade
    let ethAmount: bigint;
    try {
        ethAmount = ethers.parseEther(amountPerAddress);
    } catch (error) {
        console.error(`❌ Erro: Quantidade inválida '${amountPerAddress}'. Use formato decimal (ex: 0.01)`);
        process.exit(1);
    }

    // Validar endereços
    const validAddresses: string[] = [];
    for (const addr of addresses) {
        if (!ethers.isAddress(addr)) {
            console.error(`❌ Erro: Endereço inválido encontrado: ${addr}`);
            process.exit(1);
        }
        validAddresses.push(addr);
    }

    // Obter signer (conta que enviará os ETH)
    const [signer] = await ethers.getSigners();
    const signerAddress = await signer.getAddress();
    const balance = await ethers.provider.getBalance(signerAddress);

    // Calcular total necessário
    const totalAmount = ethAmount * BigInt(validAddresses.length);

    console.log("📊 Resumo da Operação:");
    console.log(`   Origem: ${signerAddress}`);
    console.log(`   Saldo: ${ethers.formatEther(balance)} ETH`);
    console.log(`   Quantidade por endereço: ${amountPerAddress} ETH`);
    console.log(`   Total de endereços: ${validAddresses.length}`);
    console.log(`   Total a transferir: ${ethers.formatEther(totalAmount)} ETH`);

    // Estimar gas para uma transação (aproximado)
    const estimatedGasPerTx = 21000n;
    const feeData = await ethers.provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits("20", "gwei");
    const estimatedGasCostPerTx = estimatedGasPerTx * gasPrice;
    const totalEstimatedGas = estimatedGasCostPerTx * BigInt(validAddresses.length);

    console.log(`   Gas estimado (total): ~${ethers.formatEther(totalEstimatedGas)} ETH`);
    console.log(`   Total necessário (aprox): ~${ethers.formatEther(totalAmount + totalEstimatedGas)} ETH\n`);

    // Verificar se há saldo suficiente
    if (balance < totalAmount + totalEstimatedGas) {
        console.error("❌ Erro: Saldo insuficiente para realizar todas as transferências!");
        console.error(`   Necessário: ~${ethers.formatEther(totalAmount + totalEstimatedGas)} ETH`);
        console.error(`   Disponível: ${ethers.formatEther(balance)} ETH`);
        process.exit(1);
    }

    // Pedir confirmação
    const confirmed = await askConfirmation("⚠️  Deseja continuar com as transferências? (s/n): ");

    if (!confirmed) {
        console.log("\n❌ Operação cancelada pelo usuário.");
        process.exit(0);
    }

    console.log("\n🚀 Iniciando transferências...\n");

    // Realizar transferências uma a uma
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < validAddresses.length; i++) {
        const address = validAddresses[i];
        console.log(`[${i + 1}/${validAddresses.length}] Transferindo ${amountPerAddress} ETH para ${address}...`);

        try {
            const tx = await signer.sendTransaction({
                to: address,
                value: ethAmount,
            });

            console.log(`   ⏳ TX enviada: ${tx.hash}`);
            console.log(`   ⏳ Aguardando confirmação...`);

            const receipt = await tx.wait();

            if (receipt?.status === 1) {
                console.log(`   ✅ Confirmada! Gas usado: ${receipt.gasUsed.toString()}`);
                successCount++;
            } else {
                console.log(`   ❌ Falhou! Status: ${receipt?.status}`);
                failCount++;
            }
        } catch (error: any) {
            console.log(`   ❌ Erro ao enviar transação: ${error.message}`);
            failCount++;
        }

        console.log("");
    }

    // Resumo final
    console.log("=".repeat(60));
    console.log("📋 Resumo Final:");
    console.log(`   ✅ Transferências bem-sucedidas: ${successCount}`);
    console.log(`   ❌ Transferências falhas: ${failCount}`);
    console.log(`   📊 Total transferido: ${ethers.formatEther(ethAmount * BigInt(successCount))} ETH`);

    const finalBalance = await ethers.provider.getBalance(signerAddress);
    console.log(`   💰 Saldo final: ${ethers.formatEther(finalBalance)} ETH`);
    console.log("=".repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
