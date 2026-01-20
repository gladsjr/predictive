// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title PredictionMarket
 * @dev Contrato de mercado de predição com suporte a múltiplas predições simultâneas
 */
contract PredictionMarket {
    address public owner;
    uint256 private nextPredictionId;

    struct Prediction {
        uint256 id;
        string shortName;
        string description;
        uint256 settlementDate;
        uint256 betAmount;
        bool isActive;
        bool bettingOpen; // Nova flag para controlar se apostas estão abertas
        bool isSettled;
        bool outcome;
        uint256 createdAt;
    }

    // Mapping de ID => Predição
    mapping(uint256 => Prediction) public predictions;

    // Mapping de ID => endereço => aposta
    mapping(uint256 => mapping(address => bool)) public userBets;
    mapping(uint256 => mapping(address => bool)) public hasBet;

    // Arrays de apostadores por predição
    mapping(uint256 => address[]) public yesBettors;
    mapping(uint256 => address[]) public noBettors;

    // Array de IDs de predições ativas
    uint256[] public activePredictionIds;

    // Eventos
    event PredictionCreated(
        uint256 indexed predictionId,
        string shortName,
        string description,
        uint256 settlementDate,
        uint256 betAmount
    );
    event PredictionDeleted(uint256 indexed predictionId, string shortName);
    event BettingClosed(uint256 indexed predictionId);
    event BettingReopened(uint256 indexed predictionId);
    event BetPlaced(
        uint256 indexed predictionId,
        address indexed bettor,
        bool choice,
        uint256 amount
    );
    event PredictionSettled(
        uint256 indexed predictionId,
        bool outcome,
        uint256 winnersCount,
        uint256 prizePerWinner
    );
    event RefundIssued(
        uint256 indexed predictionId,
        address indexed bettor,
        uint256 amount
    );

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "Apenas o owner pode executar esta funcao"
        );
        _;
    }

    modifier predictionExists(uint256 _predictionId) {
        require(predictions[_predictionId].isActive, "Predicao nao existe");
        _;
    }

    constructor() {
        owner = msg.sender;
        nextPredictionId = 1;
    }

    /**
     * @dev Cria uma nova predição
     */
    function createPrediction(
        string memory _shortName,
        string memory _description,
        uint256 _settlementDate,
        uint256 _betAmount
    ) external onlyOwner returns (uint256) {
        require(_betAmount > 0, "Valor da aposta deve ser maior que zero");
        require(
            _settlementDate > block.timestamp,
            "Data de apuracao deve ser no futuro"
        );

        uint256 predictionId = nextPredictionId++;

        predictions[predictionId] = Prediction({
            id: predictionId,
            shortName: _shortName,
            description: _description,
            settlementDate: _settlementDate,
            betAmount: _betAmount,
            isActive: true,
            bettingOpen: true,
            isSettled: false,
            outcome: false,
            createdAt: block.timestamp
        });

        activePredictionIds.push(predictionId);

        emit PredictionCreated(
            predictionId,
            _shortName,
            _description,
            _settlementDate,
            _betAmount
        );

        return predictionId;
    }

    /**
     * @dev Fecha as apostas para uma predição
     */
    function closeBetting(
        uint256 _predictionId
    ) external onlyOwner predictionExists(_predictionId) {
        require(
            !predictions[_predictionId].isSettled,
            "Predicao ja foi resolvida"
        );
        require(
            predictions[_predictionId].bettingOpen,
            "Apostas ja estao fechadas"
        );

        predictions[_predictionId].bettingOpen = false;

        emit BettingClosed(_predictionId);
    }

    /**
     * @dev Reabre as apostas para uma predição
     */
    function reopenBetting(
        uint256 _predictionId
    ) external onlyOwner predictionExists(_predictionId) {
        require(
            !predictions[_predictionId].isSettled,
            "Predicao ja foi resolvida"
        );
        require(
            !predictions[_predictionId].bettingOpen,
            "Apostas ja estao abertas"
        );

        predictions[_predictionId].bettingOpen = true;

        emit BettingReopened(_predictionId);
    }

    /**
     * @dev Deleta uma predição e devolve todas as apostas
     */
    function deletePrediction(
        uint256 _predictionId
    ) external onlyOwner predictionExists(_predictionId) {
        require(
            !predictions[_predictionId].isSettled,
            "Nao pode deletar predicao ja resolvida"
        );

        Prediction memory pred = predictions[_predictionId];

        // Devolve todas as apostas YES
        address[] memory yesAddrs = yesBettors[_predictionId];
        for (uint256 i = 0; i < yesAddrs.length; i++) {
            address bettor = yesAddrs[i];
            hasBet[_predictionId][bettor] = false;
            payable(bettor).transfer(pred.betAmount);
            emit RefundIssued(_predictionId, bettor, pred.betAmount);
        }

        // Devolve todas as apostas NO
        address[] memory noAddrs = noBettors[_predictionId];
        for (uint256 i = 0; i < noAddrs.length; i++) {
            address bettor = noAddrs[i];
            hasBet[_predictionId][bettor] = false;
            payable(bettor).transfer(pred.betAmount);
            emit RefundIssued(_predictionId, bettor, pred.betAmount);
        }

        // Limpa os arrays
        delete yesBettors[_predictionId];
        delete noBettors[_predictionId];

        // Remove da lista de predições ativas
        _removeFromActiveList(_predictionId);

        // Marca como inativa
        predictions[_predictionId].isActive = false;

        emit PredictionDeleted(_predictionId, pred.shortName);
    }

    /**
     * @dev Permite que um usuário faça uma aposta
     */
    function placeBet(
        uint256 _predictionId,
        bool _choice
    ) external payable predictionExists(_predictionId) {
        Prediction memory pred = predictions[_predictionId];

        require(pred.bettingOpen, "Apostas estao fechadas para esta predicao");
        require(!pred.isSettled, "Predicao ja foi resolvida");
        require(
            !hasBet[_predictionId][msg.sender],
            "Voce ja apostou nesta predicao"
        );
        require(msg.value == pred.betAmount, "Valor da aposta incorreto");

        userBets[_predictionId][msg.sender] = _choice;
        hasBet[_predictionId][msg.sender] = true;

        if (_choice) {
            yesBettors[_predictionId].push(msg.sender);
        } else {
            noBettors[_predictionId].push(msg.sender);
        }

        emit BetPlaced(_predictionId, msg.sender, _choice, msg.value);
    }

    /**
     * @dev Owner define o resultado da predição e distribui prêmios
     */
    function settlePrediction(
        uint256 _predictionId,
        bool _outcome
    ) external onlyOwner predictionExists(_predictionId) {
        require(
            !predictions[_predictionId].isSettled,
            "Predicao ja foi resolvida"
        );

        predictions[_predictionId].isSettled = true;
        predictions[_predictionId].outcome = _outcome;
        predictions[_predictionId].bettingOpen = false;

        _distributeWinnings(_predictionId, _outcome);
    }

    /**
     * @dev Distribui os prêmios aos vencedores (função auxiliar)
     */
    function _distributeWinnings(uint256 _predictionId, bool _outcome) private {
        address[] storage winners = _outcome
            ? yesBettors[_predictionId]
            : noBettors[_predictionId];

        if (winners.length > 0) {
            uint256 totalBets = yesBettors[_predictionId].length +
                noBettors[_predictionId].length;
            uint256 totalPrize = totalBets *
                predictions[_predictionId].betAmount;
            uint256 prizePerWinner = totalPrize / winners.length;

            for (uint256 i = 0; i < winners.length; i++) {
                payable(winners[i]).transfer(prizePerWinner);
            }

            emit PredictionSettled(
                _predictionId,
                _outcome,
                winners.length,
                prizePerWinner
            );
        } else {
            _refundLosers(_predictionId, _outcome);
        }
    }

    /**
     * @dev Reembolsa perdedores quando não há vencedores
     */
    function _refundLosers(uint256 _predictionId, bool _outcome) private {
        address[] storage losers = _outcome
            ? noBettors[_predictionId]
            : yesBettors[_predictionId];

        uint256 refundAmount = predictions[_predictionId].betAmount;
        for (uint256 i = 0; i < losers.length; i++) {
            payable(losers[i]).transfer(refundAmount);
        }

        emit PredictionSettled(_predictionId, _outcome, 0, 0);
    }

    /**
     * @dev Retorna os volumes totais de apostas para uma predição
     */
    function getVolumes(
        uint256 _predictionId
    )
        external
        view
        predictionExists(_predictionId)
        returns (uint256 yesVolume, uint256 noVolume)
    {
        uint256 betAmountForPrediction = predictions[_predictionId].betAmount;
        yesVolume = yesBettors[_predictionId].length * betAmountForPrediction;
        noVolume = noBettors[_predictionId].length * betAmountForPrediction;
    }

    /**
     * @dev Retorna informações básicas de uma predição
     */
    function getPrediction(
        uint256 _predictionId
    )
        external
        view
        predictionExists(_predictionId)
        returns (
            uint256 id,
            string memory shortName,
            string memory description,
            uint256 settlementDate,
            uint256 betAmount,
            bool isActive,
            bool bettingOpen,
            bool isSettled
        )
    {
        Prediction storage p = predictions[_predictionId];
        return (
            p.id,
            p.shortName,
            p.description,
            p.settlementDate,
            p.betAmount,
            p.isActive,
            p.bettingOpen,
            p.isSettled
        );
    }

    /**
     * @dev Retorna estatísticas de uma predição (outcome e contagens)
     */
    function getPredictionStats(
        uint256 _predictionId
    )
        external
        view
        predictionExists(_predictionId)
        returns (
            bool outcome,
            uint256 yesCount,
            uint256 noCount,
            uint256 createdAt
        )
    {
        return (
            predictions[_predictionId].outcome,
            yesBettors[_predictionId].length,
            noBettors[_predictionId].length,
            predictions[_predictionId].createdAt
        );
    }

    /**
     * @dev Retorna todas as predições ativas
     */
    function getActivePredictions() external view returns (uint256[] memory) {
        return activePredictionIds;
    }

    /**
     * @dev Retorna se o usuário já apostou e sua escolha
     */
    function getUserBet(
        uint256 _predictionId,
        address _user
    ) external view returns (bool hasBetPlaced, bool choice) {
        return (hasBet[_predictionId][_user], userBets[_predictionId][_user]);
    }

    /**
     * @dev Retorna todos os apostadores de uma predição (apenas owner)
     */
    function getBettors(
        uint256 _predictionId
    )
        external
        view
        onlyOwner
        predictionExists(_predictionId)
        returns (
            address[] memory yesBettorsList,
            address[] memory noBettorsList
        )
    {
        return (yesBettors[_predictionId], noBettors[_predictionId]);
    }

    /**
     * @dev Remove um ID da lista de predições ativas
     */
    function _removeFromActiveList(uint256 _predictionId) private {
        uint256 length = activePredictionIds.length;
        for (uint256 i = 0; i < length; i++) {
            if (activePredictionIds[i] == _predictionId) {
                activePredictionIds[i] = activePredictionIds[length - 1];
                activePredictionIds.pop();
                break;
            }
        }
    }

    /**
     * @dev Retorna o saldo do contrato
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
