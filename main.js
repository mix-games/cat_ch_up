"use strict";
function resourceLoader(sources, callback = () => { }, progress = {
    registeredCount: 0,
    finishedCount: 0,
    imageResources: new Map(),
    audioResources: new Map()
}) {
    progress.registeredCount += sources.length;
    sources.forEach(source => {
        if (source.match(/\.(bmp|png|jpg)$/)) {
            const image = new Image();
            image.addEventListener('load', () => {
                progress.imageResources.set(source, image);
                progress.finishedCount++;
                if (progress.registeredCount === progress.finishedCount)
                    callback();
            }, false);
            image.addEventListener("error", () => {
                //こうしないとロードがいつまでも終わらないことになるので。本当はカウンターを分けるべき？
                progress.finishedCount++;
            });
            image.src = source;
        }
        else if (source.match(/\.(wav|ogg|mp3)$/)) {
            const audio = new Audio();
            audio.addEventListener('canplaythrough', () => {
                progress.audioResources.set(source, audio);
                progress.finishedCount++;
                if (progress.registeredCount === progress.finishedCount)
                    callback();
            }, false);
            audio.addEventListener("error", () => {
                progress.finishedCount++;
            });
            audio.src = source;
        }
        else
            throw new Error("unknown extension");
    });
    return progress;
}
function createRenderer(width, height) {
    const marginTop = 28;
    const marginLeft = 28;
    const marginRignt = 0;
    const marginBottom = 0;
    const lightColor = create2dScreen(marginLeft + width + marginRignt, marginTop + height + marginBottom);
    const shadowColor = create2dScreen(marginLeft + width + marginRignt, marginTop + height + marginBottom);
    const volumeLayers = [];
    for (let i = 0; i < 6; i++)
        volumeLayers.push(create2dScreen(marginLeft + width + marginRignt, marginTop + height + marginBottom));
    const shadowAccScreens = [];
    for (let i = 0; i < volumeLayers.length; i++)
        shadowAccScreens.push(create2dScreen(marginLeft + width + marginRignt, marginTop + height + marginBottom));
    const compositScreen = create2dScreen(width, height);
    return {
        lightColor,
        shadowColor,
        volumeLayers,
        compositScreen,
        shadowAccScreens,
        compositOffsetX: -marginLeft,
        compositOffsetY: -marginTop,
    };
    function create2dScreen(width, height) {
        let canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        let context = canvas.getContext("2d");
        if (context === null)
            throw new Error("failed to get 2D context");
        return context;
    }
}
function composit(renderer, mainScreen) {
    const shadowDirectionX = 3;
    const shadowDirectionY = 2;
    // shadowAccScreens[i]にはi-1層目に落ちる影を描画する
    for (let i = renderer.volumeLayers.length - 1; 0 <= i; i--) {
        renderer.shadowAccScreens[i].globalCompositeOperation = "source-over";
        renderer.shadowAccScreens[i].drawImage(renderer.volumeLayers[i].canvas, 0, 0);
        if (i !== renderer.volumeLayers.length - 1)
            renderer.shadowAccScreens[i].drawImage(renderer.shadowAccScreens[i + 1].canvas, shadowDirectionX, shadowDirectionY);
    }
    for (let i = 0; i < renderer.shadowAccScreens.length; i++) {
        //i-1層目の形で打ち抜く
        if (i !== 0) {
            renderer.shadowAccScreens[i].globalCompositeOperation = "source-in";
            renderer.shadowAccScreens[i].drawImage(renderer.volumeLayers[i - 1].canvas, -shadowDirectionY, -shadowDirectionY);
        }
        //compositに累積
        renderer.compositScreen.globalCompositeOperation = "source-over";
        renderer.compositScreen.drawImage(renderer.shadowAccScreens[i].canvas, renderer.compositOffsetX + shadowDirectionX, renderer.compositOffsetY + shadowDirectionY);
        //見えなくなる部分を隠す
        renderer.compositScreen.globalCompositeOperation = "destination-out";
        renderer.compositScreen.drawImage(renderer.volumeLayers[i].canvas, renderer.compositOffsetX, renderer.compositOffsetY);
    }
    // 影部分が不透明な状態になっているはずなので、影色で上書きする
    renderer.compositScreen.globalCompositeOperation = "source-atop";
    renderer.compositScreen.drawImage(renderer.shadowColor.canvas, renderer.compositOffsetX, renderer.compositOffsetY);
    // 残りの部分に光色
    renderer.compositScreen.globalCompositeOperation = "destination-over";
    renderer.compositScreen.drawImage(renderer.lightColor.canvas, renderer.compositOffsetX, renderer.compositOffsetY);
    // メインスクリーン（本番のcanvas）にスムージングなしで拡大
    mainScreen.imageSmoothingEnabled = false;
    mainScreen.clearRect(0, 0, mainScreen.canvas.width, mainScreen.canvas.height);
    mainScreen.drawImage(renderer.compositScreen.canvas, 0, 0, mainScreen.canvas.width, mainScreen.canvas.height);
    //次フレームの描画に備えてレイヤーを消去
    clearScreen(renderer.lightColor);
    clearScreen(renderer.shadowColor);
    for (var i = 0; i < renderer.volumeLayers.length; i++) {
        clearScreen(renderer.volumeLayers[i]);
        clearScreen(renderer.shadowAccScreens[i]);
    }
    clearScreen(renderer.compositScreen);
    function clearScreen(screen) {
        screen.clearRect(0, 0, screen.canvas.width, screen.canvas.height);
    }
}
// 四角を描画するテクスチャ
function createRectTexture(lightColor, width, height, offsetX, offsetY, shadowColor = lightColor) {
    return {
        draw: (x, y, renderer, resources) => {
            renderer.lightColor.fillStyle = lightColor;
            renderer.lightColor.fillRect(x + offsetX, y + offsetY, width, height);
            renderer.shadowColor.fillStyle = shadowColor;
            renderer.shadowColor.fillRect(x + offsetX, y + offsetY, width, height);
        }
    };
}
// ただの（アニメーションしない、影も落とさないし受けない）テクスチャを作る
function createStaticTexture(source, offsetX, offsetY) {
    return {
        draw: (x, y, renderer, resources) => {
            const image = resources.get(source);
            if (image === undefined) {
                console.log("not loaded yet");
                return;
            }
            renderer.lightColor.drawImage(image, offsetX + x, offsetY + y);
            renderer.shadowColor.drawImage(image, offsetX + x, offsetY + y);
        }
    };
}
function createStaticVolumeTexture(source, textureOffsetX, textureOffsetY, sh) {
    return {
        draw: (x, y, renderer, resources) => {
            const image = resources.get(source);
            if (image === undefined) {
                console.log("not loaded yet");
                return;
            }
            renderer.lightColor.drawImage(image, 0, 0, image.width, sh, textureOffsetX + x, textureOffsetY + y, image.width, sh);
            renderer.shadowColor.drawImage(image, 0, sh, image.width, sh, textureOffsetX + x, textureOffsetY + y, image.width, sh);
            for (var i = 0; i < renderer.volumeLayers.length; i++)
                renderer.volumeLayers[i].drawImage(image, 0, (i + 2) * sh, image.width, sh, textureOffsetX + x, textureOffsetY + y, image.width, sh);
        }
    };
}
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
function createField() {
    let field = {
        terrain: [],
        neko: createNeko()
    };
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
            return {
                collision: "ladder",
                texture: createRectTexture("red", blockSize, blockSize, 0, 0)
            };
        else if (bwt.collision === "solid")
            return {
                collision: "solid",
                texture: createRectTexture("black", blockSize, blockSize, 0, 0)
            };
        else
            return {
                collision: "air",
                texture: createRectTexture("white", blockSize, blockSize, 0, 0)
            };
    });
    field.terrain.push(row);
}
function getBlock(terrain, coord) {
    if (coord.y < 0 || coord.x < 0 || fieldWidth <= coord.x)
        return {
            collision: "solid",
            texture: createRectTexture("white", blockSize, blockSize, 0, 0)
        };
    return terrain[coord.y][coord.x];
}
function createPlayer() {
    return {
        coord: { x: 0, y: 0 },
        isSmall: false,
        texture: createRectTexture("yellow", blockSize - 4, blockSize * 2 - 4, 2, -blockSize + 4)
    };
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
    // 真上に留まれるなら登る？
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
            result = checkLeft(player.coord, field, player.isSmall);
            break;
        case "right":
            result = checkRight(player.coord, field, player.isSmall);
            break;
        case "up":
            result = checkUp(player.coord, field, player.isSmall);
            break;
        case "down":
            result = checkDown(player.coord, field, player.isSmall);
            break;
    }
    if (result === null)
        return null;
    // 立てる場所まで落とす
    while (!canStand(result.coord, field, player.isSmall)) {
        result.actionType = "drop";
        result.coord = downCoord(result.coord);
    }
    player.coord = result.coord;
    console.log(direction + " " + result.actionType);
    turn(field, player);
}
function turn(field, player) {
    //敵などのターン処理はここ
    controlNeko(field.neko, field, player);
    while (field.terrain.length - 5 < player.coord.y || field.terrain.length - 5 < field.neko.coord.y)
        generateRow(field);
}
function createNeko() {
    return {
        coord: { x: 0, y: 5 },
        texture: createRectTexture("blue", blockSize - 4, blockSize - 2, 2, 2)
    };
}
function controlNeko(neko, field, player) {
    neko.coord.x++;
}
function createCamera() {
    return {
        centerX: 80,
        centerY: -80,
        offsetX: 0,
        offsetY: 0,
    };
}
function updateCamera(camera, player, field, renderer) {
    /*
    const targetX = (player.coord.x + 0.5) * blockSize;
    const targetY = -(player.coord.y + 0.5) * blockSize;

    camera.centerX += (targetX - camera.centerX) * 0.2;
    camera.centerY += (targetY - camera.centerY) * 0.2;
    //*/
    camera.offsetX = renderer.lightColor.canvas.width / 2 - camera.centerX;
    camera.offsetY = renderer.lightColor.canvas.height / 2 - camera.centerY;
}
const blockSize = 16;
function drawBlock(block, coord, camera, renderer, imageResources) {
    block.texture.draw(camera.offsetX + coord.x * blockSize, camera.offsetY - coord.y * blockSize, renderer, imageResources);
}
function drawField(field, camera, renderer, imageResources) {
    field.terrain.forEach((row, y) => row.forEach((block, x) => drawBlock(block, { x, y }, camera, renderer, imageResources)));
}
function drawGameObject(gameObject, camera, renderer, imageResources) {
    gameObject.texture.draw(camera.offsetX + gameObject.coord.x * blockSize, camera.offsetY - gameObject.coord.y * blockSize, renderer, imageResources);
}
function animationLoop(field, player, camera, renderer, mainScreen, loadingProgress) {
    if (loadingProgress.registeredCount === loadingProgress.finishedCount) {
        updateCamera(camera, player, field, renderer);
        drawField(field, camera, renderer, loadingProgress.imageResources);
        drawGameObject(player, camera, renderer, loadingProgress.imageResources);
        drawGameObject(field.neko, camera, renderer, loadingProgress.imageResources);
        composit(renderer, mainScreen);
    }
    else {
        console.log("loading " + loadingProgress.finishedCount + "/" + loadingProgress.registeredCount);
        mainScreen.fillText("loading", 0, 0);
    }
    requestAnimationFrame(() => animationLoop(field, player, camera, renderer, mainScreen, loadingProgress));
}
window.onload = () => {
    const canvas = document.getElementById("canvas");
    if (canvas === null || !(canvas instanceof HTMLCanvasElement))
        throw new Error("canvas not found");
    const mainScreen = canvas.getContext("2d");
    if (mainScreen === null)
        throw new Error("context2d not found");
    const field = createField();
    const player = createPlayer();
    const camera = createCamera();
    const renderer = createRenderer(mainScreen.canvas.width / 2, mainScreen.canvas.height / 2);
    const loadingProgress = resourceLoader([]);
    /*
    canvas.addEventListener("click", (ev: MouseEvent) => {
        //const x = ev.clientX - canvas.offsetLeft;
        //const y = ev.clientY - canvas.offsetTop;
        player.coord.x += 1;
    }, false);
    */
    document.addEventListener("keydown", (event) => {
        // リピート（長押し時に繰り返し発火する）は無視
        if (event.repeat)
            return;
        if (event.code === "KeyA")
            player.coord.x--;
        if (event.code === "KeyD")
            player.coord.x++;
        if (event.code === "KeyW")
            player.coord.y++;
        if (event.code === "KeyS")
            player.coord.y--;
        if (event.code === "ArrowLeft")
            movePlayer(player, field, "left");
        if (event.code === "ArrowRight")
            movePlayer(player, field, "right");
        if (event.code === "ArrowUp")
            movePlayer(player, field, "up");
        if (event.code === "ArrowDown")
            movePlayer(player, field, "down");
        console.log(player.coord);
        console.log("canEnter: " + canEnter(player.coord, field, false));
        console.log("canStand: " + canStand(player.coord, field, false));
    }, false);
    animationLoop(field, player, camera, renderer, mainScreen, loadingProgress);
};
