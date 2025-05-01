// Code shared between player and editor.
const DEBUG = true;
const CLASS_BOARD_SQUARE = "boardSquare";
const CLASS_PLAYER_TOKEN = "playerToken";
const GAME_FORMAT_VERSION = 4;
const API_URL_BASE = "/api/$0/?format=json";
const DEFAULT_PLAYER_COLORS = ["#FF0000", "#00FF00", "#FFFF00", "#0000FF", "#FF00FF", "#00FFFF", "#000000", "#FFFFFF"];
const ActionType = Object.freeze({
    NONE: "none",
    GO_FORWARD: "goForward",
    JUMP_TO: "jumpTo",
    ANOTHER_TURN: "anotherTurn",
    END_GAME: "endGame",
});

let currentUIState;

class Vector2 {
    x = 0;
    y = 0;

    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(other) {
        return new Vector2(this.x + other.x, this.y + other.y);
    }

    sub(other) {
        return new Vector2(this.x - other.x, this.y - other.y);
    }

    mul(other) {
        return new Vector2(this.x * other.x, this.y * other.y);
    }
}

// Various untility functions.
function colorIntToHex(colorInt) {
    return (colorInt).toString(16).padStart(6, '0');
}

function strIsValidActionType(typeName) {
    for (key in ActionType) {
        if (ActionType[key] === typeName)
            return true;
    }
    return false;
}

function apiExists(object) {
    return typeof object !== "undefined";
}

function getCenterOfElement(elem) {
    let rect = elem.getBoundingClientRect();
    let centerx = rect.left + (rect.width / 2);
    let centery = rect.top + (rect.height / 2);
    return new Vector2(centerx, centery);
}

function showElement(elem) {
    elem.style.display = "revert";
}

function hideElement(elem) {
    elem.style.display = "none";
}

function formatString(format, ...args) {
    // This won't work properly for more than 10 subsitutions, oh well.
    let ret = format;
    for (let i = 0; i < args.length; i++) {
        ret = ret.replaceAll("$" + i.toString(), args[i].toString());
    }
    ret = ret.replaceAll("$$", "$");
    return ret;
}

function errorAlert(error) {
    window.alert(error + "\n\n" + error.stack);
}

function getCookiesAsObj() {
    // WHY is document.cookie a string???
    // This doesn't handle url-encoding but I can't be bothered right now.
    let obj = {};
    let pairs = document.cookie.split("; ");
    for (let pairStr of pairs) {
        let pairArr = pairStr.split("=");
        let key = pairArr[0];
        let val = pairArr[1];
        obj[key] = val;
    }
    return obj;
}

function getCsrfToken() {
    let cookie = document.cookie;
    let startIdx = cookie.indexOf("csrftoken");
    let endIdx = cookie.indexOf("; ", startIdx);
    if (endIdx < 0)
        endIdx = cookie.length;
    let kvPair = cookie.substring(startIdx, endIdx).split("=");
    return kvPair[1];
}

async function apiGet(endpoint) {
    return fetch(formatString(API_URL_BASE, endpoint));
}

async function apiPost(endpoint, body) {
    return fetch(formatString(API_URL_BASE, endpoint), {
        method: "POST",
        body: JSON.stringify(body),
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            'X-CSRFToken': getCsrfToken(),
        }
    });
}

async function apiPut(endpoint, id, body) {
    return fetch(formatString(API_URL_BASE, endpoint + "/" + id), {
        method: "PUT",
        body: JSON.stringify(body),
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            'X-CSRFToken': getCsrfToken(),
        }
    });
}

async function fetchOnlineGame(gameId) {
    let response = await apiGet("games/" + gameId);
    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
    }
    return response.json();
}

function changeState(newState) {
    let oldState = currentUIState; // Get current state.
    
    if (typeof oldState !== "undefined")
        oldState.exit(); // Exit old state.
    newState.enter(); // Enter new state.

    currentUIState = newState;
}

// Base class for a UI state. Derived classes encapsulate state-specific behaviour and variables.
class UIState {
    eventAbortCon;

    enter() {
        this.eventAbortCon = new AbortController(); // AbortControllers are one time use only.
    }

    exit() {
        this.eventAbortCon.abort(); // Remove all event listeners attached upon exiting state.
    }

    // Utility function for derived classes to reuse. Wrapper around the standard event listener that automatically binds 'this'
    // to the state instance and provides the abort signal implicity.
    attachListener(target, eventName, listener) {
        target.addEventListener(eventName, listener.bind(this), {signal: this.eventAbortCon.signal})
    }
}

// Application-specific data structures.
// Composed with Game to store the ruleset.
class RulesData {
    diceMin = 1;
    diceMax = 6;
    playersMin = 1;
    playersMax = 4;

    constructor(diceMin, diceMax, playersMin, playersMax) {
        this.diceMin = diceMin;
        this.diceMax = diceMax;
        this.playersMin = playersMin;
        this.playersMax = playersMax;
    }

    static deserialize(data) {
        let dicemin = 1;
        let dicemax = 6;
        let minplr = 1;
        let maxplr = 4;

        // Replace defaults if rule exists.
        if (data.hasOwnProperty("diceMin"))
            dicemin = data.diceMin;
        if (data.hasOwnProperty("diceMax"))
            dicemax = data.diceMax;
        if (data.hasOwnProperty("playersMin"))
            minplr = data.playersMin;
        if (data.hasOwnProperty("playersMax"))
            maxplr = data.playersMax;

        return new RulesData(dicemin, dicemax, minplr, maxplr);
    }
}

// Composed with BoardSquare to represent an action to be performed upon a player landing a square.
class Action {
    type;
    parameters = [];

    constructor(type, ...parameters) {
        if (!strIsValidActionType(type))
            throw new TypeError("Invalid action type");
        this.type = type;
        this.parameters = parameters;
    }

    static deserialize(data) {
        return new Action(data.type, ...data.parameters)
    }
}

// Base class for objects that appear upon the board.
class BoardObject {
    color = "#000000";
    position = new Vector2(0, 0);
    board; // The board this object is associated with.
    element; // The div that represents this object visually.

    update() {
        this.element.style.left = this.position.x + "px";
        this.element.style.top = this.position.y + "px";
        this.element.style.setProperty("--color", this.color);
    }

    destroy() {
        this.element.remove();
    }
}

// Represents a square on the board.
class BoardSquare extends BoardObject {
    id = 0;
    label = "";
    action;
    nextId;
    prevId;

    constructor(board, id, label, color, position, action, nextId, prevId) {
        super();
        this.id = id;
        this.board = board;
        this.label = label;
        this.color = color;
        this.position = position;
        this.action = action;
        this.nextId = nextId;
        this.prevId = prevId;

        let elem = document.createElement("div");
        elem.id = "sq_".concat(id);
        elem.className = CLASS_BOARD_SQUARE;
        elem.textContent = label;
        elem.style.cssText = `top: ${position.y}px;
            left: ${position.x}px;
            --color: ${color}`;
        elem.setAttribute("data-square-id", id); // For finding Square from element.
        
        this.element = elem;
    }

    static deserialize(board, id, data) {
        let newPos = new Vector2(data.position.x, data.position.y);
        let newAction = Action.deserialize(data.action);
        return new BoardSquare(board, id, data.label, data.color, newPos, newAction, data.nextId, data.prevId);
    }

    serialize() {
        let data = {
            label: this.label,
            color: this.color,
            position: this.position,
            action: this.action,
            nextId: this.nextId,
            prevId: this.prevId,
        }
        return data;
    }

    update(label, color, action) {
        if (arguments.length > 0) {
            this.label = label;
            this.color = color;
            this.action = action;
        }
        super.update();
    }
}

// Represents a player and their token.
class Player extends BoardObject {
    name = "";
    squareId = "";
    score = 0;

    constructor(board, name, color, squareId) {
        super();
        this.board = board;
        this.name = name;
        this.color = color;
        this.squareId = squareId;

        let elem = document.createElement("div");
        elem.id = "tok_" + name;
        elem.className = CLASS_PLAYER_TOKEN;
        elem.style.cssText = `--color: ${color}`;
        this.element = elem;
        this.update();
    }

    static deserialize(board, data) {
        return new Player(board, data.name, data.color, data.squareId);
    }

    serialize() {
        let data = {
            name: this.name,
            color: this.color,
            squareId: this.squareId,
        }
        return data;
    }

    moveToSquare(squareId) {
        this.squareId = squareId;
        this.update();
    }

    update() {
        console.log("update tok");
        let sq = this.board.squares[this.squareId];
        let sqRect = sq.element.getBoundingClientRect();
        let tkRect = this.element.getBoundingClientRect();
        this.position = sq.position.add(new Vector2((sqRect.width / 2) - (tkRect.width / 2), 
                                        (sqRect.height / 2) - (tkRect.height / 2)));
        super.update();
    }
}

// Represents the game board.
class Board {
    squares = {};
    squareNextId = 0;
    size = new Vector2(20, 15);
    extraElements = [];
    div;

    constructor(div, size, squares, squareNextId) {
        this.div = div;
        this.size = size;
        this.squares = squares;
        this.squareNextId = squareNextId;
        this.rebuildLayout();
    }

    static deserialize(boardData, boardDiv) {
        let newSqs = {};
        let newBoard = new Board(boardDiv, boardData.size, null, boardData.squareNextId);
        // Create the actual objects from the seriziled form.
        for (let sqId in boardData.squares) {
            let a = boardData.squares[sqId];
            let sq = BoardSquare.deserialize(newBoard, sqId, a);
            newSqs[sqId] = sq;
        }
        newBoard.squares = newSqs;
        newBoard.rebuildLayout();
        return newBoard;
    }

    serialize() {
        let data = {};
        data.size = this.size;
        data.squareNextId = this.squareNextId;
        data.squares = {};
        for (let sqId in this.squares) {
            data.squares[sqId] = this.squares[sqId].serialize();
        }
        return data;
    }

    updateSize() {
        this.div.style = `width: ${this.size.x}cm; height: ${this.size.y}cm;`;
    }

    addExtraElement(elem) {
        this.extraElements.push(elem);
        this.div.appendChild(elem);
    }

    removeExtraElementAt(idx) {
        let exElem = this.extraElements[idx];
        this.extraElements.splice(idx, 1);
        this.div.replaceChildren(...this.extraElements);
    }

    rebuildLayout() {
        this.updateSize();
        this.div.replaceChildren();
        for (let sqId in this.squares) {
            let sq = this.squares[sqId];
            this.div.appendChild(sq.element);
        }
        for (let elem of this.extraElements) {
            this.div.appendChild(elem);
        }
        console.log("Rebuilt board DOM subtree.");
    }

    clearLayout() {
        // Clean away old board objects.
        for (let sqId in this.squares) {
            let sq = this.squares[sqId];
            sq.destroy();
        }
        for (const child of this.div.children) {
            child.remove();
        }
        this.squares = {};
        this.extraElements = [];
    }
}

// Represets a game.
class Game {
    id = 0;
    creatorId = 0;
    name = "";
    description = "";
    rules = new RulesData(1, 6, 1, 4);
    board;
    players = [];
    categories = [];

    constructor(id, creatorId, name, description, rules, board, categories) {
        this.id = id;
        this.creatorId = creatorId;
        this.name = name;
        this.description = description;
        this.rules = rules;
        this.board = board;
        this.categories = categories;

        board.game = this;
    }

    addPlayer(player) {
        this.players.push(player);
        this.board.addExtraElement(player.element);
    }

    removePlayer(player) {
        let idx = this.players.indexOf(player);
        if (idx < 0)
            return;

        this.players.splice(idx, 1);
        this.board.removeExtraElementAt(idx);
    }

    serialize() {
        let data = {};
        data.format_version = GAME_FORMAT_VERSION; // For later reference in case of format changes.
        data.id = this.id;
        data.name = this.name;
        data.description = this.description;
        data.rules = this.rules;
        data.board = this.board.serialize();
        data.players = [];
        for (let plr of this.players) {
            data.players.push(plr.serialize());
        }
        data.categories = this.categories;
        return data;
    }

    #convertData(data) {
        // Update older boards to the current format.
        switch (data.format_version) {
            case 1:
                data.rules = new RulesData(1, 6); // Add rules to older boards.
                for (let plr of data.players) {
                    plr.squareId = "0";
                }
                for (let sqId in data.squares) {
                    let a = data.squares[sqId];
                    a.prevId = ""; // TODO: Make this conversion better.
                }
                // Fallthrough
            case 2:
                data.board.size = new Vector2(20, 15);
                break;
            default:
                throw "unsupportedFormat"; // Error
                break;
        }
        return data;
    }

    deserialize(data, boardDiv) {
        if (data.format_version < GAME_FORMAT_VERSION) {
            try {
                data = this.#convertData(data); // Try to convert from older format.
            } catch {
                return false;
            }
        }
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.rules = RulesData.deserialize(data.rules);
        this.board = Board.deserialize(data.board, boardDiv);
        this.board.rebuildLayout();
        for (let plr of data.players) {
            let plrObj = Player.deserialize(this.board, plr)
            this.addPlayer(plrObj);
        }
        return true;
    }
}

// This is a hacky workaround for a broken Edge extension that is force-installed on the college computers hanging the app half the time.
if (DEBUG) {
    let inter = setInterval(() => {
        let brokenDiv = document.getElementById("reader-view");
        if (brokenDiv) {
            console.log("Trying to kill...");
            try {
                brokenDiv.remove();
                clearInterval(inter);
            }
            catch {
                console.log("Could not kill!");
            }
        }
    }, 100);
}