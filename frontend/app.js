import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6/+esm";

let provider, signer, contract, userAccount, contractAddress, contractABI;

async function init() {
    try {
        const addressResponse = await fetch('frontend/contract-address.json');
        const addressData = await addressResponse.json();
        contractAddress = addressData.PredictionMarket;
        document.getElementById('contractAddress').textContent = contractAddress;

        const abiResponse = await fetch('frontend/PredictionMarket.json');
        const abiData = await abiResponse.json();
        contractABI = abiData.abi;

        document.getElementById('connectButton').addEventListener('click', connectWallet);

        showStatus('Aplicação carregada. Conecte sua carteira!', 'info');
    } catch (error) {
        console.error('Erro ao inicializar:', error);
        showStatus('Erro ao carregar dados do contrato!', 'error');
    }
}

async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        showStatus('MetaMask não está instalado!', 'error');
        return;
    }

    try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        const chainIdNum = Number(network.chainId);

        // Mapeia chainIds para nomes de rede
        const networkNames = {
            1: 'Ethereum Mainnet',
            11155111: 'Sepolia',
            31337: 'Localhost',
            1337: 'Localhost'
        };

        const networkName = networkNames[chainIdNum] || `Chain ID: ${chainIdNum}`;

        signer = await provider.getSigner();
        userAccount = await signer.getAddress();

        document.getElementById('accountAddress').textContent =
            userAccount.substring(0, 6) + '...' + userAccount.substring(38);
        document.getElementById('networkName').textContent = networkName;
        document.getElementById('connectButton').style.display = 'none';
        document.getElementById('accountInfo').style.display = 'block';

        contract = new ethers.Contract(contractAddress, contractABI, signer);

        await loadPredictions();
        showStatus('Carteira conectada com sucesso!', 'success');

        setInterval(loadPredictions, 5000);

    } catch (error) {
        console.error('Erro ao conectar carteira:', error);
        showStatus('Erro ao conectar carteira: ' + error.message, 'error');
    }
}

async function loadPredictions() {
    if (!contract) return;

    try {
        const owner = await contract.owner();
        const isOwner = owner.toLowerCase() === userAccount.toLowerCase();

        document.getElementById('ownerSection').style.display = isOwner ? 'block' : 'none';
        document.getElementById('createPredictionForm').onsubmit = createPrediction;

        const predictionIds = await contract.getActivePredictions();

        if (predictionIds.length === 0) {
            document.getElementById('predictionsContainer').innerHTML =
                '<p class="no-predictions">Nenhuma predição ativa no momento.</p>';
            return;
        }

        let html = '';
        for (let i = 0; i < predictionIds.length; i++) {
            const id = Number(predictionIds[i]);
            const pred = await contract.getPrediction(id);
            const stats = await contract.getPredictionStats(id);
            html += renderPredictionCard(id, pred, stats, isOwner);
        }

        document.getElementById('predictionsContainer').innerHTML = html;

    } catch (error) {
        console.error('Erro ao carregar predições:', error);
        showStatus('Erro ao carregar dados: ' + error.message, 'error');
    }
}

function renderPredictionCard(id, pred, stats, isOwner) {
    const [predId, shortName, description, settlementDate, betAmount, isActive, bettingOpen, isSettled] = pred;
    const [outcome, yesCount, noCount, createdAt] = stats;

    const date = new Date(Number(settlementDate) * 1000).toLocaleString('pt-BR');
    const betAmountEth = ethers.formatEther(betAmount);

    let statusBadge = '';
    if (isSettled) {
        statusBadge = `<span class="badge badge-settled">Resolvida: ${outcome ? 'YES' : 'NO'}</span>`;
    } else if (bettingOpen) {
        statusBadge = '<span class="badge badge-open">Apostas Abertas</span>';
    } else {
        statusBadge = '<span class="badge badge-closed">Apostas Fechadas</span>';
    }

    const ownerButtons = isOwner && !isSettled ? `
        <div class="owner-controls">
            ${bettingOpen ?
            `<button onclick="closeBetting(${id})" class="btn btn-warning btn-sm">Fechar Apostas</button>` :
            `<button onclick="reopenBetting(${id})" class="btn btn-info btn-sm">Reabrir Apostas</button>`
        }
            <button onclick="settlePrediction(${id}, true)" class="btn btn-success btn-sm">Resolver YES</button>
            <button onclick="settlePrediction(${id}, false)" class="btn btn-danger btn-sm">Resolver NO</button>
            <button onclick="deletePrediction(${id})" class="btn btn-outline btn-sm">Deletar</button>
            <button onclick="viewBettors(${id})" class="btn btn-secondary btn-sm">Ver Apostadores</button>
        </div>
    ` : '';

    const userButtons = !isSettled && bettingOpen ? `
        <div class="bet-buttons">
            <button onclick="placeBet(${id}, true)" class="btn btn-yes">Apostar YES</button>
            <button onclick="placeBet(${id}, false)" class="btn btn-no">Apostar NO</button>
        </div>
    ` : '';

    return `
        <div class="prediction-card">
            <h3>${shortName} ${statusBadge}</h3>
            <p>${description}</p>
            <div class="prediction-info">
                <div><strong>Aposta:</strong> ${betAmountEth} ETH</div>
                <div><strong>Data:</strong> ${date}</div>
                <div><strong>YES:</strong> ${yesCount} | <strong>NO:</strong> ${noCount}</div>
            </div>
            ${ownerButtons}
            ${userButtons}
        </div>
    `;
}

async function createPrediction(e) {
    e.preventDefault();
    try {
        const shortName = document.getElementById('shortName').value;
        const description = document.getElementById('description').value;
        const settlementDateInput = document.getElementById('settlementDate').value;
        const betAmountEth = document.getElementById('betAmount').value;

        const settlementDate = Math.floor(new Date(settlementDateInput).getTime() / 1000);
        const betAmount = ethers.parseEther(betAmountEth);

        showStatus('Criando predição...', 'info');

        const tx = await contract.createPrediction(shortName, description, settlementDate, betAmount);
        await tx.wait();

        showStatus('Predição criada com sucesso!', 'success');
        e.target.reset();
        await loadPredictions();
    } catch (error) {
        console.error('Erro ao criar predição:', error);
        showStatus('Erro: ' + error.message, 'error');
    }
}

async function placeBet(predictionId, choice) {
    try {
        const pred = await contract.getPrediction(predictionId);
        const betAmount = pred[4]; // betAmount é o 5º elemento
        const betAmountEth = ethers.formatEther(betAmount);

        if (!confirm(`Apostar ${betAmountEth} ETH em ${choice ? 'YES' : 'NO'}?`)) return;

        showStatus('Processando aposta...', 'info');
        const tx = await contract.placeBet(predictionId, choice, { value: betAmount });
        await tx.wait();

        showStatus('Aposta realizada com sucesso!', 'success');
        await loadPredictions();
    } catch (error) {
        console.error('Erro ao apostar:', error);
        showStatus('Erro: ' + error.message, 'error');
    }
}

async function closeBetting(predictionId) {
    try {
        showStatus('Fechando apostas...', 'info');
        const tx = await contract.closeBetting(predictionId);
        await tx.wait();
        showStatus('Apostas fechadas!', 'success');
        await loadPredictions();
    } catch (error) {
        showStatus('Erro: ' + error.message, 'error');
    }
}

async function reopenBetting(predictionId) {
    try {
        showStatus('Reabrindo apostas...', 'info');
        const tx = await contract.reopenBetting(predictionId);
        await tx.wait();
        showStatus('Apostas reabertas!', 'success');
        await loadPredictions();
    } catch (error) {
        showStatus('Erro: ' + error.message, 'error');
    }
}

async function settlePrediction(predictionId, outcome) {
    try {
        if (!confirm(`Resolver predição como ${outcome ? 'YES' : 'NO'}?`)) return;

        showStatus('Resolvendo predição...', 'info');
        const tx = await contract.settlePrediction(predictionId, outcome);
        await tx.wait();
        showStatus('Predição resolvida e prêmios distribuídos!', 'success');
        await loadPredictions();
    } catch (error) {
        showStatus('Erro: ' + error.message, 'error');
    }
}

async function deletePrediction(predictionId) {
    try {
        if (!confirm('Deletar predição e devolver apostas?')) return;

        showStatus('Deletando predição...', 'info');
        const tx = await contract.deletePrediction(predictionId);
        await tx.wait();
        showStatus('Predição deletada e apostas devolvidas!', 'success');
        await loadPredictions();
    } catch (error) {
        showStatus('Erro: ' + error.message, 'error');
    }
}

async function viewBettors(predictionId) {
    try {
        const bettors = await contract.getBettors(predictionId);
        const [yesBettors, noBettors] = bettors;

        let message = `Apostadores YES (${yesBettors.length}):\n`;
        yesBettors.forEach(addr => message += `${addr}\n`);
        message += `\nApostadores NO (${noBettors.length}):\n`;
        noBettors.forEach(addr => message += `${addr}\n`);

        alert(message);
    } catch (error) {
        showStatus('Erro ao carregar apostadores: ' + error.message, 'error');
    }
}

function showStatus(message, type) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = 'status-message ' + type + ' show';
    setTimeout(() => statusEl.classList.remove('show'), 5000);
}

window.addEventListener('load', init);
window.placeBet = placeBet;
window.closeBetting = closeBetting;
window.reopenBetting = reopenBetting;
window.settlePrediction = settlePrediction;
window.deletePrediction = deletePrediction;
window.viewBettors = viewBettors;

if (window.ethereum) {
    window.ethereum.on('accountsChanged', () => window.location.reload());
    window.ethereum.on('chainChanged', () => window.location.reload());
}
