interface DigraphVertex {
    coord: Coord;
    inflow: Coord[];
    outflow: Coord[];
}
type Digraph = Map<string, DigraphVertex>;

let trafficDigraphForTest: Digraph = new Map();//for test

function createTrafficDigraph(lowerBound: number, upperBound: number, field: Field): Digraph {
    const digraph: Digraph = new Map();

    // とりあえず虚無の頂点リストを作る（埋まってないマスのみで構成）
    for (let y = lowerBound; y < upperBound; y++) {
        for (let x = 0; x < fieldWidth; x++) {
            const coord: Coord = { x, y };

            if (canEnter(coord, field, false))
                digraph.set(JSON.stringify(coord), { coord, inflow: [], outflow: [] });
        }
    }

    for (let y = lowerBound; y < upperBound; y++) {
        for (let x = 0; x < fieldWidth; x++) {
            const coord: Coord = { x, y };

            if (!canEnter(coord, field, false))
                continue
            //空中のマスは落ちるだけできる
            if (!canStand(coord, field, false)) {
                addArrow(digraph, coord, downCoord(coord));
                continue;
            }

            const left = checkLeft(coord, field, false);
            if (left !== null) addArrow(digraph, coord, left.coord);
            const right = checkRight(coord, field, false);
            if (right !== null) addArrow(digraph, coord, right.coord);
            const down = checkDown(coord, field, false);
            if (down !== null) addArrow(digraph, coord, down.coord);
            const up = checkUp(coord, field, false);
            if (up !== null) addArrow(digraph, coord, up.coord)
        }
    }
    return digraph;

    function addArrow(digraph: Digraph, from:Coord, to:Coord) {
        const fromVertex = digraph.get(JSON.stringify(from));
        const toVertex = digraph.get(JSON.stringify(to));

        // どちらかの頂点が範囲外なら無視
        if (fromVertex === undefined || toVertex === undefined)
            return;
        
        fromVertex.outflow.push(to);
        toVertex.inflow.push(from);
    }
}
function drawDigraphForTest(camera: Camera, screen: CanvasRenderingContext2D): void {//for test
    screen.fillStyle = "gray";
    trafficDigraphForTest.forEach((vertex: DigraphVertex): void => {
        vertex.outflow.forEach((to: Coord): void => {
            drawArrow(camera.offsetX + (vertex.coord.x + 0.5) * blockSize, camera.offsetY - (vertex.coord.y - 0.5) * blockSize,
                camera.offsetX + (to.x + 0.5) * blockSize, camera.offsetY - (to.y - 0.5) * blockSize);
        });
    });
    //alert("こんにちは")
    //camera.offsetX + coord.x * blockSize, camera.offsetY - coord.y * blockSize
    function drawArrow(startX: number, startY: number, endX: number, endY: number): void {
        const arrowX = endX - startX;
        const arrowY = endY - startY;
        const arrowL = Math.sqrt(arrowX * arrowX + arrowY * arrowY);
        const thicknessX = 3 * -arrowY / arrowL;
        const thicknessY = 3 * arrowX / arrowL;
        screen.beginPath();
        screen.moveTo(startX, startY);
        screen.lineTo(startX + thicknessX, startY + thicknessY);
        screen.lineTo(endX + thicknessX, endY + thicknessY);
        screen.fill();
    }
}