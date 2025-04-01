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
const playLink = document.getElementById("playLink");
const nameBox = document.getElementById("nameBox");

const fileOpenDialog = document.getElementById("openDialog");
const fileOpenDialogForm = document.getElementById("openDialogForm");
const fileOpenDialogFile = document.getElementById("opdfFile");

const supportErrors = document.querySelectorAll(".supportError");
const loadingPrompts = document.getElementById("loadingPrompts");
const loadingCurrent = document.getElementById("loadingCurrent");

let board = new Board("Untitled", boardDiv, 20, 15);
let boardUnsavedChanges = false;
let editorState;
let boardArrowsLines = {};

class State {
    eventAbortCon;

    enter() {
        this.eventAbortCon = new AbortController(); // AbortControllers are one time use only.
    }

    exit() {
        this.eventAbortCon.abort(); // Remove all event listeners attached upon entering state.
    }

    // Utility function for derived classes to reuse. Wrapper around the standard event listener that automatically binds 'this'
    // to the state instance and provides the abort signal implicity.
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
                this.#asdfActionParam.type = "text";
                hideElement(this.#asdfActionParam);
                showElement(this.#asdfActionSetTargetBtn);
                break;
            case ActionType.GO_FORWARD:
                this.#asdfActionParam.type = "number";
                hideElement(this.#asdfActionSetTargetBtn);
                showElement(this.#asdfActionParam);
                break;
            default:
                this.#asdfActionParam.type = "hidden";
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
        else if (btnName !== DIALOG_BUTTON_OK) // Only handle form data when user presses 'ok' button
            return;
        
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
        this.#rdfDiceMax.value = board.rules.diceMax;
        this.#rdfDiceMin.value = board.rules.diceMin;
        this.#rdfPlayerMax.value = board.rules.playersMax;
        this.#rdfPlayerMin.value = board.rules.playersMin;
    
        this.#rulesDialog.showModal();
    }

    #getMaxChangedListener(minElement) {
        return function(event) {
            let maxElement = event.target;
            minElement.max = maxElement.value;
        }
    }
    
    #onRulesDialogClosed(event) {
        let btnName, fd;
        btnName = event.target.returnValue;
        if (btnName !== DIALOG_BUTTON_OK) // Only handle form data when user presses 'ok' button
            return;
        
        console.log("New rules.");
        fd = new FormData(this.#rulesDialogForm);

        board.rules.diceMin = Number(fd.get("diceMin"));;
        board.rules.diceMax = Number(fd.get("diceMax"));
        board.rules.playersMin =  Number(fd.get("playersMin"));
        board.rules.playersMax = Number(fd.get("playersMax"));
        resizeBoard(Number(fd.get("boardWidth")), Number(fd.get("boardHeight")));
        boardUnsavedChanges = true;
    }

    #onLinkSquareButtonClicked(event) {
        changeState(new LinkState());
    }

    enter() {
        super.enter();
        // Setup listeners.
        this.attachListener(this.#editAddSqBtn, "click", this.#onAddSquareButtonClicked);
        this.attachListener(this.#editLinkSqBtn, "click", this.#onLinkSquareButtonClicked);
        this.attachListener(this.#editRulesBtn, "click", this.#onRulesButtonClicked);
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
    }

    exit() {
        // Cleanup the state.
        hideElement(editTools);
        for (let sqId in board.squares) {
            let e = board.squares[sqId].element;
            e.draggable = false;
        }
        super.exit();
    }
}

class SelectTargetState extends State {
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

class LinkState extends State {
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
        })
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

function newBoard() {
    board = new Board("Untitled", boardDiv, 20, 15);
    board.rebuildLayout();
    setupBoard();
    console.log("Created new board.");
}

function loadBoardJson(json) {
    let data;
    try {
        data = JSON.parse(json);
    } catch {
        console.error("Bad json!");
        return false;
    }
    return loadBoard(data);
}

function loadBoard(data) {
    let success = board.deserialize(data);
    if (success) {
        setupBoard();
    }
    return success;
}

function downloadBoardToFile(name, data) {
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
    boardUnsavedChanges = false;
    nameBox.value = board.name;
    playLink.href = PLAYER_URL_BASE + board.name;
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

function changeState(newState) {
    let oldState = editorState; // Get current state.
    
    if (typeof oldState !== "undefined")
        oldState.exit(); // Exit old state.
    newState.enter(); // Enter new state.

    editorState = newState;
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
    let onlineGameId = params.get("game");
    if (onlineGameId !== null) { // If a game is specified in the URL, try to load it.
        fetchOnlineGame(onlineGameId)
            .then((data) => {
                let success = loadBoard(data.board);
                if (!success)
                    throw new Error("Failed to deserialize board.");
                playLink.style = null;
                playLink.href = PLAYER_URL_BASE + onlineGameId;
                hideLoading();
            })
            .catch((error) => {
                window.alert(error);
            })
    }
    else {
        newBoard();
        hideLoading();
    }
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
        loadBoardJson(reader.result);
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
saveBtn.addEventListener("click", (ev) => downloadBoardToFile(board.name, board.serialize()));
nameBox.addEventListener("change", onNameBoxChange)
fileOpenDialog.addEventListener("close", onFileOpenDialogClosed);
fileOpenDialog.addEventListener("cancel", onDialogCanceled);
