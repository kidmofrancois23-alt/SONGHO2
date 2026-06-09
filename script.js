const GAME_ROOM_ID = "songho_room_francois_2026"; 
const API_URL = `https://api.moat.so/v1/store/${GAME_ROOM_ID}`;

let MY_PLAYER_ID = 2; 
let board = Array(14).fill(5); 
let currentPlayer = 2;
let scores = { "1": 0, "2": 0 };
let currentTour = 1;
let isGameOver = false;
let logs = ["Initialisation de la table en ligne."];

const holesElements = document.querySelectorAll('.hole');
const turnIndicator = document.getElementById('turn-indicator');
const roleSelector = document.getElementById('role-selector');
const resetBtn = document.getElementById('reset-btn');
const statusBadge = document.getElementById('game-status');
const tourCountSpan = document.getElementById('tour-count');
const logsContainer = document.getElementById('game-logs');

roleSelector.addEventListener('change', () => {
    MY_PLAYER_ID = parseInt(roleSelector.value);
    updateDisplay();
});

resetBtn.addEventListener('click', resetOnlineGame);

function updateDisplay() {
    holesElements.forEach(hole => {
        const index = parseInt(hole.getAttribute('data-index'));
        hole.innerText = board[index];
    });
    document.getElementById('score-j1').innerText = scores["1"];
    document.getElementById('score-j2').innerText = scores["2"];
    tourCountSpan.innerText = currentTour;

    // Affichage des Traces (Logs)
    logsContainer.innerHTML = logs.map(log => {
        let cl = "system";
        if(log.includes("Joueur 1")) cl = "j1";
        if(log.includes("Joueur 2")) cl = "j2";
        return `<div class="log-entry ${cl}">${log}</div>`;
    }).join('');
    logsContainer.scrollTop = logsContainer.scrollHeight; // Scroll automatique en bas

    if (isGameOver) {
        statusBadge.innerText = "Terminé";
        statusBadge.className = "badge over-badge";
        turnIndicator.innerText = "La partie est finie !";
        turnIndicator.style.color = "red";
        return;
    }

    statusBadge.innerText = "En cours";
    statusBadge.className = "badge progress-badge";

    if (currentPlayer === MY_PLAYER_ID) {
        turnIndicator.innerText = "À VOTRE TOUR !";
        turnIndicator.style.color = "green";
    } else {
        turnIndicator.innerText = `Attente du Joueur ${currentPlayer}...`;
        turnIndicator.style.color = "#5c3a21";
    }
}

// AJAX GET : Lecture des informations sur Internet
async function fetchGameState() {
    try {
        const response = await fetch(API_URL);
        if (response.ok) {
            const data = await response.json();
            if (data && data.board) {
                board = data.board;
                currentPlayer = data.currentPlayer;
                scores = data.scores;
                currentTour = data.currentTour || 1;
                isGameOver = data.isGameOver || false;
                logs = data.logs || [];
                updateDisplay();
            }
        } else if (response.status === 404) {
            resetOnlineGame();
        }
    } catch (error) {
        console.error("Erreur AJAX GET:", error);
    }
}

// AJAX PUT : Sauvegarde des informations sur Internet
async function saveGameStateToServer() {
    try {
        await fetch(API_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                board: board,
                currentPlayer: currentPlayer,
                scores: scores,
                currentTour: currentTour,
                isGameOver: isGameOver,
                logs: logs
            })
        });
    } catch (error) {
        console.error("Erreur AJAX PUT:", error);
    }
}

holesElements.forEach(hole => {
    hole.addEventListener('click', (e) => {
        const selectedIndex = parseInt(e.target.getAttribute('data-index'));
        
        if (isGameOver) return;
        if (currentPlayer !== MY_PLAYER_ID) return;
        if ((MY_PLAYER_ID === 1 && (selectedIndex < 0 || selectedIndex > 6)) ||
            (MY_PLAYER_ID === 2 && (selectedIndex < 7 || selectedIndex > 13))) {
            alert("Cliquez dans votre camp !");
            return;
        }
        if (board[selectedIndex] === 0) {
            alert("Trou vide !");
            return;
        }

        executeLocalMove(selectedIndex);
    });
});

function executeLocalMove(startIndex) {
    let seeds = board[startIndex];
    board[startIndex] = 0;
    let currentIndex = startIndex;

    // Distribution
    while (seeds > 0) {
        currentIndex = (currentIndex + 1) % 14;
        if (currentIndex === startIndex) continue; 
        board[currentIndex]++;
        seeds--;
    }

    // Captures
    let captured = 0;
    const isJ1Hole = (currentIndex >= 0 && currentIndex <= 6);
    const isOwnHole = (MY_PLAYER_ID === 1 && isJ1Hole) || (MY_PLAYER_ID === 2 && !isJ1Hole);

    if (!isOwnHole) {
        let checkIndex = currentIndex;
        while (((MY_PLAYER_ID === 1 && (checkIndex >= 7 && checkIndex <= 13)) || (MY_PLAYER_ID === 2 && (checkIndex >= 0 && checkIndex <= 6))) && 
               (board[checkIndex] === 2 || board[checkIndex] === 3 || board[checkIndex] === 4)) {
            captured += board[checkIndex];
            scores[MY_PLAYER_ID] += board[checkIndex];
            board[checkIndex] = 0;
            checkIndex = (checkIndex - 1 + 14) % 14; 
        }
    }

    // Enregistrement de la trace du coup
    let logMessage = `Tour ${currentTour} : Joueur ${MY_PLAYER_ID} a joué la case ${startIndex}.`;
    if(captured > 0) {
        logMessage += ` Récolte de ${captured} pions !`;
    }
    logs.push(logMessage);

    // VÉRIFICATION DE LA RÈGLE DE DÉFAITE ABSOLUE (Trous adverses = 0)
    let nextPlayer = currentPlayer === 1 ? 2 : 1;
    const j1Total = board.slice(0, 7).reduce((a, b) => a + b, 0);
    const j2Total = board.slice(7, 14).reduce((a, b) => a + b, 0);

    if (nextPlayer === 1 && j1Total === 0) {
        isGameOver = true;
        logs.push("FIN DE PARTIE : Le Joueur 1 n'a plus aucun pion dans son camp ! Le Joueur 2 GAGNE.");
    } else if (nextPlayer === 2 && j2Total === 0) {
        isGameOver = true;
        logs.push("FIN DE PARTIE : Le Joueur 2 n'a plus aucun pion dans son camp ! Le Joueur 1 GAGNE.");
    }

    // Avancement du compteur de tours globaux après le coup du Joueur 1
    if (MY_PLAYER_ID === 1) {
        currentTour++;
    }

    currentPlayer = nextPlayer;
    updateDisplay();
    saveGameStateToServer();
}

async function resetOnlineGame() {
    board = Array(14).fill(5);
    currentPlayer = 2;
    scores = { "1": 0, "2": 0 };
    currentTour = 1;
    isGameOver = false;
    logs = ["Nouvelle partie réinitialisée. Tour 1."];
    updateDisplay();
    await saveGameStateToServer();
}

// Polling asynchrone toutes les 1.2s
setInterval(fetchGameState, 1200);

MY_PLAYER_ID = parseInt(roleSelector.value);
fetchGameState();
