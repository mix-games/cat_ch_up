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
const blockSize = 30;
function drawMap(context, map, offsetX, offsetY) {
    map.forEach((row, x) => row.forEach((block, y) => drawBlock(context, block, x, y)));
    function drawBlock(context, block, x, y) {
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
function drawPlayer(context, player, offsetX, offsetY) {
    context.fillStyle = 'yellow';
    context.fillRect(offsetX + player.position.x * blockSize + 5, offsetY - (player.position.y + 1) * blockSize + 10, blockSize - 10, blockSize * 2 - 10);
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
    let map = generateMap();
    drawMap(context, map, 0, 300);
    drawPlayer(context, { position: { x: 0, y: 0 } }, 0, 300);
};
