import { expect } from "chai";
import { ethers } from "hardhat";
import { PredictionMarket } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("PredictionMarket", function () {
  let predictionMarket: PredictionMarket;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;
  
  const BET_AMOUNT = ethers.parseEther("0.1");
  const SETTLEMENT_DATE = Math.floor(Date.now() / 1000) + 86400; // 1 dia no futuro

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    
    const PredictionMarketFactory = await ethers.getContractFactory("PredictionMarket");
    predictionMarket = await PredictionMarketFactory.deploy();
    await predictionMarket.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Deve definir o owner correto", async function () {
      expect(await predictionMarket.owner()).to.equal(owner.address);
    });

    it("Não deve ter predição ativa inicialmente", async function () {
      const prediction = await predictionMarket.getCurrentPrediction();
      expect(prediction.isActive).to.be.false;
    });
  });

  describe("Criar Predição", function () {
    it("Owner deve criar uma predição", async function () {
      await expect(
        predictionMarket.createPrediction(
          "Bitcoin $100k?",
          "Bitcoin vai atingir $100.000 até o final do ano?",
          SETTLEMENT_DATE,
          BET_AMOUNT
        )
      ).to.emit(predictionMarket, "PredictionCreated");

      const prediction = await predictionMarket.getCurrentPrediction();
      expect(prediction.shortName).to.equal("Bitcoin $100k?");
      expect(prediction.isActive).to.be.true;
      expect(await predictionMarket.betAmount()).to.equal(BET_AMOUNT);
    });

    it("Não-owner não deve criar predição", async function () {
      await expect(
        predictionMarket.connect(addr1).createPrediction(
          "Test",
          "Test description",
          SETTLEMENT_DATE,
          BET_AMOUNT
        )
      ).to.be.revertedWith("Apenas o owner pode executar esta funcao");
    });

    it("Não deve criar predição se já existe uma ativa", async function () {
      await predictionMarket.createPrediction(
        "Bitcoin $100k?",
        "Bitcoin vai atingir $100.000 até o final do ano?",
        SETTLEMENT_DATE,
        BET_AMOUNT
      );

      await expect(
        predictionMarket.createPrediction(
          "ETH $10k?",
          "Ethereum vai atingir $10.000?",
          SETTLEMENT_DATE,
          BET_AMOUNT
        )
      ).to.be.revertedWith("Ja existe uma predicao ativa");
    });
  });

  describe("Fazer Apostas", function () {
    beforeEach(async function () {
      await predictionMarket.createPrediction(
        "Bitcoin $100k?",
        "Bitcoin vai atingir $100.000 até o final do ano?",
        SETTLEMENT_DATE,
        BET_AMOUNT
      );
    });

    it("Usuário deve apostar em YES", async function () {
      await expect(
        predictionMarket.connect(addr1).placeBet(true, { value: BET_AMOUNT })
      ).to.emit(predictionMarket, "BetPlaced")
        .withArgs(addr1.address, true, BET_AMOUNT);

      const userBet = await predictionMarket.getUserBet(addr1.address);
      expect(userBet.hasBetPlaced).to.be.true;
      expect(userBet.choice).to.be.true;
    });

    it("Usuário deve apostar em NO", async function () {
      await expect(
        predictionMarket.connect(addr2).placeBet(false, { value: BET_AMOUNT })
      ).to.emit(predictionMarket, "BetPlaced")
        .withArgs(addr2.address, false, BET_AMOUNT);

      const userBet = await predictionMarket.getUserBet(addr2.address);
      expect(userBet.hasBetPlaced).to.be.true;
      expect(userBet.choice).to.be.false;
    });

    it("Não deve apostar com valor incorreto", async function () {
      await expect(
        predictionMarket.connect(addr1).placeBet(true, { 
          value: ethers.parseEther("0.05") 
        })
      ).to.be.revertedWith("Valor da aposta incorreto");
    });

    it("Não deve apostar duas vezes", async function () {
      await predictionMarket.connect(addr1).placeBet(true, { value: BET_AMOUNT });
      
      await expect(
        predictionMarket.connect(addr1).placeBet(false, { value: BET_AMOUNT })
      ).to.be.revertedWith("Voce ja apostou nesta predicao");
    });

    it("Deve retornar volumes corretos", async function () {
      await predictionMarket.connect(addr1).placeBet(true, { value: BET_AMOUNT });
      await predictionMarket.connect(addr2).placeBet(true, { value: BET_AMOUNT });
      await predictionMarket.connect(addr3).placeBet(false, { value: BET_AMOUNT });

      const volumes = await predictionMarket.getVolumes();
      expect(volumes.yesVolume).to.equal(BET_AMOUNT * 2n);
      expect(volumes.noVolume).to.equal(BET_AMOUNT);
    });
  });

  describe("Deletar Predição", function () {
    beforeEach(async function () {
      await predictionMarket.createPrediction(
        "Bitcoin $100k?",
        "Bitcoin vai atingir $100.000 até o final do ano?",
        SETTLEMENT_DATE,
        BET_AMOUNT
      );
    });

    it("Owner deve deletar predição e devolver apostas", async function () {
      await predictionMarket.connect(addr1).placeBet(true, { value: BET_AMOUNT });
      await predictionMarket.connect(addr2).placeBet(false, { value: BET_AMOUNT });

      const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);
      const addr2BalanceBefore = await ethers.provider.getBalance(addr2.address);

      await predictionMarket.deletePrediction();

      const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
      const addr2BalanceAfter = await ethers.provider.getBalance(addr2.address);

      expect(addr1BalanceAfter).to.equal(addr1BalanceBefore + BET_AMOUNT);
      expect(addr2BalanceAfter).to.equal(addr2BalanceBefore + BET_AMOUNT);

      const prediction = await predictionMarket.getCurrentPrediction();
      expect(prediction.isActive).to.be.false;
    });
  });

  describe("Resolver Predição", function () {
    beforeEach(async function () {
      await predictionMarket.createPrediction(
        "Bitcoin $100k?",
        "Bitcoin vai atingir $100.000 até o final do ano?",
        SETTLEMENT_DATE,
        BET_AMOUNT
      );
    });

    it("Owner deve resolver predição com resultado YES", async function () {
      // 2 apostas YES, 1 aposta NO
      await predictionMarket.connect(addr1).placeBet(true, { value: BET_AMOUNT });
      await predictionMarket.connect(addr2).placeBet(true, { value: BET_AMOUNT });
      await predictionMarket.connect(addr3).placeBet(false, { value: BET_AMOUNT });

      const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);
      const addr2BalanceBefore = await ethers.provider.getBalance(addr2.address);

      await predictionMarket.settlePrediction(true);

      const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
      const addr2BalanceAfter = await ethers.provider.getBalance(addr2.address);

      // Cada vencedor deve receber metade do total
      const expectedPrize = (BET_AMOUNT * 3n) / 2n;
      expect(addr1BalanceAfter).to.equal(addr1BalanceBefore + expectedPrize);
      expect(addr2BalanceAfter).to.equal(addr2BalanceBefore + expectedPrize);

      const prediction = await predictionMarket.getCurrentPrediction();
      expect(prediction.isSettled).to.be.true;
      expect(prediction.outcome).to.be.true;
    });

    it("Owner deve resolver predição com resultado NO", async function () {
      await predictionMarket.connect(addr1).placeBet(true, { value: BET_AMOUNT });
      await predictionMarket.connect(addr2).placeBet(false, { value: BET_AMOUNT });

      const addr2BalanceBefore = await ethers.provider.getBalance(addr2.address);

      await predictionMarket.settlePrediction(false);

      const addr2BalanceAfter = await ethers.provider.getBalance(addr2.address);

      // addr2 deve receber todo o valor
      expect(addr2BalanceAfter).to.equal(addr2BalanceBefore + BET_AMOUNT * 2n);

      const prediction = await predictionMarket.getCurrentPrediction();
      expect(prediction.isSettled).to.be.true;
      expect(prediction.outcome).to.be.false;
    });

    it("Não-owner não deve resolver predição", async function () {
      await predictionMarket.connect(addr1).placeBet(true, { value: BET_AMOUNT });

      await expect(
        predictionMarket.connect(addr1).settlePrediction(true)
      ).to.be.revertedWith("Apenas o owner pode executar esta funcao");
    });
  });
});
