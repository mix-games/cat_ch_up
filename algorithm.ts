let trafficDigraphForTest: Map<Coord, Coord[]> = new Map<Coord, Coord[]>();//for test
function createTrafficDigraph(lowerBound: number, upperBound: number, field: Field): Map<Coord, Coord[]>{
    const res: Map<Coord, Coord[]> = new Map<Coord, Coord[]>();
    for (let i = lowerBound; i < upperBound; i++) {
        for (let j = 0; j < fieldWidth; j++) {
            const fromIJ: Coord[] = [];
            const left = checkLeft({ x: j, y: i }, field, false);
            if (left != null) fromIJ.push(left.coord);
            const right = checkRight({ x: j, y: i }, field, false);
            if (right != null) fromIJ.push(right.coord);
            const down = checkDown({ x: j, y: i }, field, false);
            if (down != null) fromIJ.push(down.coord);
            const up = checkUp({ x: j, y: i }, field, false);
            if (up != null) fromIJ.push(up.coord);
            res.set({ x: j, y: i }, fromIJ);
        }
    }
    return res;
}
function drawDigraphForTest(camera: Camera, screen: CanvasRenderingContext2D): void{//for test
    screen.fillStyle = "gray";
    trafficDigraphForTest.forEach((ends: Coord[], start: Coord): void => {
        ends.forEach((end: Coord): void => {
            drawArrow(camera.offsetX + (start.x + 0.5) * blockSize, camera.offsetY - (start.y - 0.5) * blockSize,
                camera.offsetX + (end.x + 0.5) * blockSize, camera.offsetY - (end.y - 0.5) * blockSize)
        })
    })
    //alert("こんにちは")
    //camera.offsetX + coord.x * blockSize, camera.offsetY - coord.y * blockSize
    function drawArrow(startX: number, startY: number, endX: number, endY: number): void{
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