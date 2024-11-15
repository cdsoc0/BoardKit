const EDITOR_URL_BASE = "../editor?board="

const appContainer = document.getElementById("appContainer");
const boardDiv = document.getElementById("board");
const editLink = document.getElementById("editLink");
const rollBtn = document.getElementById("rollBtn");
const supportErrors = document.querySelectorAll(".supportError");
let board = new Board("", boardDiv);

function loadBoard(name) {
    let success = board.loadLayout(name);
    editLink.href = EDITOR_URL_BASE + board.name;
    return success;
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
    
}

window.addEventListener("load", onPageLoad);
rollBtn.addEventListener("click", onRollClicked);
