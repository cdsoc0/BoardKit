const PLAYER_URL_BASE = "../player?board=";
const DIALOG_BUTTON_OK = "OK";

const appContainer = document.getElementById("appContainer");
const boardDiv = document.getElementById("board");
const newBtn = document.getElementById("newBtn");
const loadBtn = document.getElementById("loadBtn");
const saveBtn = document.getElementById("saveBtn");
const playLink = document.getElementById("playLink");
const nameBox = document.getElementById("nameBox");
const editAddSqBtn = document.getElementById("editAddSqBtn");
const addSqDialog = document.getElementById("addSqDialog");
const addSqDialogForm = document.getElementById("addSqDialogForm");
const supportErrors = document.querySelectorAll(".supportError");
let board = new Board("Untitled", boardDiv);
let boardUnsavedChanges = false;

function newBoard() {
    board.rebuildLayout();
    setupBoard();
    console.log("Created new board.");
}

function loadBoard(name) {
    let success = board.load(name);
    if (success) {
        setupBoard();
    }
    return success;
}

function saveBoard(name) {
    //window.localStorage.setItem("boardLayout_" + name, JSON.stringify(board.squares));
    window.localStorage.setItem("board_" + name, JSON.stringify(board));
    boardUnsavedChanges = false;
}

function setupBoard() {
    boardUnsavedChanges = false;
    nameBox.value = board.name;
    playLink.href = PLAYER_URL_BASE + board.name;
    for (let sqId in board.squares) {
        console.log(sqId);
        let sq = board.squares[sqId];
        makeSquareDragable(sq);
    }
}

function makeSquareDragable(square) {
    let elem = square.element;
    elem.draggable = true;
    elem.addEventListener("dragend", onSquareDragEnd.bind(square)); // Event listener is bound to Square object so it acts
                                                                // like a class method
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
        newBoard();
    
    playLink.href = PLAYER_URL_BASE + board.name;
    appContainer.style = null; // Show GUI
}

function onPageUnload(event) {
    if (boardUnsavedChanges)
        event.preventDefault(); // Trigger unsaved changes confirmation dialog.
}

function onSquareDragEnd(event) {
    let square = this; // 'this' is bound to the assoiated Square object.
    square.position.x += event.layerX;
    square.position.y += event.layerY;
    square.update();
    boardUnsavedChanges = true;
}

function onNameBoxChange(event) {
    board.name = nameBox.value;
}

function onAddSquareButtonClicked(event) {
    addSqDialog.showModal();
}

function onAddSquareFormSubmitted(event) {

}

function onAddSquareDialogClosed(event) {
    let fd, btnName, newSq, newSqId, newSqAction;
    console.log(event.target.returnValue);
    btnName = event.target.returnValue;
    if (btnName !== DIALOG_BUTTON_OK) // Only handle form data when user presses 'ok' button
        return;
    fd = new FormData(addSqDialogForm);
    for (k of fd.entries())
        console.log(k);
    
    newSqId = fd.get("sqId");
    newSqAction = new Action(fd.get("sqActionType"), fd.get("sqActionParam"));
    newSq = new BoardSquare(newSqId, fd.get("sqLabel"), fd.get("sqColor"), new Vector2(10, 10), newSqAction, "");
    board.squares[newSqId] = newSq;
    board.rebuildLayout();
    makeSquareDragable(newSq);
    boardUnsavedChanges = true;
}

window.addEventListener("load", onPageLoad);
window.addEventListener("beforeunload", onPageUnload);
newBtn.addEventListener("click", (ev) => newBoard());
loadBtn.addEventListener("click", (ev) => loadBoard(board.name));
saveBtn.addEventListener("click", (ev) => saveBoard(board.name));
nameBox.addEventListener("change", onNameBoxChange)
editAddSqBtn.addEventListener("click", onAddSquareButtonClicked);
addSqDialogForm.addEventListener("submit", onAddSquareFormSubmitted);
addSqDialog.addEventListener("close", onAddSquareDialogClosed);