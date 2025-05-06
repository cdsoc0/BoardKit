const PLAYER_URL_BASE = "../player?game=";
const DIALOG_BUTTON_OK = "OK";
const DIALOG_BUTTON_DELETE = "Delete";
const DIALOG_BUTTON_SET_TARGET = "Set target";

const appContainer = document.getElementById("appContainer");
const boardDiv = document.getElementById("board");
const boardArrowsSvg = document.getElementById("boardArrows");

const newBtn = document.getElementById("newBtn");
const loadBtn = document.getElementById("loadBtn");
const saveBtn = document.getElementById("saveBtn");
const saveAsBtn = document.getElementById("saveAsBtn");
const playLink = document.getElementById("playLink");
const nameBox = document.getElementById("nameBox");

const fileOpenDialog = document.getElementById("openDialog");
const fileOpenDialogForm = document.getElementById("openDialogForm");
const fileOpenDialogFile = document.getElementById("opdfFile");

const fileSaveDialog = document.getElementById("saveAsDialog");
const fileSaveDialogForm = document.getElementById("saveAsDialogForm");
const sadfId = document.getElementById("sadfId");
const sadfName = document.getElementById("sadfName");
const sadfDesc = document.getElementById("sadfDesc");
const sadfPublish = document.getElementById("sadfPublish");
const sadfCategories = document.getElementById("sadfCategories");

const supportErrors = document.querySelectorAll(".supportError");
const loadingPrompts = document.getElementById("loadingPrompts");
const loadingCurrent = document.getElementById("loadingCurrent");

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
let boardUnsavedChanges = false;
let boardArrowsLines = {};

// General editing state: Allows adding, removing and moving squares and assigning rulesets.
class EditState extends UIState {
    #editTools = document.getElementById("editTools");
    #editAddSqBtn = document.getElementById("editAddSqBtn");
    #editLinkSqBtn = document.getElementById("editLinkSqBtn");
    #editRulesBtn = document.getElementById("editRulesBtn");
    
    #addSqDialog = document.getElementById("addSqDialog");
    #addSqDialogForm = document.getElementById("addSqDialogForm");
    #asdfId = document.getElementById("asdfId");
    #asdfLabel = document.getElementById("asdfLabel");
    #asdfColor = document.getElementById("asdfColor");
    #asdfActionType = document.getElementById("asdfActionType");
    #asdfActionParam = document.getElementById("asdfActionParam");
    #asdfActionSetTargetBtn = document.getElementById("asdfActionSetTargetBtn");
    #asdfDeleteBtn = document.getElementById("asdfDeleteBtn");

    #rulesDialog = document.getElementById("rulesDialog");
    #rulesDialogForm = document.getElementById("rulesDialogForm");
    #rdfDiceMin = document.getElementById("rdfDiceMin");
    #rdfDiceMax = document.getElementById("rdfDiceMax");
    #rdfBoardWidth = document.getElementById("rdfBoardWidth");
    #rdfBoardHeight = document.getElementById("rdfBoardHeight");
    #rdfPlayerMin = document.getElementById("rdfPlayerMin");
    #rdfPlayerMax = document.getElementById("rdfPlayerMax");

    #draggedPlayer = null;

    #setupSquareElement(square) {
        let elem = square.element;
        elem.draggable = true;
    
        // Setup event handlers. All of these event handlers are closures so the square object is easily accessable within each.
        this.attachListener(elem, "dragend", (event) => {
            square.position.x += event.layerX;
            square.position.y += event.layerY;
            square.update();
            if (board.squares.hasOwnProperty(square.nextId))
                makeArrow(square.id, square.nextId);
            if (board.squares.hasOwnProperty(square.prevId))
                makeArrow(square.prevId, square.id);
            boardUnsavedChanges = true;
        });
        this.attachListener(elem, "drop", (event) => {
            if (this.#draggedPlayer) { // We only want to do this stuff if a player is being dragged.
                let sqElem = event.target;
                event.preventDefault();
                this.#draggedPlayer.moveToSquare(sqElem.dataset.squareId);
                this.#draggedPlayer = null; // We are no longer dragging a player by this point.
                boardUnsavedChanges = true;
            }
        });
        this.attachListener(elem, "dragover", (event) => {
            if (this.#draggedPlayer)
                event.preventDefault(); // Indicate that players can be dragged onto squares.
        });
        this.attachListener(elem, "contextmenu", (event) => {
            event.preventDefault();
            // Set the form inputs.
            this.#asdfId.value = square.id;
            this.#asdfLabel.value = square.label;
            this.#asdfColor.value = square.color;
            this.#asdfActionType.value = square.action.type;
            if (square.action.parameters.length > 0)
                this.#asdfActionParam.value = square.action.parameters[0];
            // Cause a 'change' event.
            const chngEvt = new Event("change");
            this.#asdfActionType.dispatchEvent(chngEvt);
            // Show the 'delete' button.
            showElement(this.#asdfDeleteBtn);
            // Reshow the add dialog.
            this.#addSqDialog.showModal();
        });
    }

    #setupPlayerToken(player) {
        let elem = player.element;
        elem.draggable = true;

        this.attachListener(elem, "dragstart", (event) => {
            this.#draggedPlayer = player;
        });
        showElement(elem);
    }

    #onAddSquareButtonClicked(event) {
        this.#asdfId.value = board.squareNextId; // Set the hidden form input
        hideElement(this.#asdfDeleteBtn);
        board.squareNextId++;
        this.#addSqDialog.showModal();
    }

    #onASDFActionTypeChanged(event) {
        let newType = event.target.value;
        switch (newType) {
            case ActionType.JUMP_TO:
                this.#asdfActionParam.type = "text"; // Square IDs are strings and we want them to be validated as such.
                hideElement(this.#asdfActionParam); // Don't allow the user to enter an ID directly as we don't expose them in the UI.
                showElement(this.#asdfActionSetTargetBtn); // Show a button for entering a graphical selection instead.
                break;
            case ActionType.GO_FORWARD:
                this.#asdfActionParam.type = "number"; // We want a number for this.
                hideElement(this.#asdfActionSetTargetBtn);
                showElement(this.#asdfActionParam);
                break;
            default:
                this.#asdfActionParam.type = "hidden"; // The other action types take no parameters.
                hideElement(this.#asdfActionSetTargetBtn);
        }
    }
    
    #onAddSquareDialogClosed(event) {
        let fd, btnName, newSq, newSqId, newSqLabel, newSqColor, newSqAction, newSqPos, newNextId, newPrevId;
        btnName = event.target.returnValue;
    
        fd = new FormData(this.#addSqDialogForm);
        newSqId = fd.get("sqId");
        if (btnName === DIALOG_BUTTON_DELETE) { // Delete square if button for it pressed.
            let thisSq = board.squares[newSqId];
            // TODO: This mess could possibly be avoided with a refactor.
            removeSquareLinks(thisSq); // Clean up links.
            thisSq.destroy(); // Destruct.
            delete board.squares[newSqId]; // Remove from board collection.
            board.rebuildLayout();
            boardUnsavedChanges = true;
            return;
        }
        else if (btnName === DIALOG_BUTTON_SET_TARGET) {
            changeState(new SelectTargetState(event.target, this.#asdfActionParam, this));
            return;
        }
        else if (btnName !== DIALOG_BUTTON_OK) // Only handle the rest of the form data when user presses 'ok' button
            return;
        
        // Handle form data.
        newSqLabel = fd.get("sqLabel");
        newSqColor = fd.get("sqColor");
        newSqAction = new Action(fd.get("sqActionType"), fd.get("sqActionParam"));
        if (board.squares.hasOwnProperty(newSqId)) { // Don't recreate an already existing square.
            newSq = board.squares[newSqId];
            newSq.update(newSqLabel, newSqColor, newSqAction);
        }
        else {
            newSqPos = new Vector2(10, 10);
            newNextId = "";
            newPrevId = "";
            newSq = new BoardSquare(board, newSqId, newSqLabel, newSqColor, newSqPos, newSqAction, newNextId, newPrevId);
            board.squares[newSqId] = newSq;
            board.rebuildLayout();
            this.#setupSquareElement(newSq);
        }
        boardUnsavedChanges = true;
    }

    #onRulesButtonClicked(event) {
        // Show existing values.
        this.#rdfBoardWidth.value = board.size.x;
        this.#rdfBoardHeight.value = board.size.y;
        this.#rdfDiceMax.value = game.rules.diceMax;
        this.#rdfDiceMin.value = game.rules.diceMin;
        this.#rdfPlayerMax.value = game.rules.playersMax;
        this.#rdfPlayerMin.value = game.rules.playersMin;
    
        this.#rulesDialog.showModal();
    }

    // We have multiple pairs of input boxes that define minimums and maximums so this function returns a closure to avoid duplicating the event listener code.
    #getMaxChangedListener(minElement) {
        return function(event) {
            let maxElement = event.target;
            minElement.max = maxElement.value;
        }
    }

    #addPlayer(player) {
        game.addPlayer(player);
        this.#setupPlayerToken(player);
    }

    #removePlayer(player) {
        game.removePlayer(player);
    }
    
    #onRulesDialogClosed(event) {
        let btnName, fd;
        let oldPlayerMax = 0, newPlayerMax = 0, additionalPlrs = 0;
        btnName = event.target.returnValue;
        if (btnName !== DIALOG_BUTTON_OK) // Only handle form data when user presses 'ok' button
            return;
        
        console.log("New rules.");
        fd = new FormData(this.#rulesDialogForm);

        game.rules.diceMin = Number(fd.get("diceMin"));;
        game.rules.diceMax = Number(fd.get("diceMax"));
        game.rules.playersMin =  Number(fd.get("playersMin"));
        newPlayerMax = Number(fd.get("playersMax"));
        game.rules.playersMax = newPlayerMax;
        resizeBoard(Number(fd.get("boardWidth")), Number(fd.get("boardHeight")));

        oldPlayerMax = game.players.length;
        if (newPlayerMax > oldPlayerMax) {
            additionalPlrs = newPlayerMax - oldPlayerMax;
            for (let i = 0; i < additionalPlrs; i++) {
                let newIdx = oldPlayerMax + i;
                this.#addPlayer(new Player(board, "Player " + newIdx.toString(), DEFAULT_PLAYER_COLORS[newIdx], "0"))
            }
        }
        else if (newPlayerMax < oldPlayerMax) {
            for (let i = oldPlayerMax - 1; i >= newPlayerMax; i--) {
                this.#removePlayer(game.players[i]);
            }
        }
        boardUnsavedChanges = true;
    }

    #onLinkSquareButtonClicked(event) {
        changeState(new LinkState());
    }

    enter() {
        super.enter();
        // Setup listeners.
        // Toolbar buttons
        this.attachListener(this.#editAddSqBtn, "click", this.#onAddSquareButtonClicked);
        this.attachListener(this.#editLinkSqBtn, "click", this.#onLinkSquareButtonClicked);
        this.attachListener(this.#editRulesBtn, "click", this.#onRulesButtonClicked);
        // Dialogs
        this.attachListener(this.#addSqDialog, "close", this.#onAddSquareDialogClosed);
        this.attachListener(this.#asdfActionType, "change", this.#onASDFActionTypeChanged)
        this.attachListener(this.#addSqDialog, "cancel", onDialogCanceled);
        this.attachListener(this.#rdfDiceMax, "change", this.#getMaxChangedListener(this.#rdfDiceMin));
        this.attachListener(this.#rdfPlayerMax, "change", this.#getMaxChangedListener(this.#rdfPlayerMin));
        this.attachListener(this.#rulesDialog, "close", this.#onRulesDialogClosed);
        this.attachListener(this.#rulesDialog,"cancel", onDialogCanceled);

        showElement(this.#editTools); // Show tools.
        for (let sqId in board.squares) { // Setup squares.
            console.log(sqId);
            let sq = board.squares[sqId];
            this.#setupSquareElement(sq);
        }
        for (let plr of game.players) { // Setup players.
            this.#setupPlayerToken(plr);
        }
    }

    exit() {
        // Cleanup the state.
        hideElement(editTools);
        for (let sqId in board.squares) {
            let e = board.squares[sqId].element;
            e.draggable = false;
        }
        for (let plr of game.players) {
            let e = plr.element;
            e.draggable = false;
            hideElement(e);
        }
        super.exit();
    }
}

class SelectTargetState extends UIState {
    #selectTargetTools = document.getElementById("selectTargetTools");
    #selectTargetDoneBtn = document.getElementById("selectTargetDoneBtn");
    #triggeringDialog;
    #inputBox;
    #prevState;
    #selectedElem;

    constructor(triggeringDialog, inputBox, prevState) {
        super();
        this.#triggeringDialog = triggeringDialog;
        this.#inputBox = inputBox;
        this.#prevState = prevState;
    }

    #setupSquares() {
        let selSq = board.squares[this.#inputBox.value];
        // Show old selection, if present.
        if (typeof selSq !== "undefined") {
            selSq.element.classList.add("selectedSquare");
            this.#selectedElem = selSq.element;
        }
        // Setup squares.
        for (let sqId in board.squares) {
            console.log(sqId);
            let square = board.squares[sqId];
            let elem = square.element;
            this.attachListener(elem, "click", (event) => {
                if (this.#selectedElem !== undefined && this.#selectedElem !== elem)
                    this.#selectedElem.classList.remove("selectedSquare");
                this.#inputBox.value = square.id;
                this.#selectedElem = elem;
                elem.classList.add("selectedSquare");
            });
        }
    }

    #onDoneButtonClicked(event) {
        changeState(this.#prevState);
    }

    enter() {
        super.enter();
        this.attachListener(this.#selectTargetDoneBtn, "click", this.#onDoneButtonClicked);
        showElement(this.#selectTargetTools);
        this.#setupSquares();
    }

    exit() {
        hideElement(this.#selectTargetTools);
        if (this.#selectedElem !== undefined)
            this.#selectedElem.classList.remove("selectedSquare");
        if (this.#triggeringDialog !== undefined)
            this.#triggeringDialog.showModal();
        super.exit();
    }
}

class LinkState extends UIState {
    #linkTools = document.getElementById("linkingTools");
    #linkBackBtn = document.getElementById("linkBackBtn");
    #draggedSquare;

    #setupSquareElement(square) {
        let elem = square.element;
        elem.draggable = true;
    
        // Setup event handlers. All of these event handlers are closures so the square object is easily accessable within each.
        this.attachListener(elem, "dragstart", (event) => {
            this.#draggedSquare = square;
        });
        this.attachListener(elem, "dragover", (event) => {
            event.preventDefault(); // Make drop events happen properly.
        });
        this.attachListener(elem, "drop", (event) => {
            let toSq, fromSq;
            if (event.target.className !== CLASS_BOARD_SQUARE)
                return; // Do nothing if the drop target is not actually a board square.
            event.preventDefault();

            toSq = this.#getSquareFromElement(event.target);
            fromSq = this.#draggedSquare;

            if (toSq !== fromSq) {
                fromSq.nextId = toSq.id;
                toSq.prevId = fromSq.id;
                makeArrow(fromSq.id, toSq.id);
            }
        });
        this.attachListener(elem, "contextmenu", (event) => {
            let thisSq, otherSq;
            event.preventDefault();
            thisSq = this.#getSquareFromElement(event.target);
            if (thisSq.nextId) {
                // Clear the relation.
                otherSq = board.squares[thisSq.nextId];
                thisSq.nextId = "";
                otherSq.prevId = "";
                // Remove the arrow.
                removeArrow(thisSq.id);
            }
        });
    }

    #getSquareFromElement(elem) {
        let sqId = elem.dataset.squareId; // Get id of square object that this element represents.
        return board.squares[sqId];
    }

    #onBackButtonClicked(event) {
        changeState(new EditState());
    }

    enter() {
        super.enter();
        this.attachListener(this.#linkBackBtn, "click", this.#onBackButtonClicked);
        showElement(this.#linkTools);
        for (let sqId in board.squares) { // Setup squares.
            console.log(sqId);
            let sq = board.squares[sqId];
            this.#setupSquareElement(sq);
        }
    }

    exit() {
        hideElement(this.#linkTools);
        super.exit();
    }
}

function newGame() {
    let newBoard = new Board(boardDiv, new Vector2(20, 15), {}, 0);
    game = new Game(
        0, 
        0,
        "Untitled",
        "",
        new RulesData(1, 6, 1, 4),
        newBoard,
        [],
    );
    game.board.rebuildLayout();
    setupBoard();
    console.log("Created new board.");
}

function loadGameJson(json) {
    let data;
    try {
        data = JSON.parse(json);
    } catch {
        console.error("Bad json!");
        return false;
    }
    return loadGame(data);
}

function loadGame(data) {
    let success = game.deserialize(data, boardDiv);
    if (success) {
        setupBoard();
    }
    return success;
}

function downloadGameToFile(name, data) {
    // Awful kludge. Only way I could find to do this cross-browser.
    let json = JSON.stringify(data);
    let file = new Blob([json], {type: "application/x-boardkit-game"});
    let a = document.createElement("a");
    let url = URL.createObjectURL(file);
    a.href = url;
    a.download = name + ".boardkit";
    document.body.appendChild(a);
    a.click(); // Start download.
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);  
    }, 0);
    boardUnsavedChanges = false;
}

function makeArrow(fromSqId, toSqId) {
    if (typeof(boardArrowsLines[fromSqId]) !== "undefined")
        removeArrow(fromSqId); // Remove old one if present.
    let arrow = document.createElementNS("http://www.w3.org/2000/svg", "line");
    let sq1Center = getCenterOfElement(board.squares[fromSqId].element);
    let sq2Center = getCenterOfElement(board.squares[toSqId].element);
    arrow.setAttribute("stroke", "black");
    arrow.style = "marker-end: url(#arrow);"
    arrow.setAttribute("x1", sq1Center.x);
    arrow.setAttribute("x2", sq2Center.x);
    arrow.setAttribute("y1", sq1Center.y);
    arrow.setAttribute("y2", sq2Center.y);
    boardArrowsSvg.appendChild(arrow);
    boardArrowsLines[fromSqId] = arrow;
}

function removeArrow(fromSqId) {
    boardArrowsLines[fromSqId].remove();
    delete boardArrowsLines[fromSqId];
}

function removeSquareLinks(thisSq) {
    if (thisSq.nextId) {
        // Clear the relation.
        let nextSq = board.squares[thisSq.nextId];
        nextSq.prevId = "";
        // Remove the arrow.
        removeArrow(thisSq.id);
    }
    if (thisSq.prevId) {
        let prevSq = board.squares[thisSq.prevId];
        prevSq.nextId = "";
        removeArrow(prevSq.id);
    }
}

function resizeBoard(width, height) {
    let boardRect;
    board.size.x = width;
    board.size.y = height;
    board.updateSize();
    boardRect = board.div.getBoundingClientRect();
    boardArrowsSvg.style = `width: ${board.size.x}cm; height: ${board.size.y}cm;`
    boardArrowsSvg.setAttribute("viewBox", `${boardRect.left} ${boardRect.top} ${boardRect.width} ${boardRect.height}`)
}

function setupBoard() {
    board = game.board;
    boardUnsavedChanges = false;
    nameBox.value = game.name;
    playLink.href = PLAYER_URL_BASE + game.id;
    hideLoading();
    resizeBoard(board.size.x, board.size.y);
    for (let arId in boardArrowsLines) { // Clean up old arrows if present.
        removeArrow(arId);
    }
    for (let sqId in board.squares) {
        let sq = board.squares[sqId];
        if (board.squares.hasOwnProperty(sq.nextId))
            makeArrow(sqId, sq.nextId);
    }
    changeState(new EditState());
}

function hideLoading() {
    // Show GUI
    hideElement(loadingPrompts);
    showElement(appContainer);
}

function showSupportError() {
    hideLoading();
    for (err of supportErrors)
        showElement(err); // Show support error.
}

async function createOnlineGame(game, publish) {
    let bodyObj = game.serialize();
    bodyObj.published = publish;
    let response = await apiPost("games", bodyObj);
    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
    }
    return response.json();
}

async function saveOnlineGame(game, publish) {
    let bodyObj = game.serialize();
    bodyObj.published = publish;
    let response = await apiPut("games", game.id, bodyObj);
    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
    }
    return response.json();
}

function showSaveDialog() {
    sadfName.value = game.name;
    sadfDesc.value = game.description;
    sadfPublish.checked = game.published;
    for (let op of sadfCategories.children) {
        if (game.categories.includes(Number(op.value)))
            op.selected = true;
        else
            op.selected = false;
    }
    fileSaveDialog.showModal();
}

function onPageLoad(event) {
    if (!apiExists(Element.prototype.replaceChildren)) {
        console.log("replaceChildren not supported!");
        showSupportError();
        return false; // Stop load events.
    }
    else if (!apiExists(HTMLDialogElement)) {
        console.log("<dialog> not supported!");
        showSupportError();
        return false;
    }

    let params = new URLSearchParams(window.location.search);
    let onlineGameId = Number(params.get("game"));
    if (onlineGameId !== 0) { // If a game is specified in the URL, try to load it.
        fetchOnlineGame(onlineGameId)
            .then((data) => {
                let success = loadGame(data);
                if (!success)
                    throw new Error("Failed to deserialize board.");
                playLink.style = null;
                playLink.href = PLAYER_URL_BASE + data.id;
            })
            .catch((error) => {
                errorAlert(error);
            })
    }
    else {
        newGame();
    }
}

function onPageUnload(event) {
    if (boardUnsavedChanges)
        event.preventDefault(); // Trigger unsaved changes confirmation dialog.
}

function onNameBoxChange(event) {
    game.name = nameBox.value; // Update name when user changes it.
}

function onLoadBtnPressed(event) {
    fileOpenDialog.showModal();
}

function onSaveBtnPressed(event) {
    //downloadBoardToFile(board.name, board.serialize())
    sadfId.value = game.id; // Set hidden field containing the ID of the game to save.
    showSaveDialog();
}

function onSaveAsBtnPressed(event) {
    sadfId.value = 0; // Force creating new game.
    showSaveDialog();
}

function onFileOpenDialogClosed(event) {
    let btnName, fd, file, reader;
    btnName = event.target.returnValue;
    if (btnName !== DIALOG_BUTTON_OK)
        return;

    fd = new FormData(fileOpenDialogForm);
    file = fd.get("boardFile");
    reader = new FileReader();
    // Read file.
    reader.addEventListener("loadend", (e) => {
        loadGameJson(reader.result);
    });
    reader.readAsText(file); // Async
}

function onFileSaveDialogClosed(event) {
    let btnName, fd, id, publish;
    btnName = event.target.returnValue;
    if (btnName !== DIALOG_BUTTON_OK)
        return;

    fd = new FormData(fileSaveDialogForm);
    id = Number(fd.get("id"));
    game.name = fd.get("name");
    game.description = fd.get("desc");
    game.categories = fd.getAll("categories");
    publish = Boolean(fd.get("publish"));

    if (id > 0) {
        saveOnlineGame(game, publish).then((data) => {
            window.alert("Saved new version.");
            game.published = publish;
            boardUnsavedChanges = false;
        })
        .catch((error) => {
            errorAlert(error);
        });
    }
    else {
        createOnlineGame(game, publish).then((data) => {
            game.id = data.id;
            game.name = data.name;
            game.published = publish;
            nameBox.value = game.name;
        })
        .catch((error) => {
            errorAlert(error);
        });
    }
}

function onDialogCanceled(event) {
    event.target.returnValue = "esc"; // Act like the cancel button was pressed upon Escape being pressed.
}

window.addEventListener("load", onPageLoad);
window.addEventListener("beforeunload", onPageUnload);
newBtn.addEventListener("click", (ev) => newGame());
loadBtn.addEventListener("click", onLoadBtnPressed);
saveBtn.addEventListener("click", onSaveBtnPressed);
saveAsBtn.addEventListener("click", onSaveAsBtnPressed);
nameBox.addEventListener("change", onNameBoxChange);
fileOpenDialog.addEventListener("close", onFileOpenDialogClosed);
fileOpenDialog.addEventListener("cancel", onDialogCanceled);
fileSaveDialog.addEventListener("close", onFileSaveDialogClosed);
fileSaveDialog.addEventListener("cancel", onDialogCanceled);
