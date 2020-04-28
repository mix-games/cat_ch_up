"use strict";
function createCoord(x, y) {
    return { x, y };
}
function upCoord(coord) {
    return createCoord(coord.x, coord.y + 1);
}
function downCoord(coord) {
    return createCoord(coord.x, coord.y - 1);
}
function leftCoord(coord) {
    return createCoord(coord.x - 1, coord.y);
}
function rightCoord(coord) {
    return createCoord(coord.x + 1, coord.y);
}
const blockSize = 24;
function loadResources() {
    const progress = {
        registeredCount: 0,
        finishedCount: 0,
        errorCount: 0,
        isFinished: function () {
            return this.registeredCount === this.finishedCount + this.errorCount;
        },
        rate: function () {
            return (this.finishedCount + this.errorCount) / this.registeredCount;
        }
    };
    return {
        _progress: progress,
        testAnimation: loadAnimationTexture("test.png", 32, 32, 0, 0, false, [30, 60, 90, 120, 150, 180, 210, 240], true, 0),
        background_texture: loadStaticTexture("image/background.png", 400, 400, 200, 200, false, 0),
        terrain_wall_texture: loadStaticTexture("image/terrain/wall.png", 24, 24, 10, 0, true, 0),
        terrain_ladder_texture: loadStaticTexture("image/terrain/ladder.png", 24, 24, 11, 0, true, 0),
        terrain_condenser_texture: loadAnimationTexture("image/terrain/condenser.png", 36, 24, 13, 0, true, [30, 60, 90], true, 0),
        player_wait_texture: loadStaticTexture("image/player/wait.png", 24, 48, 12, 24, true, 3),
        player_walk_left_texture: loadAnimationTexture("image/player/walk_left.png", 48, 48, 12, 24, true, [30, 60, 90, 120], false, 3),
        player_walk_right_texture: loadAnimationTexture("image/player/walk_right.png", 48, 48, 36, 24, true, [30, 60, 90, 120], false, 3),
    };
    function loadImage(source, onload = () => { }) {
        const image = new Image();
        progress.registeredCount++;
        image.addEventListener('load', () => {
            progress.finishedCount++;
            onload();
        }, false);
        image.addEventListener("error", () => {
            progress.errorCount++;
        });
        image.src = source;
        return image;
    }
    function loadAudio(source, onload = () => { }) {
        const audio = new Audio();
        audio.addEventListener('canplaythrough', () => {
            progress.finishedCount++;
            onload();
        }, false);
        audio.addEventListener("error", () => {
            progress.errorCount++;
        });
        audio.src = source;
        return audio;
    }
    function loadStaticTexture(source, width, height, offsetX, offsetY, useShadowColor, depthOffset) {
        return loadAnimationTexture(source, width, height, offsetX, offsetY, useShadowColor, [], false, depthOffset);
    }
    function loadAnimationTexture(source, width, height, offsetX, offsetY, useShadowColor, timeline, loop, depthOffset) {
        const lightColor = document.createElement("canvas");
        const shadowColor = document.createElement("canvas");
        const texture = {
            type: "image",
            lightColor: lightColor,
            shadowColor: shadowColor,
            offsetX,
            offsetY,
            width,
            height,
            depth: 0,
            timeline,
            animationTimestamp: new Date().getTime(),
            loop,
            depthOffset,
        };
        const image = loadImage(source, () => {
            const lightColorScreen = lightColor.getContext("2d");
            if (lightColorScreen === null)
                throw new Error("failed to get context-2d");
            const shadowColorScreen = shadowColor.getContext("2d");
            if (shadowColorScreen === null)
                throw new Error("failed to get context-2d");
            lightColor.width = image.width;
            lightColor.height = useShadowColor ? (image.height - height) : image.height;
            shadowColor.width = image.width;
            shadowColor.height = useShadowColor ? (image.height - height) : image.height;
            texture.depth = Math.floor(image.height / height - (useShadowColor ? 2 : 1));
            lightColorScreen.drawImage(image, 0, 0, image.width, height, 0, 0, image.width, height);
            lightColorScreen.drawImage(image, 0, useShadowColor ? (height * 2) : height, image.width, useShadowColor ? (image.height - height * 2) : (image.height - height), 0, height, image.width, useShadowColor ? (image.height - height * 2) : (image.height - height));
            lightColorScreen.globalCompositeOperation = "source-atop";
            for (var i = 0; i < texture.depth; i++) {
                lightColorScreen.drawImage(image, 0, 0, image.width, height, 0, height * (i + 1), image.width, height);
            }
            shadowColorScreen.drawImage(image, 0, useShadowColor ? height : 0, image.width, height, 0, 0, image.width, height);
            shadowColorScreen.drawImage(image, 0, height * 2, image.width, useShadowColor ? (image.height - height * 2) : (image.height - height), 0, height, image.width, useShadowColor ? (image.height - height * 2) : (image.height - height));
            shadowColorScreen.globalCompositeOperation = "source-atop";
            for (var i = 0; i < texture.depth; i++) {
                shadowColorScreen.drawImage(image, 0, height, image.width, height, 0, height * (i + 1), image.width, height);
            }
        });
        return texture;
    }
}
function createEmptyTexture() {
    return {
        type: "empty"
    };
}
function createRectTexture(color, width, height, offsetX, offsetY) {
    return {
        type: "rect",
        color,
        width,
        height,
        offsetX,
        offsetY,
    };
}
function cloneAndReplayTexture(texture) {
    if (texture.type === "image") {
        return Object.assign(Object.assign({}, texture), { animationTimestamp: new Date().getTime() });
    }
    // いちおうコピーするけど意味なさそう
    else
        return Object.assign({}, texture);
}
function drawTexture(texture, x, y, renderer) {
    if (texture.type === "rect") {
        renderer.lightColor.fillStyle = texture.color;
        renderer.lightColor.fillRect(renderer.marginLeft + x - texture.offsetX, renderer.marginTop + y - texture.offsetY, texture.width, texture.height);
        renderer.shadowColor.fillStyle = texture.color;
        renderer.shadowColor.fillRect(renderer.marginLeft + x - texture.offsetX, renderer.marginTop + y - texture.offsetY, texture.width, texture.height);
    }
    if (texture.type === "image") {
        const elapse = new Date().getTime() - texture.animationTimestamp;
        const phase = texture.loop ? elapse % texture.timeline[texture.timeline.length - 1] : elapse;
        let frame = texture.timeline.findIndex(t => phase < t);
        if (frame === -1)
            frame = Math.max(0, texture.timeline.length - 1);
        renderer.lightColor.drawImage(texture.lightColor, texture.width * frame, // アニメーションによる横位置
        0, texture.width, texture.height, renderer.marginLeft + x - texture.offsetX, renderer.marginTop + y - texture.offsetY, texture.width, texture.height);
        renderer.shadowColor.drawImage(texture.shadowColor, texture.width * frame, // アニメーションによる横位置
        0, texture.width, texture.height, renderer.marginLeft + x - texture.offsetX, renderer.marginTop + y - texture.offsetY, texture.width, texture.height);
        for (let i = 0; i < texture.depth; i++) {
            renderer.lightLayers[i + texture.depthOffset].drawImage(texture.lightColor, texture.width * frame, // アニメーションによる横位置
            (i + 1) * texture.height, // （色を除いて）上からi枚目の画像
            texture.width, texture.height, renderer.marginLeft + x - texture.offsetX, renderer.marginTop + y - texture.offsetY, texture.width, texture.height);
            renderer.shadowLayers[i + texture.depthOffset].drawImage(texture.shadowColor, texture.width * frame, // アニメーションによる横位置
            (i + 1) * texture.height, // （色を除いて）上からi枚目の画像
            texture.width, texture.height, renderer.marginLeft + x - texture.offsetX, renderer.marginTop + y - texture.offsetY, texture.width, texture.height);
        }
    }
}
const resources = loadResources();
/// <reference path="./resources.ts" />
/// <reference path="./coord.ts" />
/// <reference path="./gameobject.ts" />
function createField() {
    const protoTerrain = [[], []];
    for (let x = 0; x < fieldWidth; x++) {
        if (Math.random() < 0.7)
            protoTerrain[0][x] = { collision: "air" };
        else
            protoTerrain[0][x] = { collision: "ladder" };
    }
    for (let x = 0; x < fieldWidth; x++) {
        if (protoTerrain[0][x].collision === "ladder")
            protoTerrain[1][x] = { collision: "ladder" };
        else
            protoTerrain[1][x] = { collision: "air" };
    }
    let field = {
        terrain: protoTerrain.map((protoRow) => assignTexture(protoRow)),
        neko: createNeko(),
        backgroundTexture: resources.background_texture
    };
    for (let i = 0; i < 10; i++)
        generateRow(field);
    return field;
}
const fieldWidth = 10;
//Y座標は下から数える
function generateRow(field) {
    const protoRow = [];
    for (let x = 0; x < fieldWidth; x++) {
        if (Math.random() < 0.7)
            protoRow[x] = { collision: "air" };
        else if (Math.random() < 0.5)
            protoRow[x] = { collision: "solid" };
        else
            protoRow[x] = { collision: "ladder" };
    }
    field.terrain.push(assignTexture(protoRow));
}
function assignTexture(protoRow) {
    return protoRow.map((bwt) => {
        switch (bwt.collision) {
            case "ladder":
                return {
                    collision: "ladder",
                    texture0: cloneAndReplayTexture(resources.terrain_wall_texture),
                    texture1: cloneAndReplayTexture(resources.terrain_ladder_texture),
                };
            case "solid":
                return {
                    collision: "solid",
                    texture0: cloneAndReplayTexture(resources.terrain_wall_texture),
                    texture1: cloneAndReplayTexture(resources.terrain_condenser_texture),
                };
            case "air":
                return {
                    collision: "air",
                    texture0: cloneAndReplayTexture(resources.terrain_wall_texture),
                    texture1: createEmptyTexture()
                };
        }
    });
}
function getBlock(terrain, coord) {
    if (terrain.length <= coord.y)
        throw new Error("The accessed row has not been generated. coord:" + JSON.stringify(coord));
    if (coord.y < 0 || coord.x < 0 || fieldWidth <= coord.x)
        return {
            collision: "solid",
            texture0: createEmptyTexture(),
            texture1: createEmptyTexture()
        };
    return terrain[coord.y][coord.x];
}
function drawField(field, camera, renderer) {
    drawTexture(field.backgroundTexture, renderer.width / 2, renderer.height / 2, renderer);
    const xRange = Math.ceil(renderer.width / blockSize / 2);
    const yRange = Math.ceil(renderer.height / blockSize / 2);
    const x1 = Math.floor(camera.centerX / blockSize) - xRange;
    const x2 = Math.ceil(camera.centerX / blockSize) + xRange;
    const y1 = Math.floor(-camera.centerY / blockSize) - yRange;
    const y2 = Math.ceil(-camera.centerY / blockSize) + yRange;
    for (var x = x1; x <= x2; x++) {
        for (var y = y1; y <= y2; y++) {
            if (field.terrain.length <= y)
                continue;
            const coord = createCoord(x, y);
            drawTexture(getBlock(field.terrain, coord).texture0, camera.offsetX + coord.x * blockSize, camera.offsetY - coord.y * blockSize, renderer);
        }
    }
    for (var x = x1; x <= x2; x++) {
        for (var y = y1; y <= y2; y++) {
            if (field.terrain.length <= y)
                continue;
            const coord = createCoord(x, y);
            drawTexture(getBlock(field.terrain, coord).texture1, camera.offsetX + coord.x * blockSize, camera.offsetY - coord.y * blockSize, renderer);
        }
    }
    // デバッグ用の赤い点
    //*
    for (var x = x1; x <= x2; x++) {
        for (var y = y1; y <= y2; y++) {
            if (field.terrain.length <= y)
                continue;
            const coord = createCoord(x, y);
            drawTexture(createRectTexture("red", 1, 1, 0, 0), camera.offsetX + coord.x * blockSize, camera.offsetY - coord.y * blockSize, renderer);
        }
    } //*/
    drawGameObject(field.neko, camera, renderer);
}
/// <reference path="./resources.ts" />
/// <reference path="./coord.ts" />
/// <reference path="./field.ts" />
function createPlayer() {
    return {
        coord: createCoord(0, 0),
        isSmall: false,
        texture: cloneAndReplayTexture(resources.player_wait_texture),
    };
}
//そこにプレイヤーが入るスペースがあるか判定。空中でもtrue
function canEnter(coord, terrain, isSmall) {
    if (isSmall)
        return getBlock(terrain, coord).collision !== "solid";
    return getBlock(terrain, coord).collision !== "solid"
        && getBlock(terrain, upCoord(coord)).collision !== "solid";
}
//その場に立てるか判定。上半身か下半身、足の下がはしごならtrue、足の下が空中だとfalse。スペースが無くてもfalse
function canStand(coord, terrain, isSmall) {
    if (!canEnter(coord, terrain, isSmall))
        return false;
    if (isSmall && getBlock(terrain, coord).collision === "ladder")
        return true;
    if (getBlock(terrain, coord).collision === "ladder"
        || getBlock(terrain, upCoord(coord)).collision === "ladder"
        || getBlock(terrain, downCoord(coord)).collision === "ladder")
        return true;
    return getBlock(terrain, downCoord(coord)).collision === "solid";
}
function checkLeft(coord, terrain, isSmall) {
    // 左が空いているならそこ
    if (canEnter(leftCoord(coord), terrain, isSmall))
        return { coord: leftCoord(coord), actionType: "walk", texture: resources.player_walk_left_texture };
    // 上がふさがってなくて左上が空いているならそこ
    if (canEnter(upCoord(coord), terrain, isSmall)
        && canEnter(leftCoord(upCoord(coord)), terrain, isSmall))
        return { coord: leftCoord(upCoord(coord)), actionType: "climb", texture: resources.player_walk_left_texture };
    return null;
}
function checkRight(coord, terrain, isSmall) {
    // 右が空いているならそこ
    if (canEnter(rightCoord(coord), terrain, isSmall))
        return { coord: rightCoord(coord), actionType: "walk", texture: resources.player_walk_right_texture };
    // 上がふさがってなくて右上が空いているならそこ
    if (canEnter(upCoord(coord), terrain, isSmall)
        && canEnter(rightCoord(upCoord(coord)), terrain, isSmall))
        return { coord: rightCoord(upCoord(coord)), actionType: "climb", texture: resources.player_walk_right_texture };
    return null;
}
function checkUp(coord, terrain, isSmall) {
    // 下半身か上半身が梯子で、かつ真上に留まれるなら登る？
    if ((getBlock(terrain, coord).collision === "ladder" ||
        getBlock(terrain, upCoord(coord)).collision === "ladder") &&
        canStand(upCoord(coord), terrain, isSmall))
        return { coord: upCoord(coord), actionType: "climb", texture: resources.player_wait_texture };
    return null;
}
function checkDown(coord, terrain, isSmall) {
    // 真下が空いてるなら（飛び）下りる？
    if (canEnter(downCoord(coord), terrain, isSmall))
        return { coord: downCoord(coord), actionType: "climb", texture: resources.player_wait_texture };
    return null;
}
//プレイヤーを直接動かす。落とす処理もする。
function movePlayer(player, field, direction) {
    let result = null;
    switch (direction) {
        case "left":
            result = checkLeft(player.coord, field.terrain, player.isSmall);
            break;
        case "right":
            result = checkRight(player.coord, field.terrain, player.isSmall);
            break;
        case "up":
            result = checkUp(player.coord, field.terrain, player.isSmall);
            break;
        case "down":
            result = checkDown(player.coord, field.terrain, player.isSmall);
            break;
    }
    if (result === null)
        return null;
    // 立てる場所まで落とす
    while (!canStand(result.coord, field.terrain, player.isSmall)) {
        result.actionType = "drop";
        result.coord = downCoord(result.coord);
    }
    player.coord = result.coord;
    player.texture = cloneAndReplayTexture(result.texture);
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
        coord: createCoord(0, 5),
        texture: createRectTexture("blue", blockSize - 4, blockSize - 2, blockSize / 2 - 2, -2)
    };
}
function controlNeko(neko, field, player) {
    neko.coord = rightCoord(neko.coord);
}
function drawGameObject(gameObject, camera, renderer) {
    drawTexture(gameObject.texture, camera.offsetX + gameObject.coord.x * blockSize, camera.offsetY - gameObject.coord.y * blockSize, renderer);
}
function createRenderer(width, height) {
    const marginTop = 28;
    const marginLeft = 28;
    const marginRignt = 0;
    const marginBottom = 0;
    const layerNum = 6;
    const lightColor = create2dScreen(marginLeft + width + marginRignt, marginTop + height + marginBottom);
    const shadowColor = create2dScreen(marginLeft + width + marginRignt, marginTop + height + marginBottom);
    const lightLayers = [];
    for (let i = 0; i < layerNum; i++)
        lightLayers.push(create2dScreen(marginLeft + width + marginRignt, marginTop + height + marginBottom));
    const shadowLayers = [];
    for (let i = 0; i < layerNum; i++)
        shadowLayers.push(create2dScreen(marginLeft + width + marginRignt, marginTop + height + marginBottom));
    const compositScreen = create2dScreen(width, height);
    return {
        lightColor,
        shadowColor,
        lightLayers,
        shadowLayers,
        layerNum,
        compositScreen,
        marginLeft,
        marginTop,
        width,
        height,
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
    const shadowDirectionX = 2;
    const shadowDirectionY = 3;
    for (let i = 0; i < renderer.layerNum; i++)
        renderer.lightColor.drawImage(renderer.lightLayers[i].canvas, 0, 0);
    for (let i = 0; i < renderer.layerNum; i++)
        renderer.shadowColor.drawImage(renderer.shadowLayers[i].canvas, 0, 0);
    // shadowLayersを斜め累積
    for (let i = renderer.layerNum - 2; 0 <= i; i--) {
        renderer.shadowLayers[i].drawImage(renderer.shadowLayers[i + 1].canvas, shadowDirectionX, shadowDirectionY);
    }
    for (let i = 0; i < renderer.layerNum; i++) {
        //i-1層目の形で打ち抜く
        if (i !== 0) {
            renderer.shadowLayers[i].globalCompositeOperation = "source-in";
            renderer.shadowLayers[i].drawImage(renderer.lightLayers[i - 1].canvas, -shadowDirectionX, -shadowDirectionY);
        }
        //compositに累積
        renderer.compositScreen.globalCompositeOperation = "source-over";
        renderer.compositScreen.drawImage(renderer.shadowLayers[i].canvas, -renderer.marginLeft + shadowDirectionX, -renderer.marginTop + shadowDirectionY);
        //見えなくなる部分を隠す
        renderer.compositScreen.globalCompositeOperation = "destination-out";
        renderer.compositScreen.drawImage(renderer.lightLayers[i].canvas, -renderer.marginLeft, -renderer.marginTop);
    }
    // 影部分が不透明な状態になっているはずなので、影色で上書きする
    renderer.compositScreen.globalCompositeOperation = "source-atop";
    renderer.compositScreen.drawImage(renderer.shadowColor.canvas, -renderer.marginLeft, -renderer.marginTop);
    // 残りの部分に光色
    renderer.compositScreen.globalCompositeOperation = "destination-over";
    renderer.compositScreen.drawImage(renderer.lightColor.canvas, -renderer.marginLeft, -renderer.marginTop);
    // メインスクリーン（本番のcanvas）にスムージングなしで拡大
    mainScreen.imageSmoothingEnabled = false;
    mainScreen.clearRect(0, 0, mainScreen.canvas.width, mainScreen.canvas.height);
    mainScreen.drawImage(renderer.compositScreen.canvas, 0, 0, mainScreen.canvas.width, mainScreen.canvas.height);
    //次フレームの描画に備えてレイヤーを消去
    clearScreen(renderer.lightColor);
    clearScreen(renderer.shadowColor);
    for (var i = 0; i < renderer.layerNum; i++) {
        clearScreen(renderer.lightLayers[i]);
        clearScreen(renderer.shadowLayers[i]);
    }
    clearScreen(renderer.compositScreen);
    function clearScreen(screen) {
        screen.clearRect(0, 0, screen.canvas.width, screen.canvas.height);
        screen.globalCompositeOperation = "source-over";
    }
}
/// <reference path="./coord.ts" />
/// <reference path="./gameobject.ts" />
/// <reference path="./field.ts" />
/// <reference path="./renderer.ts" />
function createCamera() {
    const clearanceX = 4;
    const clearanceY = 2;
    const initialY = 4;
    return {
        // ヒステリシスゆとり幅
        clearanceX,
        clearanceY,
        initialY,
        // カメラ中心の移動目標マス
        coord: createCoord(clearanceX, clearanceY),
        // カメラ中心のスクリーン座標(移動アニメーション折り込み)
        centerX: clearanceX * blockSize,
        centerY: -initialY * blockSize,
        // カメラの移動速度
        velocityX: 0,
        velocityY: 0,
        // 描画用オフセット（スクリーン左上座標）
        offsetX: 0,
        offsetY: 0,
    };
}
function updateCamera(camera, player, field, renderer) {
    camera.coord = createCoord(Math.max(player.coord.x - camera.clearanceX, Math.min(player.coord.x + camera.clearanceX, camera.coord.x)), Math.max(camera.initialY, Math.max(player.coord.y - camera.clearanceY, Math.min(player.coord.y + camera.clearanceY, camera.coord.y))));
    const targetX = camera.coord.x * blockSize;
    const targetY = -camera.coord.y * blockSize;
    const smooth = 0.9; // 1フレームあたりの減衰比(0～1の無次元値)
    const accel = 1; // 1フレームあたりの速度変化
    camera.velocityX =
        Math.max(camera.velocityX * smooth - accel, Math.min(camera.velocityX * smooth + accel, // 減衰後の速度から±accellの範囲にのみ速度を更新できる
        ((targetX - camera.centerX) * (1 - smooth)))); //この速度にしておけば公比smoothの無限級数がtargetXに収束する
    camera.velocityY =
        Math.max(camera.velocityY * smooth - accel, Math.min(camera.velocityY * smooth + accel, ((targetY - camera.centerY) * (1 - smooth))));
    camera.centerX += camera.velocityX;
    camera.centerY += camera.velocityY;
    camera.offsetX = Math.floor(renderer.width / 2 - camera.centerX);
    camera.offsetY = Math.floor(renderer.height / 2 - camera.centerY);
}
function animationLoop(field, player, camera, renderer, mainScreen, resources) {
    if (resources._progress.isFinished()) {
        updateCamera(camera, player, field, renderer);
        drawField(field, camera, renderer);
        drawGameObject(player, camera, renderer);
        drawTexture(resources.player_walk_left_texture, 0, 0, renderer);
        composit(renderer, mainScreen);
    }
    else {
        console.log("loading " + (resources._progress.rate() * 100) + "%");
        mainScreen.fillText("loading", 0, 50);
    }
    requestAnimationFrame(() => animationLoop(field, player, camera, renderer, mainScreen, resources));
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
    const loadingProgress = loadResources();
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
            player.coord = leftCoord(player.coord);
        if (event.code === "KeyD")
            player.coord = rightCoord(player.coord);
        if (event.code === "KeyW")
            player.coord = upCoord(player.coord);
        if (event.code === "KeyS")
            player.coord = downCoord(player.coord);
        if (event.code === "ArrowLeft")
            movePlayer(player, field, "left");
        if (event.code === "ArrowRight")
            movePlayer(player, field, "right");
        if (event.code === "ArrowUp")
            movePlayer(player, field, "up");
        if (event.code === "ArrowDown")
            movePlayer(player, field, "down");
        console.log(player.coord);
    }, false);
    animationLoop(field, player, camera, renderer, mainScreen, loadingProgress);
};
