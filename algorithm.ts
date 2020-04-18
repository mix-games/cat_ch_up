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
function drawDigraphForTest(camera: Camera, mainScreen: CanvasRenderingContext2D): void{//for test
    mainScreen.fillStyle = "gray";
    trafficDigraphForTest.forEach((ends: Coord[], start: Coord): void => {
        ends.forEach((end: Coord): void => {
            drawArrow(camera.offsetX + start.x * blockSize, camera.offsetY - start.y * blockSize,
                camera.offsetX + end.x * blockSize, camera.offsetY - end.y * blockSize)
        })
    })
    alert("こんにちは")
    //camera.offsetX + coord.x * blockSize, camera.offsetY - coord.y * blockSize
    function drawArrow(startX: number, startY: number, endX: number, endY: number): void{
        const arrowX = endX - startX;
        const arrowY = endY - startY;
        const arrowL = Math.sqrt(arrowX * arrowX + arrowY * arrowY);
        const thicknessX = 2 * -arrowY / arrowL;
        const thicknessY = 2 * arrowX / arrowL;
        mainScreen.beginPath();
        mainScreen.moveTo(startX, startY);
        mainScreen.lineTo(startX + thicknessX, startY + thicknessY);
        mainScreen.lineTo(endX + thicknessX, endY + thicknessY);
        mainScreen.fill();
    }
}