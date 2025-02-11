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

const editAddSqBtn = document.getElementById("editAddSqBtn");
const editLinkSqBtn = document.getElementById("editLinkSqBtn");
const addSqDialog = document.getElementById("addSqDialog");
const addSqDialogForm = document.getElementById("addSqDialogForm");
const asdfId = document.getElementById("asdfId");
const asdfLabel = document.getElementById("asdfLabel");
const asdfColor = document.getElementById("asdfColor");
const asdfActionType = document.getElementById("asdfActionType");
const asdfActionParam = document.getElementById("asdfActionParam");
const asdfDeleteBtn = document.getElementById("asdfDeleteBtn");
const fileOpenDialog = document.getElementById("openDialog");
const fileOpenDialogForm = document.getElementById("openDialogForm");
const fileOpenDialogFile = document.getElementById("opdfFile");

const supportErrors = document.querySelectorAll(".supportError");
let board = new Board("Untitled", boardDiv);
let boardUnsavedChanges = false;

function newBoard() {
    board = new Board("Untitled", boardDiv);
    board.rebuildLayout();
    setupBoard();
    console.log("Created new board.");
}

function loadBoard(json) {
    //let json = window.localStorage.getItem("board_" + name);
    let success = board.loadJson(json);
    if (success) {
        setupBoard();
    }
    return success;
}

// function saveBoard(name) {
//     window.localStorage.setItem("board_" + name, JSON.stringify(board)); // Save the board data as JSON.
//     boardUnsavedChanges = false;
// }

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
    for (let sqId in board.squares) {
        console.log(sqId);
        let sq = board.squares[sqId];
        setupSquareElement(sq);
    }
}

function setupSquareElement(square) {
    let elem = square.element;
    elem.draggable = true;

    // Setup event handlers. All of these event handlers are closures so the square object is easily accessable within each.
    elem.addEventListener("dragend", (event) => {
        square.position.x += event.layerX;
        square.position.y += event.layerY;
        square.update();
        boardUnsavedChanges = true;
    });
    elem.addEventListener("contextmenu", (event) => {
        // Set the form inputs.
        asdfId.value = square.id;
        asdfLabel.value = square.label;
        asdfColor.value = square.color;
        asdfActionType.value = square.action.type;
        if (square.action.parameters.length > 0)
            asdfActionParam.value = square.action.parameters[0];
        // Show the 'delete' button.
        asdfDeleteBtn.style.display = "inline";
        // Reshow the add dialog.
        addSqDialog.showModal();
    });
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
    //     newBoard();
    
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

function onAddSquareButtonClicked(event) {
    asdfId.value = board.squareNextId; // Set the hidden form input
    asdfDeleteBtn.style.display = "none";
    board.squareNextId++;
    addSqDialog.showModal();
}

function onAddSquareDialogClosed(event) {
    let fd, btnName, newSq, newSqId, newSqAction, newSqPos;
    btnName = event.target.returnValue;
    if (btnName !== DIALOG_BUTTON_OK && btnName !== DIALOG_BUTTON_DELETE) // Only handle form data when user presses 'ok' button
        return;
    
    fd = new FormData(addSqDialogForm);
    newSqId = fd.get("sqId");
    if (btnName === DIALOG_BUTTON_DELETE) {
        delete board.squares[newSqId];
        board.rebuildLayout();
        return;
    }

    newSqAction = new Action(fd.get("sqActionType"), fd.get("sqActionParam"));
    if (board.squares.hasOwnProperty(newSqId)) // Don't reset the position of an already existing square.
        newSqPos = board.squares[newSqId].position;
    else 
        newSqPos = new Vector2(10, 10);
    
    newSq = new BoardSquare(newSqId, fd.get("sqLabel"), fd.get("sqColor"), newSqPos, newSqAction, "");
    board.squares[newSqId] = newSq;
    board.rebuildLayout();
    setupSquareElement(newSq);
    boardUnsavedChanges = true;
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
editAddSqBtn.addEventListener("click", onAddSquareButtonClicked);
addSqDialog.addEventListener("close", onAddSquareDialogClosed);
addSqDialog.addEventListener("cancel", onDialogCanceled);
fileOpenDialog.addEventListener("close", onFileOpenDialogClosed);
fileOpenDialog.addEventListener("cancel", onDialogCanceled);
