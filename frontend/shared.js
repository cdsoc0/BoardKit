const CLASS_BOARD_SQUARE = "boardSquare";
const CLASS_PLAYER_TOKEN = "playerToken";
const ActionType = Object.freeze({
    GO_FORWARD: "goForward",
    JUMP_TO: "jumpTo",
    ANOTHER_TURN: "anotherTurn",
    END_GAME: "endGame",
});

class Vector2 {
    x = 0;
    y = 0;

    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

function colorIntToHex(colorInt) {
    return (colorInt).toString(16).padStart(6, '0');
}

class Action {
    type;
    parameters = [];

    constructor(type, ...parameters) {
        if (!ActionType.hasOwnProperty(type))
            throw new TypeError("Invalid action type");
        this.type = type;
        this.parameters = parameters;
    }
}

class BoardObject {
    color = 0;
    position = new Vector2(0, 0);
    element;

    update() {
        this.element.style.left = this.position.x + "px";
        this.element.style.top = this.position.y + "px";
    }

    destroy() {
        this.element.remove();
    }
}

class BoardSquare extends BoardObject {
    id = "";
    label = "";
    color = 0;
    position = new Vector2(0, 0);
    action = null;
    element;
    nextId;

    constructor(id, label, color, position, action, nextId) {
        super();
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
            background-color: #${colorIntToHex(color)}`;
        
        this.element = elem;
    } 
}

class Player extends BoardObject {
    name = "";
    color = 0;
    position = new Vector2(0, 0);
    score = 0;
    element;

    constructor(name, color, position) {
        super();
        this.name = name;
        this.color = color;
        this.position = position;

        let elem = document.createElement("div");
        elem.id = "tok_" + name;
        elem.className = CLASS_PLAYER_TOKEN;
        elem.style.cssText = `top: ${position.y}px;
            left: ${position.x}px;
            --color: #${colorIntToHex(color)}`;
        this.element = elem;
    }
}

class Board {
    name = "";
    squares = {};
    players = [new Player("foo", 0, new Vector2(10, 10))];
    div;

    constructor(name, div) {
        this.name = name;
        this.div = div;
    }

    load(name) {
        let boardJson = window.localStorage.getItem("board_" + name);
        this.clearLayout();
        if (boardJson !== null ) {
            let data = JSON.parse(boardJson);
            this.name = data.name;
            // Create the actual objects from the seriziled form.
            for (let sqId in data.squares) {
                let a = data.squares[sqId];
                let sq = new BoardSquare(sqId, a.label, a.color, a.position, a.action, a.nextId);
                this.squares[sqId] = sq;
            }
            for (let plr of data.players) {
                this.players.push(new Player(plr.name, plr.color, plr.position));
            }
            this.rebuildLayout(); // Update DOM
            //this.name = name;
            console.log("Loaded board.");
            return true;
        }
        return false;
    }

    rebuildLayout() {
        this.div.replaceChildren();
        for (let sqId in this.squares) {
            let sq = this.squares[sqId];
            this.div.appendChild(sq.element);
        }
        for (let pl of this.players) {
            this.div.appendChild(pl.element);
        }
        console.log("Rebuilt board DOM subtree.");
    }

    clearLayout() {
        for (let sqId in this.squares) {
            let sq = this.squares[sqId];
            sq.destroy();
        }
        for (let pl of this.players) {
            pl.destroy();
        }
        this.squares = {};
        this.players = [];
    }
}
