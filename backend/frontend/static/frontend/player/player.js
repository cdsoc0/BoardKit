const EDITOR_URL_BASE = "../editor?game="

const appContainer = document.getElementById("appContainer");
const boardDiv = document.getElementById("board");
const editLink = document.getElementById("editLink");
const rollBtn = document.getElementById("rollBtn");
const rollTxt = document.getElementById("rollTxt");
const loadingPrompts = document.getElementById("loadingPrompts");
const loadingCurrent = document.getElementById("loadingCurrent");
const supportErrors = document.querySelectorAll(".supportError");
let board = new Board(boardDiv, new Vector2(20, 15), {}, 0);
let game = new Game(
    0, 
    0,
    "Untitled",
    "",
    new RulesData(1, 6, 1, 4),
    board,
    [],
);
let currentPlayer = 0;

function randint(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
  }

function loadGame(id) {
    return fetchOnlineGame(id)
        .then((data) => {
            let success = game.deserialize(data, boardDiv);
            if (!success)
                throw new Error("Failed to deserialize board.");
            editLink.href = EDITOR_URL_BASE + id;
            board = game.board;
        })
        .catch((error) => {
            errorAlert(error);
        });
}

function getPlayerSquare(player) {
    return board.squares[player.squareId];
}

function movePlayerTo(player, newSqId) {
    player.squareId = newSqId;
    player.update();
}

function movePlayerBy(player, amount) {
    let newIdProp = "nextId";
    let intervalId;
    let timesLeft = Math.abs(amount);
    if (amount < 0)
        newIdProp = "prevId";
    rollBtn.setAttribute("disabled", true);
    intervalId = setInterval(() => {
        if (timesLeft <= 0) {
            clearInterval(intervalId); // Stop repeating.
            rollBtn.removeAttribute("disabled"); // Re-enable dice rolls.
            doSquareAction(player);
            return;
        }
        
        let curSq = getPlayerSquare(player);
        let newSqId = curSq[newIdProp];
        if (newSqId) {
            movePlayerTo(player, newSqId);
        }
        else
            timesLeft = 0;
        timesLeft--;
    }, 500);
}

function doSquareAction(player) {
    let sq = getPlayerSquare(player);
    let act = sq.action;
    switch (act.type) {
        case ActionType.GO_FORWARD:
            movePlayerBy(player, Number(act.parameters[0]));
            break;
        case ActionType.JUMP_TO:
            movePlayerTo(player, act.parameters[0]);
            break;
        case ActionType.ANOTHER_TURN:
            console.log(currentPlayer);
            currentPlayer--;
            break;
        case ActionType.END_GAME:
            window.alert(player.name + " wins!");
            break;
    }
}

function hideLoading() {
    hideElement(loadingPrompts);
}

function onPageLoad(event) {
    if (typeof Element.prototype.replaceChildren === "undefined") {
        console.log("Browser too old!");
        hideLoading();
        for (err of supportErrors)
            showElement(err); // Show support error.
        return false; // Stop load events.
    }

    setTimeout(async () => {
        loadingCurrent.textContent = "Loading game...";
        let params = new URLSearchParams(window.location.search);
        let gameId = params.get("game");
        await loadGame(gameId); // Load specified board
        editLink.href = EDITOR_URL_BASE + gameId;
        appContainer.style = null; // Show GUI
        hideLoading();
    }, 0);
}

function onRollClicked(event) {
    let roll = randint(game.rules.diceMin, game.rules.diceMax+1);
    rollTxt.textContent = roll.toString();
    movePlayerBy(game.players[currentPlayer], roll);
    
    if (currentPlayer < game.players.length - 1)
        currentPlayer++;
    else
        currentPlayer = 0;
}

window.addEventListener("load", onPageLoad);
rollBtn.addEventListener("click", onRollClicked);
