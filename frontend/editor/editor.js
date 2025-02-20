const PLAYER_URL_BASE = "../player?board=";
const DIALOG_BUTTON_OK = "OK";
const DIALOG_BUTTON_DELETE = "Delete";

const appContainer = document.getElementById("appContainer");
const boardDiv = document.getElementById("board");

const newBtn = document.getElementById("newBtn");
const loadBtn = document.getElementById("loadBtn");
const saveBtn = document.getElementById("saveBtn");
const playLink = document.getElementById("playLink");
const nameBox = document.getElementById("nameBox");

const fileOpenDialog = document.getElementById("openDialog");
const fileOpenDialogForm = document.getElementById("openDialogForm");
const fileOpenDialogFile = document.getElementById("opdfFile");

const supportErrors = document.querySelectorAll(".supportError");
let board = new Board("Untitled", boardDiv);
let boardUnsavedChanges = false;
let editorState;

class State {
    eventAbortCon;

    enter() {
        this.eventAbortCon = new AbortController(); // AbortControllers are one time use only.
    }

    exit() {
        this.eventAbortCon.abort(); // Remove all event listeners attached upon entering state.
    }

    // Utility function for derived classes to re
    attachListener(target, eventName, listener) {
        target.addEventListener(eventName, listener.bind(this), {signal: this.eventAbortCon.signal})
    }
}

class EditState extends State {
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
    #asdfDeleteBtn = document.getElementById("asdfDeleteBtn");

    #rulesDialog = document.getElementById("rulesDialog");
    #rulesDialogForm = document.getElementById("rulesDialogForm");
    #rdfDiceMin = document.getElementById("rdfDiceMin");
    #rdfDiceMax = document.getElementById("rdfDiceMax");

    #setupSquareElement(square) {
        let elem = square.element;
        elem.draggable = true;
    
        // Setup event handlers. All of these event handlers are closures so the square object is easily accessable within each.
        this.attachListener(elem, "dragend", (event) => {
            square.position.x += event.layerX;
            square.position.y += event.layerY;
            square.update();
            boardUnsavedChanges = true;
        });
        this.attachListener(elem, "contextmenu", (event) => {
            console.log(this);
            // Set the form inputs.
            this.#asdfId.value = square.id;
            this.#asdfLabel.value = square.label;
            this.#asdfColor.value = square.color;
            this.#asdfActionType.value = square.action.type;
            if (square.action.parameters.length > 0)
                this.#asdfActionParam.value = square.action.parameters[0];
            // Show the 'delete' button.
            this.#asdfDeleteBtn.style.display = "inline";
            // Reshow the add dialog.
            this.#addSqDialog.showModal();
        });
    }

    #onAddSquareButtonClicked(event) {
        console.log(this);
        this.#asdfId.value = board.squareNextId; // Set the hidden form input
        this.#asdfDeleteBtn.style.display = "none";
        board.squareNextId++;
        this.#addSqDialog.showModal();
    }
    
    #onAddSquareDialogClosed(event) {
        let fd, btnName, newSq, newSqId, newSqAction, newSqPos;
        btnName = event.target.returnValue;
    
        fd = new FormData(this.#addSqDialogForm);
        newSqId = fd.get("sqId");
        if (btnName === DIALOG_BUTTON_DELETE) { // Delete square if button for it pressed.
            delete board.squares[newSqId];
            board.rebuildLayout();
            boardUnsavedChanges = true;
            return;
        }
        else if (btnName !== DIALOG_BUTTON_OK) // Only handle form data when user presses 'ok' button
            return;
        
        newSqAction = new Action(fd.get("sqActionType"), fd.get("sqActionParam"));
        if (board.squares.hasOwnProperty(newSqId)) // Don't reset the position of an already existing square.
            newSqPos = board.squares[newSqId].position;
        else 
            newSqPos = new Vector2(10, 10);
        
        newSq = new BoardSquare(board, newSqId, fd.get("sqLabel"), fd.get("sqColor"), newSqPos, newSqAction, "");
        board.squares[newSqId] = newSq;
        board.rebuildLayout();
        this.#setupSquareElement(newSq);
        boardUnsavedChanges = true;
    }

    #onRulesButtonClicked(event) {
        // Show existing values.
        this.#rdfDiceMin.value = board.rules.diceMin;
        this.#rdfDiceMax.value = board.rules.diceMax;
    
        this.#rulesDialog.showModal();
    }
    
    #onRulesDialogClosed(event) {
        let btnName, fd;
        btnName = event.target.returnValue;
        if (btnName !== DIALOG_BUTTON_OK) // Only handle form data when user presses 'ok' button
            return;
        
        fd = new FormData(this.#rulesDialogForm);
        board.rules.diceMin = Number(fd.get("diceMin"));
        board.rules.diceMax = Number(fd.get("diceMax"));
        boardUnsavedChanges = true;
    }

    #onLinkSquareButtonClicked(event) {
        changeState(new LinkState());
    }

    enter() {
        // Enter the state.
        super.enter();
        this.attachListener(this.#editAddSqBtn, "click", this.#onAddSquareButtonClicked);
        this.attachListener(this.#editLinkSqBtn, "click", this.#onLinkSquareButtonClicked);
        this.attachListener(this.#editRulesBtn, "click", this.#onRulesButtonClicked);
        this.attachListener(this.#addSqDialog, "close", this.#onAddSquareDialogClosed);
        this.attachListener(this.#addSqDialog, "cancel", onDialogCanceled);
        this.attachListener(this.#rulesDialog, "close", this.#onRulesDialogClosed);
        this.attachListener(this.#rulesDialog,"cancel", onDialogCanceled);
        this.#editTools.style.display = "block";
        for (let sqId in board.squares) {
            console.log(sqId);
            let sq = board.squares[sqId];
            this.#setupSquareElement(sq);
        }
    }

    exit() {
        // Cleanup the state.
        editTools.style.display = "none";
        for (let sqId in board.squares) {
            let e = board.squares[sqId].element;
            e.draggable = false;
        }
        super.exit();
    }
}

class LinkState extends State {
    #linkTools = document.getElementById("linkingTools");
    #linkBackBtn = document.getElementById("linkBackBtn");

    #onBackButtonClicked(event) {
        changeState(new EditState());
    }

    enter() {
        super.enter();
        this.attachListener(this.#linkBackBtn, "click", this.#onBackButtonClicked);
        this.#linkTools.style.display = "block";
    }

    exit() {
        this.#linkTools.style.display = "none";
        super.exit();
    }
}

function newBoard() {
    board = new Board("Untitled", boardDiv);
    board.rebuildLayout();
    setupBoard();
    console.log("Created new board.");
}

function loadBoard(json) {
    let success = board.loadJson(json);
    if (success) {
        setupBoard();
    }
    return success;
}

function downloadBoardToFile(name, json) {
    // Awful kludge. Only way I could find to do this cross-browser.
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

function setupBoard() {
    boardUnsavedChanges = false;
    nameBox.value = board.name;
    playLink.href = PLAYER_URL_BASE + board.name;
    changeState(new EditState());
}

function changeState(newState) {
    let oldState = editorState; // Get current state.
    
    if (typeof oldState !== "undefined")
        oldState.exit(); // Exit old state.
    newState.enter(); // Enter new state.

    editorState = newState;
}

function onPageLoad(event) {
    if (!apiExists(Element.prototype.replaceChildren)) {
        console.log("replaceChildren not supported!");
        return false; // Stop load events.
    }
    else if (!apiExists(HTMLDialogElement)) {
        console.log("<dialog> not supported!");
        return false;
    }

    for (err of supportErrors) // Remove errors.
        err.remove();

    let params = new URLSearchParams(window.location.search);
    // if (!loadBoard(params.get("board"))) // Load specified board
         newBoard();
    
    playLink.href = PLAYER_URL_BASE + board.name;
    appContainer.style = null; // Show GUI
}

function onPageUnload(event) {
    if (boardUnsavedChanges)
        event.preventDefault(); // Trigger unsaved changes confirmation dialog.
}

function onNameBoxChange(event) {
    board.name = nameBox.value; // Update name when user changes it.
}

function onLoadBtnPressed(event) {
    fileOpenDialog.showModal();
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
        loadBoard(reader.result);
    });
    reader.readAsText(file); // Async
}

function onDialogCanceled(event) {
    event.target.returnValue = "esc"; // Act like the cancel button was pressed upon Escape being pressed.
}

window.addEventListener("load", onPageLoad);
window.addEventListener("beforeunload", onPageUnload);
newBtn.addEventListener("click", (ev) => newBoard());
loadBtn.addEventListener("click", onLoadBtnPressed);
saveBtn.addEventListener("click", (ev) => downloadBoardToFile(board.name, board.saveJson()));
nameBox.addEventListener("change", onNameBoxChange)
fileOpenDialog.addEventListener("close", onFileOpenDialogClosed);
fileOpenDialog.addEventListener("cancel", onDialogCanceled);
