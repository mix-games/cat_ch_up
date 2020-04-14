"use strict";
function initField() {
    let field = { terrain: [] };
    for (let i = 0; i < 10; i++)
        generateRow(field);
    return field;
}
//Y座標は下から数える
function generateRow(field) {
    const protoRow = [];
    for (let x = 0; x < 10; x++) {
        if (Math.random() < 0.7)
            protoRow[x] = { collision: "air" };
        else if (Math.random() < 0.5)
            protoRow[x] = { collision: "solid" };
        else
            protoRow[x] = { collision: "ladder" };
    }
    const row = protoRow.map((bwt) => {
        if (bwt.collision === "ladder")
            return { collision: "ladder", texture: "ladder" };
        else if (bwt.collision === "solid")
            return { collision: "solid", texture: "condenser" };
        else
            return { collision: "air", texture: "plain" };
    });
    field.terrain.push(row);
}
const blockSize = 30;
function drawField(context, field, offsetX, offsetY) {
    field.terrain.forEach((row, x) => row.forEach((block, y) => drawBlock(context, block, x, y)));
    function drawBlock(context, block, x, y) {
        if (block.texture === "ladder") {
            context.fillStyle = 'red';
            context.fillRect(offsetX + x * blockSize, offsetY - y * blockSize, blockSize, blockSize);
        }
        else if (block.texture === "condenser") {
            context.fillStyle = 'black';
            context.fillRect(offsetX + x * blockSize, offsetY - y * blockSize, blockSize, blockSize);
        }
        else /*if (block.texture === "plain")*/ {
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
    let field = initField();
    let player = { position: { x: 0, y: 0 } };
    canvas.addEventListener("click", (ev) => {
        //const x = ev.clientX - canvas.offsetLeft;
        //const y = ev.clientY - canvas.offsetTop;
        player.position.x += 1;
    }, false);
    animationLoop(context);
    function animationLoop(context) {
        drawField(context, field, 0, 300);
        drawPlayer(context, player, 0, 300);
        requestAnimationFrame(() => animationLoop(context));
    }
};
