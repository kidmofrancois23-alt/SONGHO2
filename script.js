// --- CONFIGURATION DE L'API AJAX DISTANTE ---
// ID unique de la partie. Tu peux changer cette chaîne pour créer une autre table de jeu.
const GAME_ROOM_ID = "songho_room_francois_2026"; 
const API_URL = `https://api.moat.so/v1/store/${GAME_ROOM_ID}`;

let MY_PLAYER_ID = 2; // Rôle local de cet écran (1 pour Bas, 2 pour Haut)
let board = Array(14).fill(5); 
let currentPlayer = 2;
let scores = { "1": 0, "2": 0 };

// Récupération des éléments du DOM
const holesElements = document.querySelectorAll('.hole');
const turnIndicator = document.getElementById('turn-indicator');
const roleSelector = document.getElementById('role-selector');
const resetBtn = document.getElementById('reset-btn');

// Gestionnaire de changement de rôle
roleSelector.addEventListener('change', () => {
    MY_PLAYER_ID = parseInt(roleSelector.value);
    updateDisplay();
});

// Gestionnaire du bouton de réinitialisation
resetBtn.addEventListener('click', resetOnlineGame);

// --- FONCTION EN SERVICE : Mettre à jour l'interface graphique ---
function updateDisplay() {
    holesElements.forEach(hole => {
        const index = parseInt(hole.getAttribute('data-index'));
        hole.innerText = board[index];
    });
    document.getElementById('score-j1').innerText = scores["1"];
    document.getElementById('score-j2').innerText = scores["2"];
    
    if (currentPlayer === MY_PLAYER_ID) {
        turnIndicator.innerText = "À VOTRE TOUR DE JOUER !";
        turnIndicator.style.color = "green";
    } else {
        turnIndicator.innerText = `Attente de l'adversaire (Joueur ${currentPlayer})...`;
        turnIndicator.style.color = "#5c3a21";
    }
}

// --- REQUÊTE AJAX (GET) : Lire l'état sur la base de données Internet ---
async function fetchGameState() {
    try {
        const response = await fetch(API_URL);
        if (response.ok) {
            const data = await response.json();
            if (data && data.board) {
                board = data.board;
                currentPlayer = data.currentPlayer;
                scores = data.scores;
                updateDisplay();
            }
        } else if (response.status === 404) {
            // Si l'espace de stockage n'existe pas encore en ligne, on l'initialise
            resetOnlineGame();
        }
    } catch (error) {
        console.error("Erreur AJAX (GET) :", error);
    }
}

// --- REQUÊTE AJAX (PUT) : Enregistrer l'état mis à jour sur Internet ---
async function saveGameStateToServer() {
    try {
        await fetch(API_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                board: board,
                currentPlayer: currentPlayer,
                scores: scores
            })
        });
    } catch (error) {
        console.error("Erreur AJAX (PUT) :", error);
    }
}

// Écoute des clics sur les trous du tablier
holesElements.forEach(hole => {
    hole.addEventListener('click', (e) => {
        const selectedIndex = parseInt(e.target.getAttribute('data-index'));
        
        // Sécurités de jeu
        if (currentPlayer !== MY_PLAYER_ID) {
            alert("Ce n'est pas votre tour de jouer !");
            return;
        }
        if ((MY_PLAYER_ID === 1 && (selectedIndex < 0 || selectedIndex > 6)) ||
            (MY_PLAYER_ID === 2 && (selectedIndex < 7 || selectedIndex > 13))) {
            alert("Cliquez uniquement dans votre camp !");
            return;
        }
        if (board[selectedIndex] === 0) {
            alert("Ce trou est vide !");
            return;
        }

        executeLocalMove(selectedIndex);
    });
});

// Traitement du coup local avant synchronisation
function executeLocalMove(startIndex) {
    let seeds = board[startIndex];
    board[startIndex] = 0;
    let currentIndex = startIndex;

    // Distribution circulaire anti-horaire
    while (seeds > 0) {
        currentIndex = (currentIndex + 1) % 14;
        if (currentIndex === startIndex) continue; 
        board[currentIndex]++;
        seeds--;
    }

    // Gestion des captures simples (2, 3 ou 4) chez l'adversaire
    const isJ1Hole = (currentIndex >= 0 && currentIndex <= 6);
    const isOwnHole = (MY_PLAYER_ID === 1 && isJ1Hole) || (MY_PLAYER_ID === 2 && !isJ1Hole);

    if (!isOwnHole) {
        let checkIndex = currentIndex;
        while (((MY_PLAYER_ID === 1 && (checkIndex >= 7 && checkIndex <= 13)) || (MY_PLAYER_ID === 2 && (checkIndex >= 0 && checkIndex <= 6))) && 
               (board[checkIndex] === 2 || board[checkIndex] === 3 || board[checkIndex] === 4)) {
            scores[MY_PLAYER_ID] += board[checkIndex];
            board[checkIndex] = 0;
            checkIndex = (checkIndex - 1 + 14) % 14; // Recul horaire
        }
    }

    // Alternance du tour de jeu
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    
    updateDisplay();
    
    // Envoi immédiat des données modifiées au serveur via AJAX
    saveGameStateToServer();
}

// Réinitialisation globale de la table
async function resetOnlineGame() {
    board = Array(14).fill(5);
    currentPlayer = 2;
    scores = { "1": 0, "2": 0 };
    updateDisplay();
    await saveGameStateToServer();
}

// --- LE POLLING ---
// Le navigateur interroge le cloud toutes les 1200ms pour vérifier si l'autre joueur a joué
setInterval(fetchGameState, 1200);

// Lancement au premier chargement
MY_PLAYER_ID = parseInt(roleSelector.value);
fetchGameState();