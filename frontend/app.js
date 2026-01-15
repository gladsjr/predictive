// Configuração
let provider;
let signer;
let contract;
let userAccount;
let contractAddress;
let contractABI;

const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 em decimal

// Inicialização
async function init() {
    try {
        // Carrega o endereço do contrato
        const addressResponse = await fetch('contract-address.json');
        const addressData = await addressResponse.json();
        contractAddress = addressData.PredictionMarket;
        document.getElementById('contractAddress').textContent = contractAddress;

        // Carrega o ABI
        const abiResponse = await fetch('PredictionMarket.json');
        const abiData = await abiResponse.json();
        contractABI = abiData.abi;

        // Configura eventos
        setupEventListeners();
        
        showStatus('Aplicação carregada. Conecte sua carteira!', 'info');
    } catch (error) {
        console.error('Erro ao inicializar:', error);
        showStatus('Erro ao carregar dados do contrato. Certifique-se de fazer deploy primeiro!', 'error');
    }
}

function setupEventListeners() {
    document.getElementById('connectButton').addEventListener('click', connectWallet);
    document.getElementById('createPredictionForm').addEventListener('submit', createPrediction);
    document.getElementById('settleYesButton').addEventListener('click', () => settlePrediction(true));
    document.getElementById('settleNoButton').addEventListener('click', () => settlePrediction(false));
    document.getElementById('deleteButton').addEventListener('click', deletePrediction);
    document.getElementById('betYesButton').addEventListener('click', () => placeBet(true));
    document.getElementById('betNoButton').addEventListener('click', () => placeBet(false));
}

// Conectar carteira
async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        showStatus('MetaMask não está instalado! Por favor, instale o MetaMask.', 'error');
        return;
    }

    try {
        // Solicita acesso à conta
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        userAccount = await signer.getAddress();
        
        // Verifica a rede
        const network = await provider.getNetwork();
        const chainId = '0x' + network.chainId.toString(16);
        
        document.getElementById('accountAddress').textContent = 
            userAccount.substring(0, 6) + '...' + userAccount.substring(38);
        document.getElementById('networkName').textContent = 
            network.name === 'unknown' ? `Chain ID: ${network.chainId}` : network.name;
        
        document.getElementById('connectButton').style.display = 'none';
        document.getElementById('accountInfo').style.display = 'block';
        
        // Conecta ao contrato
        contract = new ethers.Contract(contractAddress, contractABI, signer);
        
        // Carrega dados
        await loadPredictionData();
        
        // Configura listeners de eventos da blockchain
        setupContractListeners();
        
        showStatus('Carteira conectada com sucesso!', 'success');
        
        // Atualiza a cada 5 segundos
        setInterval(loadPredictionData, 5000);
        
    } catch (error) {
        console.error('Erro ao conectar carteira:', error);
        showStatus('Erro ao conectar carteira: ' + error.message, 'error');
    }
}

// Configurar listeners de eventos do contrato
function setupContractListeners() {
    contract.on('PredictionCreated', () => {
        showStatus('Nova predição criada!', 'success');
        loadPredictionData();
    });
    
    contract.on('BetPlaced', (bettor, choice, amount) => {
        if (bettor.toLowerCase() === userAccount.toLowerCase()) {
            showStatus(`Sua aposta em ${choice ? 'YES' : 'NO'} foi registrada!`, 'success');
        }
        loadPredictionData();
    });
    
    contract.on('PredictionSettled', () => {
        showStatus('Predição resolvida!', 'info');
        loadPredictionData();
    });
    
    contract.on('PredictionDeleted', () => {
        showStatus('Predição deletada e apostas devolvidas!', 'info');
        loadPredictionData();
    });
}

// Carregar dados da predição
async function loadPredictionData() {
    if (!contract) return;
    
    try {
        const prediction = await contract.getCurrentPrediction();
        const owner = await contract.owner();
        const isOwner = owner.toLowerCase() === userAccount.toLowerCase();
        
        // Mostra/esconde seções do owner
        document.getElementById('ownerSection').style.display = isOwner ? 'block' : 'none';
        
        if (prediction.isActive) {
            // Há uma predição ativa
            document.getElementById('noPrediction').style.display = 'none';
            document.getElementById('predictionSection').style.display = 'block';
            
            // Preenche informações
            document.getElementById('predictionName').textContent = prediction.shortName;
            document.getElementById('predictionDescription').textContent = prediction.description;
            
            const date = new Date(Number(prediction.settlementDate) * 1000);
            document.getElementById('predictionDate').textContent = date.toLocaleString('pt-BR');
            
            const betAmount = await contract.betAmount();
            const betAmountEth = ethers.utils.formatEther(betAmount);
            document.getElementById('predictionBetAmount').textContent = betAmountEth;
            
            // Status
            let statusText = prediction.isSettled ? 
                '✅ Resolvida' : '🔴 Ativa - Apostas abertas';
            document.getElementById('predictionStatus').innerHTML = 
                `<strong>Status:</strong> ${statusText}`;
            
            // Volumes
            const volumes = await contract.getVolumes();
            const yesVolumeEth = ethers.utils.formatEther(volumes.yesVolume);
            const noVolumeEth = ethers.utils.formatEther(volumes.noVolume);
            const totalVolume = parseFloat(yesVolumeEth) + parseFloat(noVolumeEth);
            
            document.getElementById('yesVolume').textContent = yesVolumeEth + ' ETH';
            document.getElementById('noVolume').textContent = noVolumeEth + ' ETH';
            document.getElementById('yesCount').textContent = `(${prediction.yesCount} apostas)`;
            document.getElementById('noCount').textContent = `(${prediction.noCount} apostas)`;
            document.getElementById('totalPool').textContent = totalVolume.toFixed(4);
            
            // Atualiza barras de volume
            const yesPercentage = totalVolume > 0 ? (parseFloat(yesVolumeEth) / totalVolume) * 100 : 0;
            const noPercentage = totalVolume > 0 ? (parseFloat(noVolumeEth) / totalVolume) * 100 : 0;
            
            document.getElementById('yesBar').style.width = yesPercentage + '%';
            document.getElementById('noBar').style.width = noPercentage + '%';
            
            // Verifica se o usuário já apostou
            const userBet = await contract.getUserBet(userAccount);
            
            if (prediction.isSettled) {
                // Mostra resultado
                document.getElementById('bettingSection').style.display = 'none';
                document.getElementById('resultSection').style.display = 'block';
                
                const outcomeText = prediction.outcome ? 'YES ✅' : 'NO ❌';
                let resultMessage = `Resultado: ${outcomeText}`;
                
                if (userBet.hasBetPlaced) {
                    const userWon = userBet.choice === prediction.outcome;
                    resultMessage += userWon ? 
                        ' - 🎉 Você ganhou!' : 
                        ' - 😢 Você perdeu.';
                }
                
                document.getElementById('resultText').textContent = resultMessage;
                
                // Controles do owner
                if (isOwner) {
                    document.getElementById('ownerControls').style.display = 'none';
                }
            } else {
                // Apostas abertas
                document.getElementById('resultSection').style.display = 'none';
                document.getElementById('bettingSection').style.display = 'block';
                
                if (userBet.hasBetPlaced) {
                    document.getElementById('userBetInfo').style.display = 'block';
                    document.getElementById('betButtons').style.display = 'none';
                    const choiceText = userBet.choice ? 'YES ✅' : 'NO ❌';
                    document.getElementById('userChoice').textContent = choiceText;
                } else {
                    document.getElementById('userBetInfo').style.display = 'none';
                    document.getElementById('betButtons').style.display = 'flex';
                }
                
                // Controles do owner
                if (isOwner) {
                    document.getElementById('ownerControls').style.display = 'block';
                }
            }
            
        } else {
            // Nenhuma predição ativa
            document.getElementById('predictionSection').style.display = 'none';
            document.getElementById('noPrediction').style.display = 'block';
            
            if (isOwner) {
                document.getElementById('ownerControls').style.display = 'none';
            }
        }
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
}

// Criar predição (apenas owner)
async function createPrediction(e) {
    e.preventDefault();
    
    try {
        const shortName = document.getElementById('shortName').value;
        const description = document.getElementById('description').value;
        const settlementDateInput = document.getElementById('settlementDate').value;
        const betAmountEth = document.getElementById('betAmount').value;
        
        // Converte data para timestamp
        const settlementDate = Math.floor(new Date(settlementDateInput).getTime() / 1000);
        
        // Converte ETH para Wei
        const betAmount = ethers.utils.parseEther(betAmountEth);
        
        showStatus('Criando predição...', 'info');
        
        const tx = await contract.createPrediction(
            shortName,
            description,
            settlementDate,
            betAmount
        );
        
        showStatus('Transação enviada. Aguardando confirmação...', 'info');
        await tx.wait();
        
        showStatus('Predição criada com sucesso!', 'success');
        
        // Limpa o formulário
        document.getElementById('createPredictionForm').reset();
        
        await loadPredictionData();
        
    } catch (error) {
        console.error('Erro ao criar predição:', error);
        showStatus('Erro ao criar predição: ' + error.message, 'error');
    }
}

// Deletar predição (apenas owner)
async function deletePrediction() {
    if (!confirm('Tem certeza que deseja deletar esta predição? Todas as apostas serão devolvidas.')) {
        return;
    }
    
    try {
        showStatus('Deletando predição...', 'info');
        
        const tx = await contract.deletePrediction();
        showStatus('Transação enviada. Aguardando confirmação...', 'info');
        await tx.wait();
        
        showStatus('Predição deletada e apostas devolvidas!', 'success');
        await loadPredictionData();
        
    } catch (error) {
        console.error('Erro ao deletar predição:', error);
        showStatus('Erro ao deletar predição: ' + error.message, 'error');
    }
}

// Fazer aposta
async function placeBet(choice) {
    try {
        const betAmount = await contract.betAmount();
        const betAmountEth = ethers.utils.formatEther(betAmount);
        
        const choiceText = choice ? 'YES' : 'NO';
        if (!confirm(`Confirma aposta de ${betAmountEth} ETH em ${choiceText}?`)) {
            return;
        }
        
        showStatus('Enviando aposta...', 'info');
        
        const tx = await contract.placeBet(choice, { value: betAmount });
        showStatus('Transação enviada. Aguardando confirmação...', 'info');
        await tx.wait();
        
        showStatus('Aposta registrada com sucesso!', 'success');
        await loadPredictionData();
        
    } catch (error) {
        console.error('Erro ao fazer aposta:', error);
        showStatus('Erro ao fazer aposta: ' + error.message, 'error');
    }
}

// Resolver predição (apenas owner)
async function settlePrediction(outcome) {
    const outcomeText = outcome ? 'YES' : 'NO';
    if (!confirm(`Tem certeza que deseja resolver a predição como ${outcomeText}?`)) {
        return;
    }
    
    try {
        showStatus('Resolvendo predição...', 'info');
        
        const tx = await contract.settlePrediction(outcome);
        showStatus('Transação enviada. Aguardando confirmação...', 'info');
        await tx.wait();
        
        showStatus('Predição resolvida e prêmios distribuídos!', 'success');
        await loadPredictionData();
        
    } catch (error) {
        console.error('Erro ao resolver predição:', error);
        showStatus('Erro ao resolver predição: ' + error.message, 'error');
    }
}

// Mostrar mensagem de status
function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = `status-message show ${type}`;
    
    setTimeout(() => {
        statusEl.classList.remove('show');
    }, 5000);
}

// Inicializa quando a página carrega
window.addEventListener('load', init);

// Listener para mudanças de conta
if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
            window.location.reload();
        }
    });
    
    window.ethereum.on('chainChanged', () => {
        window.location.reload();
    });
}
