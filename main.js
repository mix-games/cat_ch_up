"use strict";
function upCoord(coord) {
    return { x: coord.x, y: coord.y + 1 };
}
function downCoord(coord) {
    return { x: coord.x, y: coord.y - 1 };
}
function leftCoord(coord) {
    return { x: coord.x - 1, y: coord.y };
}
function rightCoord(coord) {
    return { x: coord.x + 1, y: coord.y };
}
function initField() {
    let field = { terrain: [] };
    for (let i = 0; i < 10; i++)
        generateRow(field);
    return field;
}
const fieldWidth = 10;
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
function getBlock(terrain, coord) {
    if (coord.y < 0 || coord.x < 0 || fieldWidth <= coord.x)
        return { collision: "solid", texture: "plain" };
    return terrain[coord.y][coord.x];
}
//そこにプレイヤーが入るスペースがあるか判定。空中でもtrue
function canEnter(coord, field, isSmall) {
    if (isSmall)
        return getBlock(field.terrain, coord).collision !== "solid";
    return getBlock(field.terrain, coord).collision !== "solid"
        && getBlock(field.terrain, upCoord(coord)).collision !== "solid";
}
//その場に立てるか判定。上半身か下半身がはしごならtrue、足の下が空中だとfalse。スペースが無くてもfalse
function canStand(coord, field, isSmall) {
    if (!canEnter(coord, field, isSmall))
        return false;
    if (isSmall && getBlock(field.terrain, coord).collision === "ladder")
        return true;
    if (getBlock(field.terrain, coord).collision === "ladder"
        || getBlock(field.terrain, upCoord(coord)).collision === "ladder")
        return true;
    return getBlock(field.terrain, downCoord(coord)).collision === "solid";
}
function checkLeft(coord, field, isSmall) {
    // 左が空いているならそこ
    if (canEnter(leftCoord(coord), field, isSmall))
        return { coord: leftCoord(coord), actionType: "walk" };
    // 上がふさがってなくて左上が空いているならそこ
    if (canEnter(upCoord(coord), field, isSmall)
        && canEnter(leftCoord(upCoord(coord)), field, isSmall))
        return { coord: leftCoord(upCoord(coord)), actionType: "climb" };
    return null;
}
function checkRight(coord, field, isSmall) {
    // 右が空いているならそこ
    if (canEnter(rightCoord(coord), field, isSmall))
        return { coord: rightCoord(coord), actionType: "walk" };
    // 上がふさがってなくて右上が空いているならそこ
    if (canEnter(upCoord(coord), field, isSmall)
        && canEnter(rightCoord(upCoord(coord)), field, isSmall))
        return { coord: rightCoord(upCoord(coord)), actionType: "climb" };
    return null;
}
function checkUp(coord, field, isSmall) {
    // 真上に立てるなら登る？
    if (canStand(upCoord(coord), field, isSmall))
        return { coord: upCoord(coord), actionType: "climb" };
    return null;
}
function checkDown(coord, field, isSmall) {
    // 真下が空いてるなら（飛び）下りる？
    if (canEnter(downCoord(coord), field, isSmall))
        return { coord: downCoord(coord), actionType: "climb" };
    return null;
}
//プレイヤーを直接動かす。落とす処理もする。
function movePlayer(player, field, direction) {
    let result = null;
    switch (direction) {
        case "left":
            result = checkLeft(player.position, field, player.isSmall);
            break;
        case "right":
            result = checkRight(player.position, field, player.isSmall);
            break;
        case "up":
            result = checkUp(player.position, field, player.isSmall);
            break;
        case "down":
            result = checkDown(player.position, field, player.isSmall);
            break;
    }
    if (result === null)
        return null;
    // 立てる場所まで落とす
    while (!canStand(result.coord, field, player.isSmall)) {
        result.actionType = "drop";
        result.coord = downCoord(result.coord);
    }
    player.position = result.coord;
    console.log(direction + " " + result.actionType);
    //敵などのターン処理はここ
    while (field.terrain.length - 5 < player.position.y)
        generateRow(field);
}
const blockSize = 30;
function drawField(context, field, offsetX, offsetY) {
    field.terrain.forEach((row, y) => row.forEach((block, x) => drawBlock(context, block, x, y)));
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
function updateCamera(camera, player, field) {
    const targetX = (player.position.x + 0.5) * blockSize;
    const targetY = -(player.position.y + 0.5) * blockSize;
    camera.centerX += (targetX - camera.centerX) * 0.2;
    camera.centerY += (targetY - camera.centerY) * 0.2;
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
    const field = initField();
    const player = { position: { x: 0, y: 0 }, isSmall: false };
    const camera = { centerX: 150, centerY: -150 };
    /*
    canvas.addEventListener("click", (ev: MouseEvent) => {
        //const x = ev.clientX - canvas.offsetLeft;
        //const y = ev.clientY - canvas.offsetTop;
        player.position.x += 1;
    }, false);
    */
    document.addEventListener("keydown", (event) => {
        // リピート（長押し時に繰り返し発火する）は無視
        if (event.repeat)
            return;
        if (event.code === "KeyA")
            player.position.x--;
        if (event.code === "KeyD")
            player.position.x++;
        if (event.code === "KeyW")
            player.position.y++;
        if (event.code === "KeyS")
            player.position.y--;
        if (event.code === "ArrowLeft")
            movePlayer(player, field, "left");
        if (event.code === "ArrowRight")
            movePlayer(player, field, "right");
        if (event.code === "ArrowUp")
            movePlayer(player, field, "up");
        if (event.code === "ArrowDown")
            movePlayer(player, field, "down");
        console.log(player.position);
        console.log("canEnter: " + canEnter(player.position, field, false));
        console.log("canStand: " + canStand(player.position, field, false));
    }, false);
    animationLoop(context, canvas);
    function animationLoop(context, canvas) {
        //updateCamera(camera, player, field);
        const offsetX = canvas.width / 2 - camera.centerX;
        const offsetY = canvas.height / 2 - camera.centerY;
        context.clearRect(0, 0, canvas.width, canvas.height);
        drawField(context, field, offsetX, offsetY);
        drawPlayer(context, player, offsetX, offsetY);
        requestAnimationFrame(() => animationLoop(context, canvas));
    }
};
