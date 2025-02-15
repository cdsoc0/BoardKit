const EDITOR_URL_BASE = "../editor?board="
const TEST_BOARD = '';

const appContainer = document.getElementById("appContainer");
const boardDiv = document.getElementById("board");
const editLink = document.getElementById("editLink");
const rollBtn = document.getElementById("rollBtn");
const rollTxt = document.getElementById("rollTxt");
const supportErrors = document.querySelectorAll(".supportError");
let board = new Board("", boardDiv);

function randint(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
  }

function loadBoard(name) {
    let success = board.load(name);
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
    let roll = randint(1, 7);
    rollTxt.textContent = roll.toString();
    
}

window.addEventListener("load", onPageLoad);
rollBtn.addEventListener("click", onRollClicked);
