const appContainer = document.getElementById("appContainer");
const boardDiv = document.getElementById("board");
const newBtn = document.getElementById("newBtn");
const loadBtn = document.getElementById("loadBtn");
const saveBtn = document.getElementById("saveBtn");
const playLink = document.getElementById("playLink");
const supportErrors = document.querySelectorAll(".supportError");
let board = new Board(boardDiv);
let boardUnsavedChanges = false;

function newBoard() {
    board.layout = {
        "doof": new BoardSquare("doof",
            "Doof",
            0x808080,
            {"x": 20, "y": 40},
            null,
            "daf"
        ),
        "daf": new BoardSquare("daf",
            "Daf",
            0x808080,
            {"x": 90, "y": 120},
            null,
            null
        )
    };
    board.rebuildLayout();
    console.log("Created new board.");
}

function loadBoard(name) {
    boardUnsavedChanges = false;
    let success = board.loadLayout(name);
    if (success) {
        for (let sqId in board.layout) {
            console.log(sqId);
            let sq = board.layout[sqId];
            let elem = sq.element;
            elem.draggable = true;
            elem.addEventListener("dragend", onSquareDragEnd.bind(sq)); // Event listener is bound to Square object so it acts
                                                                        // like a class method
        }
    }
    return success;
}

function saveBoard(name) {
    window.localStorage.setItem("boardLayout_" + name, JSON.stringify(board.layout));
    boardUnsavedChanges = false;
}

function onPageLoad(event) {
    if (typeof Element.prototype.replaceChildren === "undefined") {
        console.log("Browser too old!");
        return false; // Stop load events.
    }

    for (err of supportErrors) // Remove errors.
        err.remove();

    if (!loadBoard("test"))
        newBoard();
    
    playLink.href += "#test";
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

window.addEventListener("load", onPageLoad);
window.addEventListener("beforeunload", onPageUnload);
newBtn.addEventListener("click", (ev) => newBoard());
loadBtn.addEventListener("click", (ev) => loadBoard("test"));
saveBtn.addEventListener("click", (ev) => saveBoard("test"));