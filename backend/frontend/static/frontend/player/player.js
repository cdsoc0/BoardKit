const DIALOG_BUTTON_OK = "OK";
const EDITOR_URL_BASE = "../editor?game=";
const PLAYER_MOVEMENT_DELAY = 500;
const PLAYER_CONFIG_ITEM_BODY = '<input type="checkbox" name="plrEnabled" title="Enable player $0" checked> \
                                 <label for="spdfName$0">Name: </label> \
                                 <input id="spdfName$0" type="text" name="name" value="$1" required> \
                                 <label for="spdfColor$0">Colour: </label> \
                                 <input id="spdfColor$0" type="color" name="color" value="$2" required>';

const appContainer = document.getElementById("appContainer");
const boardDiv = document.getElementById("board");
const spdfPlrList = document.getElementById("spdfPlrList");
const editLink = document.getElementById("editLink");
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

class SetupState extends UIState {
    #setupPlrsDialog = document.getElementById("setupPlrsDialog");
    #setupPlrsDialogForm = document.getElementById("setupPlrsDialogForm");
    #playBtn = document.getElementById("playBtn");

    #onPlayBtnClicked(event) {
        this.#setupPlrsDialog.showModal();
    }

    #onSetupDialogClosed(event) {
        let fd, btnName, plrEnabledCbs, plrsEnabled, plrsNames, plrsColors;
        btnName = event.target.returnValue;
        if (btnName !== DIALOG_BUTTON_OK) // Only do stuff when the dialog is confirmed.
            return;
        plrEnabledCbs = document.getElementsByName("plrEnabled");

        fd = new FormData(this.#setupPlrsDialogForm);
        plrsNames = fd.getAll("name");
        plrsColors = fd.getAll("color");

        for (let i = 0; i < game.players.length; i++) {
            let plr = game.players[i];
            plr.name = plrsNames[i];
            plr.color = plrsColors[i];
        }
        plrsEnabled = game.players.filter((item, index) => plrEnabledCbs[index].checked);
        console.log(plrsEnabled);
        changeState(new PlayState(plrsEnabled));
    }

    enter() {
        super.enter();
        // Event listeners.
        this.attachListener(this.#playBtn, "click", this.#onPlayBtnClicked);
        this.attachListener(this.#setupPlrsDialog, "close", this.#onSetupDialogClosed);
        this.attachListener(this.#setupPlrsDialog, "cancel", onDialogCanceled);

        // Elements.
        showElement(this.#playBtn);
        hidePlayers(game.players);
    }

    exit() {
        hideElement(this.#playBtn);
        super.exit();
    }
}

class PlayState extends UIState {
    #infoDiv = document.getElementById("playInfo");
    #rollBtn = document.getElementById("rollBtn");
    #rollTxt = document.getElementById("rollTxt");
    #players = [];
    #currentPlayer = 0;

    constructor(enabledPlayers) {
        super();
        this.#players = enabledPlayers;
    }

    #movePlayerTo(player, newSqId) {
        player.moveToSquare(newSqId);
    }
    
    #movePlayerBy(player, amount) {
        let newIdProp = "nextId";
        let intervalId;
        let timesLeft = Math.abs(amount);
        if (amount < 0)
            newIdProp = "prevId";
        this.#rollBtn.setAttribute("disabled", true);
        // This is an interval so each step can be seen by the player. This is like a wierd, in human time, while loop. Asyncronous with the main thread.
        intervalId = setInterval(() => {
            if (timesLeft <= 0) { // Are we done moving?
                clearInterval(intervalId); // Stop repeating.
                this.#rollBtn.removeAttribute("disabled"); // Re-enable dice rolls.
                this.#doSquareAction(player);
                return;
            }
            
            let curSq = getPlayerSquare(player);
            let newSqId = curSq[newIdProp];
            if (newSqId) { // Is there a square to go to?
                player.moveToSquare(newSqId); // If there is, go to it.
            }
            else
                timesLeft = 0; // If there isn't, stop moving.
            timesLeft--;
        }, PLAYER_MOVEMENT_DELAY);
    }
    
    #doSquareAction(player) {
        let sq = getPlayerSquare(player);
        let act = sq.action;
        switch (act.type) {
            case ActionType.GO_FORWARD:
                this.#movePlayerBy(player, Number(act.parameters[0]));
                break;
            case ActionType.JUMP_TO:
                this.#movePlayerTo(player, act.parameters[0]);
                break;
            case ActionType.ANOTHER_TURN:
                if (this.#currentPlayer > 0)
                    this.#currentPlayer--; // Undo the incrementation of the current player index that will have happened earlier.
                break;
            case ActionType.END_GAME:
                window.alert(player.name + " wins!");
                this.#rollBtn.setAttribute("disabled", true);
                break;
        }
    }

    #onRollClicked(event) {
        let roll = randint(game.rules.diceMin, game.rules.diceMax+1);
        this.#rollTxt.textContent = roll.toString();
        this.#movePlayerBy(this.#players[this.#currentPlayer], roll);
        
        if (this.#currentPlayer < this.#players.length - 1)
            this.#currentPlayer++;
        else
            this.#currentPlayer = 0;
    }

    enter() {
        super.enter();
        this.attachListener(this.#rollBtn, "click", this.#onRollClicked);
        showElement(this.#infoDiv);
        showPlayers(this.#players);
    }

    exit() {
        hideElement(this.#infoDiv);
        hidePlayers(this.#players);
        super.exit();
    }
}

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
            
            for (let i = 0; i < game.players.length; i++) {
                let li = document.createElement("li");
                let plr = game.players[i];
                li.innerHTML = formatString(PLAYER_CONFIG_ITEM_BODY, i + 1, plr.name, plr.color);
                spdfPlrList.appendChild(li);
            }

            board = game.board;
        })
        .catch((error) => {
            errorAlert(error);
        });
}

function getPlayerSquare(player) {
    return board.squares[player.squareId];
}

function showPlayers(players) {
    for (let plr of players) {
        let e = plr.element;
        showElement(e);
        plr.update();
    }
}

function hidePlayers(players) {
    for (let plr of players) {
        let e = plr.element;
        hideElement(e);
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
        changeState(new SetupState());
        hideLoading();
    }, 0);
}

window.addEventListener("load", onPageLoad);
