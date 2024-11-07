const CLASS_BOARD_SQUARE = "boardSquare"

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
        
        this.element = elem;
    }

    update() {
        this.element.style.left = this.position.x + "px";
        this.element.style.top = this.position.y + "px";
    }

    destroy() {
        this.element.remove();
    }
}

class Board {
    layout = {};
    div;

    constructor(div) {
        this.div = div;
    }

    loadLayout(name) {
        let layoutJson = window.localStorage.getItem("boardLayout_" + name);
        this.clearLayout();
        if (layoutJson !== null ) {
            let rawLayout = JSON.parse(layoutJson);
            for (let sqId in rawLayout) {
                let a = rawLayout[sqId];
                let sq = new BoardSquare(sqId, a.label, a.color, a.position, a.action, a.nextId);
                this.layout[sqId] = sq;
            }
            this.rebuildLayout();
            console.log("Loaded board.");
            return true;
        }
        return false;
    }

    rebuildLayout() {
        this.div.replaceChildren();
        for (let sqId in this.layout) {
            let sq = this.layout[sqId];
            this.div.appendChild(sq.element);
        }
        console.log("Rebuilt board DOM subtree.");
    }

    clearLayout() {
        for (let sqId in this.layout) {
            let sq = this.layout[sqId];
            sq.destroy();
        }
        this.layout = {};
    }
}
