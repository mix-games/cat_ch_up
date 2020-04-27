"use strict";
function loadResources(callback = () => { }) {
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
        testAnimation: loadAnimationTexture("test.png", 0, 0, 32, 32, false, [30, 60, 90, 120, 150, 180, 210, 240], true),
        background_texture: loadStaticTexture("image/background.png", 200, 200, 400, 400, false),
        terrain_wall_texture: loadStaticTexture("image/terrain/wall.png", 10, 10, 20, 20, true),
        terrain_ladder_texture: loadStaticVolumeTexture("image/terrain/ladder.png", 14, 10, 32, 20, true, [0, 1, 2]),
        terrain_condenser_texture: loadAnimationVolumeTexture("image/terrain/condenser.png", 14, 10, 32, 20, true, [30, 60, 90], true, [0, 1, 2]),
    };
    function loadImage(source) {
        const image = new Image();
        progress.registeredCount++;
        image.addEventListener('load', () => {
            progress.finishedCount++;
            if (progress.isFinished())
                callback();
        }, false);
        image.addEventListener("error", () => {
            progress.errorCount++;
        });
        image.src = source;
        return image;
    }
    function loadAudio(source) {
        const audio = new Audio();
        audio.addEventListener('canplaythrough', () => {
            progress.finishedCount++;
            if (progress.isFinished())
                callback();
        }, false);
        audio.addEventListener("error", () => {
            progress.errorCount++;
        });
        audio.src = source;
        return audio;
    }
    // ただの（アニメーションしない、影も落とさないし受けない）テクスチャを作る
    function loadStaticTexture(source, offsetX, offsetY, width, height, useShadowColor) {
        return loadAnimationVolumeTexture(source, offsetX, offsetY, width, height, useShadowColor, [], false, []);
    }
    function loadStaticVolumeTexture(source, offsetX, offsetY, width, height, useShadowColor, volumeLayout) {
        return loadAnimationVolumeTexture(source, offsetX, offsetY, width, height, useShadowColor, [], false, volumeLayout);
    }
    function loadAnimationTexture(source, offsetX, offsetY, width, height, useShadowColor, timeline, loop) {
        return loadAnimationVolumeTexture(source, offsetX, offsetY, width, height, useShadowColor, timeline, loop, []);
    }
    function loadAnimationVolumeTexture(source, offsetX, offsetY, width, height, useShadowColor, timeline, loop, volumeLayout) {
        const image = loadImage(source);
        return {
            type: "image",
            image,
            offsetX,
            offsetY,
            width,
            height,
            useShadowColor,
            timeline,
            animationTimestamp: new Date().getTime(),
            loop,
            volumeLayout,
        };
    }
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
        return Object.assign({ animationTimestamp: new Date().getTime() }, texture);
    }
    // いちおうコピーするけど意味なさそう
    else
        return Object.assign({}, texture);
}
function drawTexture(texture, x, y, renderer) {
    if (texture.type === "rect") {
        renderer.lightColor.fillStyle = texture.color;
        renderer.lightColor.fillRect(x - texture.offsetX, y - texture.offsetY, texture.width, texture.height);
        renderer.shadowColor.fillStyle = texture.color;
        renderer.shadowColor.fillRect(x - texture.offsetX, y - texture.offsetY, texture.width, texture.height);
    }
    if (texture.type === "image") {
        const elapse = new Date().getTime() - texture.animationTimestamp;
        const phase = texture.loop ? elapse % texture.timeline[texture.timeline.length - 1] : elapse;
        let frame = texture.timeline.findIndex(t => phase < t);
        if (frame === -1)
            frame = Math.max(0, texture.timeline.length - 1);
        renderer.lightColor.drawImage(texture.image, texture.width * frame, // アニメーションによる横位置
        0, // どんなテクスチャでも1番目はlightColor（ほんとか？）
        texture.width, texture.height, x - texture.offsetX, y - texture.offsetY, texture.width, texture.height);
        renderer.shadowColor.drawImage(texture.image, texture.width * frame, // アニメーションによる横位置
        texture.useShadowColor ? texture.height : 0, // useShadowColorがfalseのときはlightColorを流用する
        texture.width, texture.height, x - texture.offsetX, y - texture.offsetY, texture.width, texture.height);
        texture.volumeLayout.forEach((target, layout) => renderer.volumeLayers[target].drawImage(texture.image, texture.width * frame, // アニメーションによる横位置
        (layout + (texture.useShadowColor ? 2 : 1)) * texture.height, // （色を除いて）上からlayout枚目の画像targetlayerに書く
        texture.width, texture.height, x - texture.offsetX, y - texture.offsetY, texture.width, texture.height));
    }
}
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
function createPlayer() {
    return {
        coord: createCoord(0, 0),
        isSmall: false,
        texture: createRectTexture("yellow", blockSize - 4, blockSize * 2 - 4, blockSize * 0.5 - 2, blockSize * 1.5 - 4)
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
        return { coord: leftCoord(coord), actionType: "walk" };
    // 上がふさがってなくて左上が空いているならそこ
    if (canEnter(upCoord(coord), terrain, isSmall)
        && canEnter(leftCoord(upCoord(coord)), terrain, isSmall))
        return { coord: leftCoord(upCoord(coord)), actionType: "climb" };
    return null;
}
function checkRight(coord, terrain, isSmall) {
    // 右が空いているならそこ
    if (canEnter(rightCoord(coord), terrain, isSmall))
        return { coord: rightCoord(coord), actionType: "walk" };
    // 上がふさがってなくて右上が空いているならそこ
    if (canEnter(upCoord(coord), terrain, isSmall)
        && canEnter(rightCoord(upCoord(coord)), terrain, isSmall))
        return { coord: rightCoord(upCoord(coord)), actionType: "climb" };
    return null;
}
function checkUp(coord, terrain, isSmall) {
    // 下半身か上半身が梯子で、かつ真上に留まれるなら登る？
    if ((getBlock(terrain, coord).collision === "ladder" ||
        getBlock(terrain, upCoord(coord)).collision === "ladder") &&
        canStand(upCoord(coord), terrain, isSmall))
        return { coord: upCoord(coord), actionType: "climb" };
    return null;
}
function checkDown(coord, terrain, isSmall) {
    // 真下が空いてるなら（飛び）下りる？
    if (canEnter(downCoord(coord), terrain, isSmall))
        return { coord: downCoord(coord), actionType: "climb" };
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
        texture: createRectTexture("blue", blockSize - 4, blockSize - 2, blockSize / 2 - 2, blockSize / 2 - 2)
    };
}
function controlNeko(neko, field, player) {
    neko.coord = rightCoord(neko.coord);
}
function createCamera() {
    const clearanceX = 4;
    const clearanceY = 2;
    const initialY = 5;
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
    camera.offsetX = Math.floor(renderer.lightColor.canvas.width / 2 - camera.centerX);
    camera.offsetY = Math.floor(renderer.lightColor.canvas.height / 2 - camera.centerY);
}
const blockSize = 20;
function drawField(field, camera, renderer) {
    drawTexture(field.backgroundTexture, renderer.lightColor.canvas.width / 2, renderer.lightColor.canvas.height / 2, renderer);
    const xRange = Math.ceil(renderer.lightColor.canvas.width / blockSize / 2);
    const yRange = Math.ceil(renderer.lightColor.canvas.height / blockSize / 2);
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
    drawGameObject(field.neko, camera, renderer);
}
function drawGameObject(gameObject, camera, renderer) {
    drawTexture(gameObject.texture, camera.offsetX + gameObject.coord.x * blockSize, camera.offsetY - gameObject.coord.y * blockSize, renderer);
}
function animationLoop(field, player, camera, renderer, mainScreen, resources) {
    if (resources._progress.isFinished()) {
        updateCamera(camera, player, field, renderer);
        drawField(field, camera, renderer);
        drawGameObject(player, camera, renderer);
        drawTexture(resources.testAnimation, 40, 40, renderer);
        composit(renderer, mainScreen);
    }
    else {
        console.log("loading " + (resources._progress.rate() * 100) + "%");
        mainScreen.fillText("loading", 0, 50);
    }
    requestAnimationFrame(() => animationLoop(field, player, camera, renderer, mainScreen, resources));
}
const resources = loadResources();
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
