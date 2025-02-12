const CLASS_BOARD_SQUARE = "boardSquare";
const CLASS_PLAYER_TOKEN = "playerToken";
const BOARD_FORMAT_VERSION = 2;
const ActionType = Object.freeze({
    NONE: "none",
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

class RulesData {
    diceMin = 1;
    diceMax = 6;

    constructor(diceMin, diceMax) {
        this.diceMin = diceMin;
        this.diceMax = diceMax;
    }
}

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

class Action {
    type;
    parameters = [];

    constructor(type, ...parameters) {
        if (!strIsValidActionType(type))
            throw new TypeError("Invalid action type");
        this.type = type;
        this.parameters = parameters;
    }
}

class BoardObject {
    color = "#000000";
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
    id = 0;
    label = "";
    color = "#000000";
    position = new Vector2(0, 0);
    action = "none";
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
            background-color: ${color}`;
        
        this.element = elem;
    }

    static deserialize(id, data) {
        return new BoardSquare(id, data.label, data.color, data.position, data.action, data.nextId);
    }

    serialize() {
        let data = {
            id: this.id,
            label: this.label,
            color: this.color,
            position: this.position,
            action: this.action,
            nextId: this.nextId,
        }
        return data;
    }
}

class Player extends BoardObject {
    name = "";
    color = "#000000";
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
            --color: ${color}`;
        this.element = elem;
    }

    static deserialize(data) {
        return new Player(data.name, data.color, data.position);
    }

    serialize() {
        let data = {
            name: this.name,
            color: this.color,
            position: this.position,
        }
        return data;
    }
}

class Board {
    name = "";
    squares = {};
    squareNextId = 0;
    players = [new Player("foo", 0, new Vector2(10, 10))];
    rules = new RulesData(1, 6);
    div;

    constructor(name, div) {
        this.name = name;
        this.div = div;
        this.squareNextId = 0;
    }

    saveJson() {
        let data = {};
        data.formatVersion = BOARD_FORMAT_VERSION; // Just in case...
        data.name = this.name;
        data.rules = this.rules;
        data.squareNextId = this.squareNextId;
        data.squares = {};
        for (let sqId in this.squares) {
            data.squares[sqId] = this.squares[sqId].serialize();
        }
        data.players = [];
        for (let plr of this.players) {
            data.players.push(plr.serialize());
        }
        return JSON.stringify(data);
    }

    static #convertData(data) {
        // Update older boards to the current format.
        switch (data.formatVersion) {
            case 1:
                data.rules = new RulesData(1, 6); // Add rules to older boards.
                break;
            default:
                throw "unsupportedFormat"; // Error
                break;
        }
        return data;
    }

    loadJson(json) {
        let data;
        try {
            data = JSON.parse(json);
        } catch {
            return false;
        }
        if (data !== null && data !== undefined) {
            if (data.formatVersion < BOARD_FORMAT_VERSION) {
                try {
                    data = Board.#convertData(data); // Try to convert from older format.
                } catch {
                    return false;
                }
            }

            this.clearLayout();
            this.name = data.name;
            this.squareNextId = data.squareNextId;
            this.rules = data.rules;
            // Create the actual objects from the seriziled form.
            for (let sqId in data.squares) {
                let a = data.squares[sqId];
                let sq = BoardSquare.deserialize(sqId, a);
                this.squares[sqId] = sq;
            }
            for (let plr of data.players) {
                this.players.push(Player.deserialize(plr));
            }
            this.rebuildLayout(); // Update DOM
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
