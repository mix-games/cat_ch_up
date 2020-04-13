"use strict";
//Y座標は下から数える
function generateMap() {
    const map = [];
    for (let x = 0; x < 10; x++) {
        map.push([]);
        for (let y = 0; y < 10; y++) {
            if (Math.random() < 0.7)
                map[x][y] = { collision: "air" };
            else if (Math.random() < 0.5)
                map[x][y] = { collision: "solid" };
            else
                map[x][y] = { collision: "ladder" };
        }
    }
    return map;
}
function drawMap(context, map, offsetX, offsetY) {
    map.forEach((row, x) => row.forEach((block, y) => drawBlock(context, block, x, y)));
    function drawBlock(context, block, x, y) {
        const blockSize = 30;
        if (block.collision === "solid") {
            context.fillStyle = 'black';
            context.fillRect(offsetX + x * blockSize, offsetY - y * blockSize, blockSize, blockSize);
        }
        if (block.collision === "ladder") {
            context.fillStyle = 'red';
            context.fillRect(offsetX + x * blockSize, offsetY - y * blockSize, blockSize, blockSize);
        }
        if (block.collision === "air") {
            context.fillStyle = 'white';
            context.fillRect(offsetX + x * blockSize, offsetY - y * blockSize, blockSize, blockSize);
        }
    }
}
window.onload = () => {
    const canvas = document.getElementById("canvas");
    if (canvas === null || !(canvas instanceof HTMLCanvasElement)) {
        alert("canvas not found");
        return;
    }
    const context = canvas.getContext("2d");
    if (context === null) {
        alert("context2d not found");
        return;
    }
    canvas.addEventListener("click", (ev) => {
        const x = ev.clientX - canvas.offsetLeft;
        const y = ev.clientY - canvas.offsetTop;
    }, false);
    drawMap(context, generateMap(), 0, 300);
};
