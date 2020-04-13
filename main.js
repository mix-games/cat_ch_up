"use strict";
function generateMap() {
    let map = [];
    for (let i = 0; i < 10; i++)
        map = generateRow(map);
    return map;
}
//Y座標は下から数える
function generateRow(map) {
    const row = [];
    for (let y = 0; y < 10; y++) {
        if (Math.random() < 0.7)
            row[y] = { collision: "air" };
        else if (Math.random() < 0.5)
            row[y] = { collision: "solid" };
        else
            row[y] = { collision: "ladder" };
    }
    return [...map, row];
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
