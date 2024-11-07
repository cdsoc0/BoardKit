const CLASS_BOARD_SQUARE = "boardSquare"

const appContainer = document.getElementById("appContainer");
const board = document.getElementById("board");
const newBtn = document.getElementById("newBtn");
const loadBtn = document.getElementById("loadBtn");
const saveBtn = document.getElementById("saveBtn");
const supportErrors = document.querySelectorAll(".supportError");
let boardLayout = {};

class BoardSquare {
    id = "";
    label = "";
    color = 0;
    position = {"x": 0, "y": 0};
    action = null;
    element;
    nextId;

    constructor(id, label, color, position, action, nextId) {
        this.id = id;
        this.label = label;
        this.color = color;
        this.position = position;
        this.action = action;
        this.nextId = nextId;

        let elem = document.createElement("div");
        elem.id = "sq_".concat(id);
        elem.className = CLASS_BOARD_SQUARE;
        elem.textContent = label;
        elem.style.cssText = `top: ${position.y}px;
            left: ${position.x}px;
            background-color: #${(color).toString(16).padStart(6, '0')}`;
        elem.draggable = true;
        elem.addEventListener("dragend", this.onDragEnd.bind(this));
        this.element = elem;
    }

    onDragEnd(event) {
        this.position.x += event.layerX;
        this.position.y += event.layerY;
        this.update();
    }

    update() {
        this.element.style.left = this.position.x + "px";
        this.element.style.top = this.position.y + "px";
    }
}

function newBoard() {
    boardLayout = {
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
    board.replaceChildren();
    board.appendChild(boardLayout.doof.element);
    board.appendChild(boardLayout.daf.element);
    console.log("Created new board.");
}

function loadBoard(name) {
    let layoutJson = window.localStorage.getItem("boardLayout_" + name);
    board.replaceChildren();
    if (layoutJson !== null ) {
        let rawLayout = JSON.parse(layoutJson);
        for (sqId in rawLayout) {
            let a = rawLayout[sqId];
            let sq = new BoardSquare(sqId, a.label, a.color, a.position, a.action, a.nextId);
            board.appendChild(sq.element);
            boardLayout[sqId] = sq;
        }
        console.log("Loaded board.");
        return true;
    }
    return false;
}

function saveBoard(name) {
    window.localStorage.setItem("boardLayout_" + name, JSON.stringify(boardLayout));
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
    
    appContainer.style = null; // Show GUI
}

function onPageUnload(event) {
    // TODO: May need later.
}

window.addEventListener("load", onPageLoad);
window.addEventListener("beforeunload", onPageUnload);
newBtn.addEventListener("click", (ev) => newBoard());
loadBtn.addEventListener("click", (ev) => loadBoard("test"));
saveBtn.addEventListener("click", (ev) => saveBoard("test"));