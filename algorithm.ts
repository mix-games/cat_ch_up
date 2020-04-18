type Digraph = Map<Coord, Coord[]>;

let trafficDigraphForTest: Digraph = new Map();//for test

function createTrafficDigraph(lowerBound: number, upperBound: number, field: Field): Digraph {
    const res: Digraph = new Map();

    for (let y = lowerBound; y < upperBound; y++) {
        for (let x = 0; x < fieldWidth; x++) {
            const currentCoord: Coord = { x, y };
            const outflow: Coord[] = [];

            //埋まってるマスはグラフに参加しない
            if (!canEnter(currentCoord, field, false))
                continue;
            //空中のマスは落ちるだけできる
            if (!canStand(currentCoord, field, false)) {
                res.set(currentCoord, [downCoord(currentCoord)]);
                continue;
            }

            const left = checkLeft(currentCoord, field, false);
            if (left !== null) outflow.push(left.coord);
            const right = checkRight(currentCoord, field, false);
            if (right !== null) outflow.push(right.coord);
            const down = checkDown(currentCoord, field, false);
            if (down !== null) outflow.push(down.coord);
            const up = checkUp(currentCoord, field, false);
            if (up !== null) outflow.push(up.coord);

            res.set(currentCoord, outflow);
        }
    }
    return res;
}
function drawDigraphForTest(camera: Camera, screen: CanvasRenderingContext2D): void {//for test
    screen.fillStyle = "gray";
    trafficDigraphForTest.forEach((ends: Coord[], start: Coord): void => {
        ends.forEach((end: Coord): void => {
            drawArrow(camera.offsetX + (start.x + 0.5) * blockSize, camera.offsetY - (start.y - 0.5) * blockSize,
                camera.offsetX + (end.x + 0.5) * blockSize, camera.offsetY - (end.y - 0.5) * blockSize);
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