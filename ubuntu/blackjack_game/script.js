const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const hitButton = document.getElementById("hitButton");
const standButton = document.getElementById("standButton");
const doubleButton = document.getElementById("doubleButton");
const splitButton = document.getElementById("splitButton");
const newRoundButton = document.getElementById("newRoundButton");
const exitButton = document.getElementById("exitButton");
const balanceDisplay = document.getElementById("balance");
const betAmountInput = document.getElementById("betAmount");
const messageArea = document.getElementById("messageArea");
const themeToggleButton = document.getElementById("themeToggleButton");
const historyToggleButton = document.getElementById("historyToggleButton");
const roundHistoryArea = document.getElementById("roundHistoryArea");
const roundHistoryList = document.getElementById("roundHistoryList");
const playerAvatarDisplay = document.getElementById("playerAvatarDisplay");
const changeAvatarButton = document.getElementById("changeAvatarButton");
const avatarSelectionModal = document.getElementById("avatarSelectionModal");
const closeAvatarModalButton = document.getElementById("closeAvatarModal");
const avatarOptionsContainer = document.getElementById("avatarOptionsContainer");
const resetBalanceButton = document.getElementById("resetBalanceButton");

// Configurações do Jogo
let playerBalance = 10000;
let initialBet = 10;
let deck = [];
let playerHands = [];
let currentHandIndex = 0;
let dealerCards = [];
let dealerScore = 0;
let gameInProgress = false;
let currentTheme = "dark-theme";
let roundHistory = [];
const MAX_HISTORY_ROUNDS = 10;
let currentPlayerAvatar = "assets/avatars/default.jpg";
const availableAvatars = [
    "assets/avatars/default.jpg",
    "assets/avatars/avatar1.jpg",
    "assets/avatars/avatar2.jpg",
    "assets/avatars/avatar3.jpg"
];

const CARD_WIDTH = 70;
const CARD_HEIGHT = 100;
const PADDING = 10;
const BASE_HAND_SPACING = CARD_WIDTH + PADDING * 2;
let HAND_SPACING = CARD_WIDTH + PADDING * 5;

const DEALER_HAND_Y = PADDING * 3;
let PLAYER_HAND_Y = canvas.height - CARD_HEIGHT - PADDING * 3;

let DECK_POS_X;
let DECK_POS_Y;
const DECK_CARD_OFFSET = 2;

const LOCAL_STORAGE_KEY = "blackjackGameData";

const sounds = {
    deal: new Audio("assets/audio/deal.wav"),
    win: new Audio("assets/audio/win.wav"),
    lose: new Audio("assets/audio/lose.wav"),
    click: new Audio("assets/audio/click.wav"),
    shuffle: new Audio("assets/audio/shuffle.wav")
};

function playSound(soundName) {
    if (sounds[soundName]) {
        sounds[soundName].currentTime = 0;
        sounds[soundName].play().catch(error => console.error(`Erro ao tocar o som ${soundName}:`, error));
    }
}

function resetBalance() {
    playSound("click");
    playerBalance = 10000;
    updateBalanceDisplay();
    showMessage("Saldo redefinido para $10,000!");
    localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear saved data to prevent old balance from reloading
    saveData(); // Save new balance
}

function populateAvatarOptions() {
    avatarOptionsContainer.innerHTML = "";
    availableAvatars.forEach(avatarSrc => {
        const img = document.createElement("img");
        img.src = avatarSrc;
        img.alt = "Opção de Avatar";
        img.classList.add("avatar-option");
        if (avatarSrc === currentPlayerAvatar) {
            img.classList.add("selected");
        }
        img.addEventListener("click", () => selectAvatar(avatarSrc));
        avatarOptionsContainer.appendChild(img);
    });
}

function selectAvatar(avatarSrc) {
    currentPlayerAvatar = avatarSrc;
    playerAvatarDisplay.src = currentPlayerAvatar;
    document.querySelectorAll(".avatar-option").forEach(opt => opt.classList.remove("selected"));
    const selectedOption = Array.from(document.querySelectorAll(".avatar-option")).find(opt => opt.src.includes(avatarSrc));
    if (selectedOption) {
        selectedOption.classList.add("selected");
    }
    saveData();
    closeAvatarModal();
}

function openAvatarModal() {
    playSound("click");
    populateAvatarOptions();
    avatarSelectionModal.style.display = "block";
}

function closeAvatarModal() {
    avatarSelectionModal.style.display = "none";
}

function applyTheme(theme) {
    document.body.classList.remove("light-theme", "dark-theme");
    document.body.classList.add(theme);
    currentTheme = theme;
    themeToggleButton.textContent = theme === "dark-theme" ? "Tema Claro" : "Tema Escuro";
    renderGame();
}

function toggleTheme() {
    const newTheme = currentTheme === "dark-theme" ? "light-theme" : "dark-theme";
    applyTheme(newTheme);
    saveData();
}

function formatCardForHistory(card) {
    return `${card.rank}${getSuitSymbol(card.suit)}`;
}

function addRoundToHistory(playerHandsDetails, dealerHandDetails, resultText) {
    const roundEntry = {
        timestamp: new Date().toLocaleString("pt-BR"),
        playerHands: playerHandsDetails.map(hand => ({
            cards: hand.cards.map(formatCardForHistory).join(", "),
            score: hand.score,
            bet: hand.bet,
            status: hand.status
        })),
        dealerHand: {
            cards: dealerHandDetails.cards.map(formatCardForHistory).join(", "),
            score: dealerHandDetails.score
        },
        result: resultText
    };
    roundHistory.unshift(roundEntry);
    if (roundHistory.length > MAX_HISTORY_ROUNDS) {
        roundHistory.pop();
    }
    renderRoundHistory();
    saveData();
}

function renderRoundHistory() {
    roundHistoryList.innerHTML = "";
    if (roundHistory.length === 0) {
        const li = document.createElement("li");
        li.textContent = "Nenhuma rodada jogada ainda.";
        roundHistoryList.appendChild(li);
        return;
    }
    roundHistory.forEach(round => {
        const li = document.createElement("li");
        let playerHandsSummary = round.playerHands.map((hand, index) =>
            `Mão ${index + 1}: ${hand.cards} (Score: ${hand.score}, Aposta: $${hand.bet}, Status: ${hand.status || "N/A"})`
        ).join("<br>");

        li.innerHTML = `<strong>${round.timestamp}</strong><br>
                        Suas Mãos: ${playerHandsSummary}<br>
                        Dealer: ${round.dealerHand.cards} (Score: ${round.dealerHand.score})<br>
                        Resultado Geral: ${round.result}`;
        roundHistoryList.appendChild(li);
    });
}

function toggleHistoryArea() {
    playSound("click");
    if (roundHistoryArea.style.display === "none") {
        roundHistoryArea.style.display = "block";
        historyToggleButton.textContent = "Ocultar Histórico";
    } else {
        roundHistoryArea.style.display = "none";
        historyToggleButton.textContent = "Histórico";
    }
}

function saveData() {
    try {
        const dataToSave = {
            balance: playerBalance,
            theme: currentTheme,
            history: roundHistory,
            avatar: currentPlayerAvatar
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
        console.error("Erro ao salvar dados no localStorage:", error);
        showMessage("Não foi possível salvar seu progresso.");
    }
}

function loadData() {
    try {
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            if (parsedData.balance !== undefined && !isNaN(parsedData.balance)) {
                playerBalance = parseInt(parsedData.balance, 10);
            } else {
                playerBalance = 10000;
            }
            if (parsedData.theme && (parsedData.theme === "light-theme" || parsedData.theme === "dark-theme")) {
                applyTheme(parsedData.theme);
            } else {
                applyTheme("dark-theme");
            }
            if (parsedData.history && Array.isArray(parsedData.history)) {
                roundHistory = parsedData.history;
            } else {
                roundHistory = [];
            }
            if (parsedData.avatar && availableAvatars.includes(parsedData.avatar)) {
                currentPlayerAvatar = parsedData.avatar;
            } else {
                currentPlayerAvatar = "assets/avatars/default.png";
            }
            playerAvatarDisplay.src = currentPlayerAvatar;
        } else {
            playerBalance = 10000;
            applyTheme("dark-theme");
            roundHistory = [];
            currentPlayerAvatar = "assets/avatars/default.png";
            playerAvatarDisplay.src = currentPlayerAvatar;
            saveData();
        }
    } catch (error) {
        console.error("Erro ao carregar dados do localStorage:", error);
        playerBalance = 10000;
        applyTheme("dark-theme");
        roundHistory = [];
        currentPlayerAvatar = "assets/avatars/default.png";
        playerAvatarDisplay.src = currentPlayerAvatar;
        showMessage("Não foi possível carregar seu progresso anterior.");
    }
    updateBalanceDisplay();
    renderRoundHistory();
}

function setupCanvas() {
    canvas.width = 780;
    canvas.height = 500;
    DECK_POS_X = canvas.width - CARD_WIDTH - PADDING * 2;
    DECK_POS_Y = PADDING * 3;
    PLAYER_HAND_Y = canvas.height - CARD_HEIGHT - PADDING * 3;
}

function createDeck() {
    const suits = ["Copas", "Ouros", "Paus", "Espadas"];
    const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    deck = [];
    for (let suit of suits) {
        for (let rank of ranks) {
            deck.push({ suit, rank, value: getCardValue(rank), hidden: false, isAce: rank === "A" });
        }
    }
    shuffleDeck();
    playSound("shuffle");
}

function getCardValue(rank) {
    if (["J", "Q", "K"].includes(rank)) return 10;
    if (rank === "A") return 11;
    return parseInt(rank);
}

function shuffleDeck() {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function calculateHandScore(handCards) {
    let score = 0;
    let aceCount = 0;
    for (let card of handCards) {
        if (card.hidden) continue;
        score += card.value;
        if (card.isAce) aceCount++;
    }
    while (score > 21 && aceCount > 0) {
        score -= 10;
        aceCount--;
    }
    return score;
}

function drawStyledCard(card, x, y, width, height, isFaceDown = false) {
    const cornerRadius = 8;
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowBlur = 7;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    ctx.fillStyle = isFaceDown ? (currentTheme === "light-theme" ? "#7c5295" : "#4a0e6b") : (currentTheme === "light-theme" ? "#ffffff" : "#f0e8f7");
    ctx.beginPath();
    ctx.moveTo(x + cornerRadius, y);
    ctx.lineTo(x + width - cornerRadius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + cornerRadius);
    ctx.lineTo(x + width, y + height - cornerRadius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - cornerRadius, y + height);
    ctx.lineTo(x + cornerRadius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - cornerRadius);
    ctx.lineTo(x, y + cornerRadius);
    ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = currentTheme === "light-theme" ? "#c0b0d0" : "#8a6fab";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    if (!isFaceDown && !card.hidden) {
        let suitColor = card.suit === "Copas" || card.suit === "Ouros" ? "#D90000" : "#000000";
        ctx.fillStyle = suitColor;

        ctx.font = "bold 18px Poppins";
        const rankText = card.rank;
        const suitSymbol = getSuitSymbol(card.suit);
        
        ctx.textAlign = "left";
        ctx.fillText(rankText, x + PADDING / 2, y + PADDING + 10);
        ctx.fillText(suitSymbol, x + PADDING / 2, y + PADDING + 30);
        
        ctx.textAlign = "right";
        ctx.fillText(rankText, x + width - PADDING / 2, y + height - PADDING - 10 );
        ctx.fillText(suitSymbol, x + width - PADDING / 2, y + height - PADDING - 30);

        ctx.font = "bold 30px Poppins";
        ctx.textAlign = "center";
        ctx.fillText(suitSymbol, x + width / 2, y + height / 2 + 10);
    }
}

function drawDeck() {
    const numCardsToVisualize = Math.min(deck.length, 5);
    for (let i = 0; i < numCardsToVisualize; i++) {
        drawStyledCard({}, DECK_POS_X + i * DECK_CARD_OFFSET, DECK_POS_Y + i * DECK_CARD_OFFSET, CARD_WIDTH, CARD_HEIGHT, true);
    }
    if (deck.length > 0) {
        drawStyledCard({}, DECK_POS_X + (numCardsToVisualize > 0 ? (numCardsToVisualize - 1) * DECK_CARD_OFFSET : 0), DECK_POS_Y + (numCardsToVisualize > 0 ? (numCardsToVisualize - 1) * DECK_CARD_OFFSET : 0), CARD_WIDTH, CARD_HEIGHT, true);
    }

    const canvasTextColor = getComputedStyle(document.body).getPropertyValue("--text-color").trim();
    ctx.fillStyle = canvasTextColor;
    ctx.font = "bold 14px Poppins";
    ctx.textAlign = "center";
    ctx.fillText(`Baralho (${deck.length})`, DECK_POS_X + CARD_WIDTH / 2, DECK_POS_Y + CARD_HEIGHT + PADDING * 2);
}

function getSuitSymbol(suit) {
    switch (suit) {
        case "Copas": return "♥";
        case "Ouros": return "♦";
        case "Paus": return "♣";
        case "Espadas": return "♠";
        default: return "";
    }
}

function calculateDynamicHandSpacing() {
    const numHands = playerHands.length;
    if (numHands <= 1) {
        HAND_SPACING = CARD_WIDTH + PADDING * 5;
        return;
    }
    const totalAvailableWidth = canvas.width - (PADDING * 2);
    let calculatedSpacing = totalAvailableWidth / numHands;
    const minHandWidth = (CARD_WIDTH * 1.5) + (PADDING * 2);
    HAND_SPACING = Math.max(calculatedSpacing, minHandWidth);
}

function renderGame() {
    console.log("renderGame called");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const canvasTextColor = getComputedStyle(document.body).getPropertyValue("--text-color").trim();
    const canvasAccentColor = getComputedStyle(document.body).getPropertyValue("--primary-accent-color").trim();
    const canvasSecondaryAccentColor = getComputedStyle(document.body).getPropertyValue("--secondary-accent-color").trim();
    const canvasGradientStart = getComputedStyle(document.body).getPropertyValue("--canvas-gradient-start").trim();
    const canvasGradientEnd = getComputedStyle(document.body).getPropertyValue("--canvas-gradient-end").trim();

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, canvasGradientStart);
    gradient.addColorStop(1, canvasGradientEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tablePadding = PADDING * 1.5;
    const tableCornerRadius = 15;
    ctx.fillStyle = currentTheme === "light-theme" ? "rgba(0, 100, 0, 0.8)" : "rgba(0, 80, 0, 0.8)";
    ctx.strokeStyle = canvasAccentColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tablePadding + tableCornerRadius, tablePadding);
    ctx.lineTo(canvas.width - tablePadding - tableCornerRadius, tablePadding);
    ctx.quadraticCurveTo(canvas.width - tablePadding, tablePadding, canvas.width - tablePadding, tablePadding + tableCornerRadius);
    ctx.lineTo(canvas.width - tablePadding, canvas.height - tablePadding - tableCornerRadius);
    ctx.quadraticCurveTo(canvas.width - tablePadding, canvas.height - tablePadding, canvas.width - tablePadding - tableCornerRadius, canvas.height - tablePadding);
    ctx.lineTo(tablePadding + tableCornerRadius, canvas.height - tablePadding);
    ctx.quadraticCurveTo(tablePadding, canvas.height - tablePadding, tablePadding, canvas.height - tablePadding - tableCornerRadius);
    ctx.lineTo(tablePadding, tablePadding + tableCornerRadius);
    ctx.quadraticCurveTo(tablePadding, tablePadding, tablePadding + tableCornerRadius, tablePadding);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    calculateDynamicHandSpacing();
    drawDeck();

    const dealerAreaX = canvas.width / 2;
    const dealerNameY = DEALER_HAND_Y - PADDING * 3;
    ctx.fillStyle = canvasTextColor;
    ctx.font = "bold 24px Poppins";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 5;
    ctx.fillText("Dealer", dealerAreaX, dealerNameY);
    ctx.shadowBlur = 0;

    const dealerHandWidth = dealerCards.length * (CARD_WIDTH + PADDING) - PADDING;
    const dealerCardsStartX = dealerAreaX - dealerHandWidth / 2;
    for (let i = 0; i < dealerCards.length; i++) {
        const card = dealerCards[i];
        card.x = dealerCardsStartX + i * (CARD_WIDTH + PADDING);
        card.y = DEALER_HAND_Y;
        if (card.x !== undefined && card.y !== undefined) {
            drawStyledCard(card, card.x, card.y, CARD_WIDTH, CARD_HEIGHT, card.hidden);
        }
    }

    const dealerScoreTextY = DEALER_HAND_Y + CARD_HEIGHT + PADDING * 3;
    const scoreText = gameInProgress && playerHands.length > 0 && playerHands.some(h => h.status === "active") && dealerCards.some(c => c.hidden) ? "Score: ?" : `Score: ${calculateHandScore(dealerCards)}`;
    ctx.font = "bold 20px Poppins";
    ctx.textAlign = "center";
    const textMetrics = ctx.measureText(scoreText);
    const textWidth = textMetrics.width;
    const textHeight = 20;
    const bgPadding = 8;
    
    ctx.fillStyle = currentTheme === "light-theme" ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)";
    ctx.beginPath();
    ctx.moveTo(dealerAreaX - textWidth / 2 - bgPadding + 5, dealerScoreTextY - textHeight);
    ctx.lineTo(dealerAreaX + textWidth / 2 + bgPadding - 5, dealerScoreTextY - textHeight);
    ctx.quadraticCurveTo(dealerAreaX + textWidth / 2 + bgPadding, dealerScoreTextY - textHeight, dealerAreaX + textWidth / 2 + bgPadding, dealerScoreTextY - textHeight + 5);
    ctx.lineTo(dealerAreaX + textWidth / 2 + bgPadding, dealerScoreTextY + textHeight / 2);
    ctx.quadraticCurveTo(dealerAreaX + textWidth / 2 + bgPadding, dealerScoreTextY + textHeight, dealerAreaX + textWidth / 2 + bgPadding - 5, dealerScoreTextY + textHeight);
    ctx.lineTo(dealerAreaX - textWidth / 2 - bgPadding + 5, dealerScoreTextY + textHeight);
    ctx.quadraticCurveTo(dealerAreaX - textWidth / 2 - bgPadding, dealerScoreTextY + textHeight, dealerAreaX - textWidth / 2 - bgPadding, dealerScoreTextY + textHeight - 5);
    ctx.lineTo(dealerAreaX - textWidth / 2 - bgPadding, dealerScoreTextY - textHeight + 5);
    ctx.quadraticCurveTo(dealerAreaX - textWidth / 2 - bgPadding, dealerScoreTextY - textHeight, dealerAreaX - textWidth / 2 - bgPadding + 5, dealerScoreTextY - textHeight);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = canvasAccentColor;
    ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
    ctx.shadowBlur = 3;
    ctx.fillText(scoreText, dealerAreaX, dealerScoreTextY);
    ctx.shadowBlur = 0;

    playerHands.forEach((hand, index) => {
        const handStartX = PADDING * 2 + index * HAND_SPACING;
        ctx.fillStyle = canvasAccentColor;
        ctx.font = "bold 16px Poppins";
        ctx.textAlign = "left";
        ctx.fillText(`Mão ${index + 1} (Aposta: $${hand.bet})`, handStartX, PLAYER_HAND_Y - PADDING);
        if (index === currentHandIndex && hand.status === "active") {
            ctx.strokeStyle = canvasSecondaryAccentColor;
            ctx.lineWidth = 3;
            const currentHandWidth = hand.cards.length * (CARD_WIDTH + PADDING) - PADDING;
            ctx.strokeRect(handStartX - PADDING / 3, PLAYER_HAND_Y - PADDING * 3, currentHandWidth + PADDING, CARD_HEIGHT + PADDING * 4);
        }

        for (let i = 0; i < hand.cards.length; i++) {
            const card = hand.cards[i];
            if (card.x !== undefined && card.y !== undefined) {
                drawStyledCard(card, card.x, card.y, CARD_WIDTH, CARD_HEIGHT, card.hidden);
            }
        }
        ctx.fillStyle = canvasTextColor;
        ctx.font = "bold 18px Poppins";
        ctx.textAlign = "left";
        ctx.fillText(`Score: ${hand.score}`, handStartX, PLAYER_HAND_Y + CARD_HEIGHT * 1 + PADDING * 2);
    });
}

async function animatedDeal(handObj, isHiddenInitially = false, cardToDeal = null) {
    if (!cardToDeal && deck.length === 0) {
        showMessage("Fim do baralho! Embaralhando um novo...");
        createDeck();
        await new Promise(r => setTimeout(r, 500));
        if (deck.length === 0) {
            showMessage("Erro crítico: Não foi possível criar novo baralho.");
            return null;
        }
    }
    playSound("deal");
    const card = cardToDeal || deck.pop();
    card.hidden = isHiddenInitially;
    const numDeckVisualCards = Math.min(deck.length + 1, 5);
    card.x = card.x === undefined ? (DECK_POS_X + (numDeckVisualCards > 0 ? (numDeckVisualCards - 1) * DECK_CARD_OFFSET : 0)) : card.x;
    card.y = card.y === undefined ? (DECK_POS_Y + (numDeckVisualCards > 0 ? (numDeckVisualCards - 1) * DECK_CARD_OFFSET : 0)) : card.y;
    card.rotation = card.rotation === undefined ? 0 : card.rotation;

    let targetHandCards = Array.isArray(handObj) ? handObj : handObj.cards;
    if (!cardToDeal) {
        targetHandCards.push(card);
    }

    let targetX, targetY;
    const cardIndexInDisplay = targetHandCards.indexOf(card);

    if (Array.isArray(handObj)) {
        const dealerHandWidth = targetHandCards.length * (CARD_WIDTH + PADDING) - PADDING;
        const dealerCardsStartX = (canvas.width / 2) - dealerHandWidth / 2;
        targetX = dealerCardsStartX + cardIndexInDisplay * (CARD_WIDTH + PADDING);
        targetY = DEALER_HAND_Y;
    } else {
        const handDisplayIndex = playerHands.indexOf(handObj);
        targetX = PADDING * 2 + handDisplayIndex * HAND_SPACING + cardIndexInDisplay * (CARD_WIDTH + PADDING);
        targetY = PLAYER_HAND_Y;
    }

    return new Promise(resolve => {
        gsap.to(card, {
            x: targetX,
            y: targetY,
            rotation: (Math.random() - 0.5) * 10,
            duration: 0.5,
            ease: "power2.out",
            onUpdate: renderGame,
            onComplete: () => {
                card.rotation = 0;
                if (!Array.isArray(handObj)) {
                    handObj.score = calculateHandScore(handObj.cards);
                }
                renderGame();
                resolve(card);
            }
        });
    });
}

async function animatedFlipCard(cardToFlip) {
    return new Promise(resolve => {
        let originalX = cardToFlip.x;
        gsap.to(cardToFlip, {
            width: 0,
            x: originalX + CARD_WIDTH / 2,
            duration: 0.2,
            ease: "power1.in",
            onUpdate: renderGame,
            onComplete: () => {
                cardToFlip.hidden = false;
                playSound("deal");
                gsap.to(cardToFlip, {
                    width: CARD_WIDTH,
                    x: originalX,
                    duration: 0.2,
                    ease: "power1.out",
                    onUpdate: renderGame,
                    onComplete: () => {
                        dealerScore = calculateHandScore(dealerCards);
                        renderGame();
                        resolve();
                    }
                });
            }
        });
    });
}

async function startGame() {
    playSound("click");
    initialBet = parseInt(betAmountInput.value);
    if (isNaN(initialBet) || initialBet <= 0 || initialBet > playerBalance) {
        showMessage("Aposta inválida!");
        return;
    }

    playerBalance -= initialBet;
    updateBalanceDisplay();

    gameInProgress = true;
    currentHandIndex = 0;
    playerHands = [{
        cards: [],
        bet: initialBet,
        score: 0,
        status: "active",
        canDouble: true,
        isSplitAceHand: false
    }];
    dealerCards = [];
    createDeck();

    showMessage("Embaralhando e distribuindo...");
    await new Promise(r => setTimeout(r, 300));

    await animatedDeal(playerHands[0]);
    await animatedDeal(dealerCards, true);
    await animatedDeal(playerHands[0]);
    await animatedDeal(dealerCards);

    playerHands[0].score = calculateHandScore(playerHands[0].cards);
    renderGame();
    updateButtonStates();

    if (playerHands[0].score === 21 && playerHands[0].cards.length === 2 && !playerHands[0].isSplitAceHand) {
        playerHands[0].status = "blackjack";
        await checkBlackjack();
    } else {
        showMessage("Sua vez. Hit, Stand, Double ou Split?");
    }
}

async function playerHit() {
    const currentHand = playerHands[currentHandIndex];
    if (!gameInProgress || currentHand.status !== "active" || currentHand.isSplitAceHand) return;
    playSound("click");
    currentHand.canDouble = false;

    await animatedDeal(currentHand);
    currentHand.score = calculateHandScore(currentHand.cards);

    if (currentHand.score > 21) {
        currentHand.status = "busted";
        showMessage(`Mão ${currentHandIndex + 1} estourou com ${currentHand.score}!`);
        playSound("lose");
        await nextHandOrDealerTurn();
    } else if (currentHand.score === 21) {
        showMessage(`Mão ${currentHandIndex + 1} tem 21!`);
        currentHand.status = "stood";
        await nextHandOrDealerTurn();
    }
    updateButtonStates();
}

async function playerDoubleDown() {
    const currentHand = playerHands[currentHandIndex];
    if (!gameInProgress || currentHand.status !== "active" || !currentHand.canDouble || currentHand.isSplitAceHand) return;
    if (playerBalance < currentHand.bet) {
        showMessage("Saldo insuficiente para Double Down!");
        return;
    }
    playSound("click");

    playerBalance -= currentHand.bet;
    currentHand.bet *= 2;
    updateBalanceDisplay();
    showMessage(`Mão ${currentHandIndex + 1}: Aposta dobrada! Recebendo uma carta...`);

    currentHand.canDouble = false;
    await animatedDeal(currentHand);
    currentHand.score = calculateHandScore(currentHand.cards);

    if (currentHand.score > 21) {
        currentHand.status = "busted";
        showMessage(`Mão ${currentHandIndex + 1} estourou com ${currentHand.score}!`);
        playSound("lose");
    } else {
        currentHand.status = "stood";
        showMessage(`Mão ${currentHandIndex + 1} tem ${currentHand.score}.`);
    }
    await nextHandOrDealerTurn();
    updateButtonStates();
}

async function playerStand() {
    const currentHand = playerHands[currentHandIndex];
    if (!gameInProgress || currentHand.status !== "active") return;
    playSound("click");
    currentHand.status = "stood";
    currentHand.canDouble = false;
    showMessage(`Mão ${currentHandIndex + 1} parou com ${currentHand.score}.`);
    await nextHandOrDealerTurn();
    updateButtonStates();
}

async function playerSplit() {
    const currentHand = playerHands[currentHandIndex];
    if (!gameInProgress || currentHand.status !== "active" || currentHand.cards.length !== 2 || currentHand.cards[0].value !== currentHand.cards[1].value) {
        showMessage("Não é possível dividir esta mão.");
        return;
    }
    if (playerBalance < currentHand.bet) {
        showMessage("Saldo insuficiente para dividir.");
        return;
    }
    playSound("click");

    playerBalance -= currentHand.bet;
    updateBalanceDisplay();

    const isSplittingAces = currentHand.cards[0].isAce;
    const cardToMove = currentHand.cards.pop();
    currentHand.score = calculateHandScore(currentHand.cards);
    currentHand.canDouble = !isSplittingAces;
    currentHand.isSplitAceHand = isSplittingAces;

    const newHand = {
        cards: [cardToMove],
        bet: currentHand.bet,
        score: 0,
        status: "active",
        canDouble: !isSplittingAces,
        isSplitAceHand: isSplittingAces
    };
    playerHands.splice(currentHandIndex + 1, 0, newHand);
    calculateDynamicHandSpacing();
    renderGame();

    showMessage("Mãos divididas! Jogando a primeira mão.");

    const originalCardX = PADDING * 2 + currentHandIndex * HAND_SPACING + 1 * (CARD_WIDTH + PADDING);
    const originalCardY = PLAYER_HAND_Y;
    cardToMove.x = originalCardX;
    cardToMove.y = originalCardY;
    
    await animatedDeal(newHand, false, cardToMove);
    await animatedDeal(currentHand);
    currentHand.score = calculateHandScore(currentHand.cards);
    if (currentHand.score === 21 && currentHand.cards.length === 2) {
        showMessage(`Mão ${currentHandIndex + 1} tem 21!`);
        if (isSplittingAces) {
            currentHand.status = "stood";
        }
    }

    await animatedDeal(newHand);
    newHand.score = calculateHandScore(newHand.cards);
    if (newHand.score === 21 && newHand.cards.length === 2) {
        showMessage(`Mão ${playerHands.indexOf(newHand) + 1} tem 21!`);
        if (isSplittingAces) {
            newHand.status = "stood";
        }
    }

    renderGame();
    updateButtonStates();

    if (currentHand.isSplitAceHand && currentHand.cards.length === 2) {
        currentHand.status = "stood";
        showMessage(`Mão ${currentHandIndex + 1} (Ás dividido) tem ${currentHand.score}. Próxima mão.`);
    }

    if (currentHand.isSplitAceHand && currentHand.status === "stood" &&
        playerHands[currentHandIndex + 1] && playerHands[currentHandIndex + 1].isSplitAceHand && playerHands[currentHandIndex + 1].status === "stood") {
        await nextHandOrDealerTurn();
    } else if (currentHand.isSplitAceHand && currentHand.status === "stood") {
        await nextHandOrDealerTurn();
    }
}

async function nextHandOrDealerTurn() {
    const currentPlayersHand = playerHands[currentHandIndex];
    if (currentPlayersHand && currentPlayersHand.isSplitAceHand && currentPlayersHand.cards.length === 2 && currentPlayersHand.status === "active") {
        currentPlayersHand.status = "stood";
        showMessage(`Mão ${currentHandIndex + 1} (Ás dividido) tem ${currentPlayersHand.score}.`);
    }

    currentHandIndex++;
    if (currentHandIndex < playerHands.length) {
        const nextHand = playerHands[currentHandIndex];
        if (nextHand.status === "active") {
            showMessage(`Vez da Mão ${currentHandIndex + 1}.`);
            if (nextHand.isSplitAceHand && nextHand.cards.length === 2) {
                nextHand.status = "stood";
                showMessage(`Mão ${currentHandIndex + 1} (Ás dividido) tem ${nextHand.score}.`);
                await nextHandOrDealerTurn();
            } else {
                updateButtonStates();
                renderGame();
            }
            return;
        } else {
            await nextHandOrDealerTurn();
            return;
        }
    }

    const anyPlayerHandNotBustedOrBlackjack = playerHands.some(h => h.status === "stood" || (h.status === "active" && h.score <= 21));
    if (!anyPlayerHandNotBustedOrBlackjack && !playerHands.some(h => h.status === "blackjack_win")) {
        showMessage("Todas as mãos do jogador estouraram. Fim da rodada.");
        endRound("Todas as mãos do jogador estouraram.");
        return;
    }

    const hiddenCard = dealerCards.find(card => card.hidden);
    if (hiddenCard) {
        showMessage("Dealer revelando carta...");
        await animatedFlipCard(hiddenCard);
    }
    dealerScore = calculateHandScore(dealerCards);
    renderGame();

    if (dealerScore === 21 && dealerCards.length === 2) {
        showMessage("Dealer tem Blackjack!");
        endRound("Dealer tem Blackjack!");
        return;
    }

    showMessage("Dealer está jogando...");
    await new Promise(r => setTimeout(r, 500));
    await dealerTurn();
}

async function dealerTurn() {
    while (calculateHandScore(dealerCards) < 17) {
        showMessage("Dealer compra uma carta.");
        await new Promise(r => setTimeout(r, 700));
        await animatedDeal(dealerCards);
        dealerScore = calculateHandScore(dealerCards);
        if (dealerScore >= 17 && dealerScore <= 21) {
            showMessage("Dealer para com " + dealerScore + ".");
            await new Promise(r => setTimeout(r, 500));
            break;
        }
    }
    dealerScore = calculateHandScore(dealerCards);
    let dealerResultText = `Dealer para com ${dealerScore}.`;
    if (dealerScore > 21) {
        dealerResultText = "Dealer estourou!";
        showMessage(dealerResultText);
    }
    endRound(dealerResultText);
}

async function checkBlackjack() {
    const playerHand = playerHands[0];
    if (playerHand.status === "blackjack" && playerHand.score === 21 && playerHand.cards.length === 2 && !playerHand.isSplitAceHand) {
        dealerScore = calculateHandScore(dealerCards);

        const hiddenDealerCard = dealerCards.find(card => card.hidden);
        if (hiddenDealerCard) {
            await animatedFlipCard(hiddenDealerCard);
        }
        let roundResultText;
        if (dealerScore === 21 && dealerCards.length === 2) {
            roundResultText = "Ambos têm Blackjack! Empate (Push)!";
            showMessage(roundResultText);
            playerHand.status = "push";
        } else {
            roundResultText = "Blackjack! Você venceu! (Pagamento 3:2)";
            showMessage(roundResultText);
            playSound("win");
            playerHand.status = "blackjack_win";
        }
        endRound(roundResultText);
    }
}

function endRound(overallRoundResult = "Rodada finalizada.") {
    gameInProgress = false;
    let finalMessage = "Fim da rodada. Resultados:\n";

    const hiddenDealerCard = dealerCards.find(card => card.hidden);
    if (hiddenDealerCard) {
        hiddenDealerCard.hidden = false;
        dealerScore = calculateHandScore(dealerCards);
        renderGame();
    }

    const playerHandsDetailsForHistory = [];
    let playerOverallWin = false;
    let playerOverallPush = true;

    playerHands.forEach((hand, index) => {
        let handResultText = `Mão ${index + 1} (${hand.score}): `;
        let handStatusForHistory = hand.status;

        if (hand.status === "blackjack_win") {
            handResultText += "Blackjack! (Pagamento 3:2)";
            playerBalance += hand.bet + (hand.bet * 1.5);
            playSound("win");
            playerOverallWin = true;
            playerOverallPush = false;
        } else if (hand.status === "busted") {
            handResultText += "Estourou! Perdeu.";
            playerOverallPush = false;
        } else if (hand.status === "push" || (hand.status === "stood" && hand.score === dealerScore && dealerScore <= 21)) {
            handResultText += "Empate (Push)!";
            playerBalance += hand.bet;
        } else if (dealerScore > 21 && hand.status === "stood") {
            handResultText += "Dealer estourou! Você venceu!";
            playerBalance += hand.bet * 2;
            playSound("win");
            playerOverallWin = true;
            playerOverallPush = false;
            handStatusForHistory = "win_dealer_busted";
        } else if (hand.status === "stood" && hand.score > dealerScore) {
            handResultText += "Você venceu!";
            playerBalance += hand.bet * 2;
            playSound("win");
            playerOverallWin = true;
            playerOverallPush = false;
            handStatusForHistory = "win";
        } else if (hand.status === "stood" && hand.score < dealerScore && dealerScore <= 21) {
            handResultText += "Dealer venceu!";
            playerOverallPush = false;
            handStatusForHistory = "loss";
        } else if (hand.status === "stood" && hand.score === 21 && hand.isSplitAceHand && dealerScore !== 21) {
            handResultText += "Você venceu (21 em Ás dividido)!";
            playerBalance += hand.bet * 2;
            playSound("win");
            playerOverallWin = true;
            playerOverallPush = false;
            handStatusForHistory = "win_split_ace_21";
        } else if (hand.status === "stood") {
            if (dealerScore === 21 && dealerCards.length === 2 && !hand.isSplitAceHand) {
                handResultText += "Dealer tem Blackjack! Você perdeu.";
                playerOverallPush = false;
                handStatusForHistory = "loss_dealer_blackjack";
            } else if (dealerScore === 21 && dealerCards.length === 2 && hand.isSplitAceHand) {
                handResultText += "Dealer tem Blackjack! Você perdeu (mão de Ás dividido).";
                playerOverallPush = false;
                handStatusForHistory = "loss_dealer_blackjack_vs_split_ace";
            } else {
                handResultText += `Resultado: ${hand.status}`;
            }
        } else {
            handResultText += `Status não finalizado (${hand.status}).`;
        }
        finalMessage += handResultText + "\n";
        playerHandsDetailsForHistory.push({ ...hand, status: handStatusForHistory, cards: [...hand.cards], score: hand.score, bet: hand.bet });
    });

    let historyResultText = overallRoundResult;
    if (playerHands.length > 1) {
        if (playerOverallWin) historyResultText = "Jogador venceu em pelo menos uma mão.";
        else if (playerOverallPush && !playerHands.some(h => h.status === "busted" || h.status === "loss" || h.status === "loss_dealer_blackjack")) historyResultText = "Empate em todas as mãos ativas.";
        else historyResultText = "Jogador perdeu ou empatou nas mãos.";
    }

    addRoundToHistory(playerHandsDetailsForHistory, { cards: [...dealerCards], score: dealerScore }, historyResultText);

    updateBalanceDisplay();
    updateButtonStates();
    showMessage(finalMessage.trim() + "\nClique \"Nova Rodada\" para jogar novamente.");
}

function updateBalanceDisplay() {
    balanceDisplay.textContent = `$${playerBalance}`;
    betAmountInput.max = playerBalance;
    saveData();
}

function showMessage(msg) {
    gsap.fromTo(messageArea,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.3, onStart: () => { messageArea.textContent = msg; } }
    );
}

function updateButtonStates() {
    if (!gameInProgress || playerHands.length === 0 || currentHandIndex >= playerHands.length) {
        hitButton.disabled = true;
        standButton.disabled = true;
        doubleButton.disabled = true;
        splitButton.disabled = true;
        newRoundButton.disabled = gameInProgress;
        return;
    }

    const currentHand = playerHands[currentHandIndex];
    const handScore = currentHand.score;

    hitButton.disabled = currentHand.status !== "active" || handScore >= 21 || currentHand.isSplitAceHand;
    standButton.disabled = currentHand.status !== "active";
    doubleButton.disabled = currentHand.status !== "active" || !currentHand.canDouble || currentHand.cards.length !== 2 || playerBalance < currentHand.bet || handScore >= 21 || currentHand.isSplitAceHand;

    const canSplit = currentHand.status === "active" &&
        currentHand.cards.length === 2 &&
        currentHand.cards[0].value === currentHand.cards[1].value &&
        playerBalance >= currentHand.bet &&
        !currentHand.isSplitAceHand;
    splitButton.disabled = !canSplit;

    newRoundButton.disabled = gameInProgress;
}

["hitButton", "standButton", "newRoundButton", "exitButton", "doubleButton", "splitButton", "resetBalanceButton"].forEach(id => {
    const button = document.getElementById(id);
    if (button) {
        button.addEventListener("click", () => {
            if (!button.disabled) {
                if (id !== "doubleButton" && id !== "splitButton" && id !== "newRoundButton") {
                    playSound("click");
                }
            }
        });
    }
});

doubleButton.addEventListener("click", playerDoubleDown);
splitButton.addEventListener("click", playerSplit);
hitButton.addEventListener("click", playerHit);
standButton.addEventListener("click", playerStand);
newRoundButton.addEventListener("click", startGame);
exitButton.addEventListener("click", () => {
    playSound("click");
    showMessage("Obrigado por jogar! Volte sempre.");
    gameInProgress = false;
    playerHands = [];
    dealerCards = [];
    updateButtonStates();
    newRoundButton.disabled = false;
});
resetBalanceButton.addEventListener("click", resetBalance);

if (themeToggleButton) {
    themeToggleButton.addEventListener("click", toggleTheme);
}
if (historyToggleButton) {
    historyToggleButton.addEventListener("click", toggleHistoryArea);
}
if (changeAvatarButton) {
    changeAvatarButton.addEventListener("click", openAvatarModal);
}
if (closeAvatarModalButton) {
    closeAvatarModalButton.addEventListener("click", closeAvatarModal);
}
window.addEventListener("click", (event) => {
    if (event.target == avatarSelectionModal) {
        closeAvatarModal();
    }
});

window.onload = () => {
    console.log("window.onload executed");
    setupCanvas();
    loadData();
    renderGame();
    showMessage("Bem-vindo ao Blackjack! Faça sua aposta e clique em Nova Rodada.");
    updateButtonStates();
    newRoundButton.disabled = false;
    hitButton.disabled = true;
    standButton.disabled = true;
    doubleButton.disabled = true;
    splitButton.disabled = true;
    roundHistoryArea.style.display = "none";
    avatarSelectionModal.style.display = "none";
};