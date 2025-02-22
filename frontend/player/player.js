const EDITOR_URL_BASE = "../editor?board="
const TEST_BOARD = '{"formatVersion":2,"name":"Test1","rules":{"diceMin":1,"diceMax":3},"squareNextId":7,"squares":{"0":{"label":"Start","color":"#00ff00","position":{"x":10,"y":10},"action":{"type":"none","parameters":[""]},"nextId":"2","prevId":""},"1":{"label":"End","color":"#ff0000","position":{"x":405,"y":300},"action":{"type":"endGame","parameters":[""]},"nextId":"","prevId":"5"},"2":{"label":"","color":"#ff80c0","position":{"x":125,"y":17},"action":{"type":"none","parameters":[""]},"nextId":"3","prevId":"0"},"3":{"label":"Go to purple","color":"#ff8040","position":{"x":256,"y":28},"action":{"type":"jumpTo","parameters":["5"]},"nextId":"4","prevId":"2"},"4":{"label":"Go back 2 spaces","color":"#0080ff","position":{"x":376,"y":35},"action":{"type":"goForward","parameters":["-2"]},"nextId":"5","prevId":"3"},"5":{"label":"","color":"#400080","position":{"x":401,"y":161},"action":{"type":"none","parameters":[""]},"nextId":"1","prevId":"4"}},"players":[{"name":"foo","color":"#ff0000","squareId":"0"}]}';

const appContainer = document.getElementById("appContainer");
const boardDiv = document.getElementById("board");
const editLink = document.getElementById("editLink");
const rollBtn = document.getElementById("rollBtn");
const rollTxt = document.getElementById("rollTxt");
const supportErrors = document.querySelectorAll(".supportError");
let board = new Board("", boardDiv, 20, 15);

function randint(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
  }

function loadBoard(name) {
    let success = board.loadJson(TEST_BOARD);
    editLink.href = EDITOR_URL_BASE + board.name;
    return success;
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
    intervalId = setInterval(() => {
        if (timesLeft <= 0) {
            clearInterval(intervalId); // Stop repeating.
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
        case ActionType.END_GAME:
            //setTimeout(() => {
                window.alert(player.name + " wins!");
            //}, 0); // Temporary kludge so last state is visible.
            break;
    }
}

function onPageLoad(event) {
    if (typeof Element.prototype.replaceChildren === "undefined") {
        console.log("Browser too old!");
        return false; // Stop load events.
    }

    for (err of supportErrors) // Remove errors.
        err.remove();

    let params = new URLSearchParams(window.location.search);
    if (!loadBoard(params.get("board"))) // Load specified board
        window.alert("LOAD ERROR!"); // Placeholder
    
    editLink.href = EDITOR_URL_BASE + board.name;
    appContainer.style = null; // Show GUI
}

function onRollClicked(event) {
    let roll = randint(board.rules.diceMin, board.rules.diceMax+1);
    rollTxt.textContent = roll.toString();
    movePlayerBy(board.players[0], roll);
}

window.addEventListener("load", onPageLoad);
rollBtn.addEventListener("click", onRollClicked);
