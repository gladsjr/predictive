// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title PredictionMarket
 * @dev Contrato simplificado de mercado de predição descentralizado
 * @notice Permite ao owner criar uma disputa e aos usuários apostarem em YES ou NO
 */
contract PredictionMarket {
    address public owner;
    uint256 public betAmount; // Valor fixo para cada aposta
    
    struct Prediction {
        string shortName;
        string description;
        uint256 settlementDate;
        bool isActive;
        bool isSettled;
        bool outcome; // true = YES, false = NO
    }
    
    Prediction public currentPrediction;
    
    // Mapeamento de apostas: endereço => escolha (true = YES, false = NO)
    mapping(address => bool) public userBets;
    // Controla se o usuário já apostou
    mapping(address => bool) public hasBet;
    
    // Arrays para rastrear apostadores
    address[] public yesBettors;
    address[] public noBettors;
    
    // Eventos
    event PredictionCreated(string shortName, string description, uint256 settlementDate, uint256 betAmount);
    event PredictionDeleted(string shortName);
    event BetPlaced(address indexed bettor, bool choice, uint256 amount);
    event PredictionSettled(bool outcome, uint256 winnersCount, uint256 prizePerWinner);
    event RefundIssued(address indexed bettor, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Apenas o owner pode executar esta funcao");
        _;
    }
    
    modifier predictionActive() {
        require(currentPrediction.isActive, "Nenhuma predicao ativa no momento");
        _;
    }
    
    modifier predictionNotActive() {
        require(!currentPrediction.isActive, "Ja existe uma predicao ativa");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Cria uma nova predição
     * @param _shortName Nome curto da predição
     * @param _description Descrição detalhada
     * @param _settlementDate Data para apuração (timestamp)
     * @param _betAmount Valor fixo da aposta em wei
     */
    function createPrediction(
        string memory _shortName,
        string memory _description,
        uint256 _settlementDate,
        uint256 _betAmount
    ) external onlyOwner predictionNotActive {
        require(_betAmount > 0, "Valor da aposta deve ser maior que zero");
        require(_settlementDate > block.timestamp, "Data de apuracao deve ser no futuro");
        
        currentPrediction = Prediction({
            shortName: _shortName,
            description: _description,
            settlementDate: _settlementDate,
            isActive: true,
            isSettled: false,
            outcome: false
        });
        
        betAmount = _betAmount;
        
        emit PredictionCreated(_shortName, _description, _settlementDate, _betAmount);
    }
    
    /**
     * @dev Deleta a predição atual e devolve todas as apostas
     */
    function deletePrediction() external onlyOwner predictionActive {
        require(!currentPrediction.isSettled, "Nao pode deletar predicao ja resolvida");
        
        string memory predictionName = currentPrediction.shortName;
        
        // Devolve todas as apostas YES
        for (uint256 i = 0; i < yesBettors.length; i++) {
            address bettor = yesBettors[i];
            hasBet[bettor] = false;
            payable(bettor).transfer(betAmount);
            emit RefundIssued(bettor, betAmount);
        }
        
        // Devolve todas as apostas NO
        for (uint256 i = 0; i < noBettors.length; i++) {
            address bettor = noBettors[i];
            hasBet[bettor] = false;
            payable(bettor).transfer(betAmount);
            emit RefundIssued(bettor, betAmount);
        }
        
        // Limpa os arrays
        delete yesBettors;
        delete noBettors;
        
        // Reseta a predição
        delete currentPrediction;
        betAmount = 0;
        
        emit PredictionDeleted(predictionName);
    }
    
    /**
     * @dev Permite que um usuário faça uma aposta
     * @param _choice true para YES, false para NO
     */
    function placeBet(bool _choice) external payable predictionActive {
        require(!currentPrediction.isSettled, "Predicao ja foi resolvida");
        require(!hasBet[msg.sender], "Voce ja apostou nesta predicao");
        require(msg.value == betAmount, "Valor da aposta incorreto");
        
        userBets[msg.sender] = _choice;
        hasBet[msg.sender] = true;
        
        if (_choice) {
            yesBettors.push(msg.sender);
        } else {
            noBettors.push(msg.sender);
        }
        
        emit BetPlaced(msg.sender, _choice, msg.value);
    }
    
    /**
     * @dev Owner define o resultado da predição e distribui prêmios
     * @param _outcome true para YES, false para NO
     */
    function settlePrediction(bool _outcome) external onlyOwner predictionActive {
        require(!currentPrediction.isSettled, "Predicao ja foi resolvida");
        
        currentPrediction.isSettled = true;
        currentPrediction.outcome = _outcome;
        
        address[] memory winners = _outcome ? yesBettors : noBettors;
        uint256 winnersCount = winners.length;
        
        if (winnersCount > 0) {
            uint256 totalPrize = address(this).balance;
            uint256 prizePerWinner = totalPrize / winnersCount;
            
            for (uint256 i = 0; i < winnersCount; i++) {
                payable(winners[i]).transfer(prizePerWinner);
            }
            
            emit PredictionSettled(_outcome, winnersCount, prizePerWinner);
        } else {
            // Se não há vencedores, devolve o dinheiro aos perdedores
            address[] memory losers = _outcome ? noBettors : yesBettors;
            for (uint256 i = 0; i < losers.length; i++) {
                payable(losers[i]).transfer(betAmount);
            }
            
            emit PredictionSettled(_outcome, 0, 0);
        }
        
        // Limpa os arrays após distribuição
        delete yesBettors;
        delete noBettors;
    }
    
    /**
     * @dev Retorna os volumes totais de apostas
     * @return yesVolume Volume total apostado em YES
     * @return noVolume Volume total apostado em NO
     */
    function getVolumes() external view returns (uint256 yesVolume, uint256 noVolume) {
        yesVolume = yesBettors.length * betAmount;
        noVolume = noBettors.length * betAmount;
    }
    
    /**
     * @dev Retorna informações da predição atual
     */
    function getCurrentPrediction() external view returns (
        string memory shortName,
        string memory description,
        uint256 settlementDate,
        bool isActive,
        bool isSettled,
        bool outcome,
        uint256 yesCount,
        uint256 noCount
    ) {
        return (
            currentPrediction.shortName,
            currentPrediction.description,
            currentPrediction.settlementDate,
            currentPrediction.isActive,
            currentPrediction.isSettled,
            currentPrediction.outcome,
            yesBettors.length,
            noBettors.length
        );
    }
    
    /**
     * @dev Retorna se o endereço já apostou e sua escolha
     */
    function getUserBet(address _user) external view returns (bool hasBetPlaced, bool choice) {
        return (hasBet[_user], userBets[_user]);
    }
    
    /**
     * @dev Retorna o saldo do contrato
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
