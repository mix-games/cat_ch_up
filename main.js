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
/// <reference path="./renderer.ts" />
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
        player_stand_right_texture: loadStaticTexture("image/player/stand_right.png", 24, 48, 12, 24, true, 3),
        player_stand_left_texture: loadStaticTexture("image/player/stand_left.png", 24, 48, 12, 24, true, 3),
        player_hold_texture: loadStaticTexture("image/player/hold.png", 24, 48, 12, 24, true, 3),
        player_walk_right_texture: loadAnimationTexture("image/player/walk_right.png", 48, 48, 36, 24, true, [30, 60, 90, 120], false, 3),
        player_walk_left_texture: loadAnimationTexture("image/player/walk_left.png", 48, 48, 12, 24, true, [30, 60, 90, 120], false, 3),
        player_climb_right_texture: loadAnimationTexture("image/player/climb_right.png", 48, 72, 36, 24, true, [30, 60, 90, 120], false, 3),
        player_climb_left_texture: loadAnimationTexture("image/player/climb_left.png", 48, 72, 12, 24, true, [30, 60, 90, 120], false, 3),
        player_climb_up_texture: loadAnimationTexture("image/player/climb_up.png", 24, 72, 12, 24, true, [30, 60, 90, 120], false, 3),
        player_climb_down_texture: loadAnimationTexture("image/player/climb_down.png", 24, 72, 12, 48, true, [30, 60, 90, 120], false, 3),
        player_drop_left_texture: loadAnimationTexture("image/player/climb_down.png", 24, 72, 12, 48, true, [30, 60, 90, 120], false, 3),
        player_drop_right_texture: loadAnimationTexture("image/player/climb_down.png", 24, 72, 12, 48, true, [30, 60, 90, 120], false, 3),
        player_small_stand_right_texture: loadStaticTexture("image/player_small/stand_right.png", 24, 24, 12, 0, true, 3),
        player_small_stand_left_texture: loadStaticTexture("image/player_small/stand_left.png", 24, 24, 12, 0, true, 3),
        player_small_hold_texture: loadStaticTexture("image/player_small/hold.png", 24, 24, 12, 0, true, 3),
        player_small_walk_right_texture: loadAnimationTexture("image/player_small/walk_right.png", 48, 24, 36, 0, true, [30, 60, 90, 120], false, 3),
        player_small_walk_left_texture: loadAnimationTexture("image/player_small/walk_left.png", 48, 24, 12, 0, true, [30, 60, 90, 120], false, 3),
        player_small_climb_right_texture: loadAnimationTexture("image/player_small/climb_right.png", 48, 48, 36, 0, true, [30, 60, 90, 120], false, 3),
        player_small_climb_left_texture: loadAnimationTexture("image/player_small/climb_left.png", 48, 48, 12, 0, true, [30, 60, 90, 120], false, 3),
        player_small_climb_up_texture: loadAnimationTexture("image/player_small/climb_up.png", 24, 48, 12, 0, true, [30, 60, 90, 120], false, 3),
        player_small_climb_down_texture: loadAnimationTexture("image/player_small/climb_down.png", 24, 48, 12, 24, true, [30, 60, 90, 120], false, 3),
        player_small_drop_left_texture: loadAnimationTexture("image/player_small/climb_down.png", 24, 48, 12, 24, true, [30, 60, 90, 120], false, 3),
        player_small_drop_right_texture: loadAnimationTexture("image/player_small/climb_down.png", 24, 48, 12, 24, true, [30, 60, 90, 120], false, 3),
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
            animationEndCallback: () => { },
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
function cloneAndReplayTexture(texture, animationEndCallback = () => { }) {
    if (texture.type === "image") {
        return Object.assign(Object.assign({}, texture), { animationTimestamp: new Date().getTime(), animationEndCallback });
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
        if (frame === -1) {
            texture.animationEndCallback();
            frame = Math.max(0, texture.timeline.length - 1);
        }
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
/// <reference path="./camera.ts" />
function drawGameObject(gameObject, camera, renderer) {
    drawTexture(gameObject.texture, camera.offsetX + gameObject.coord.x * blockSize, camera.offsetY - gameObject.coord.y * blockSize, renderer);
}
/// <reference path="./resources.ts" />
/// <reference path="./gameobject.ts" />
/// <reference path="./field.ts" />
function createNeko() {
    return {
        type: "neko",
        coord: createCoord(0, 5),
        texture: createRectTexture("blue", blockSize - 4, blockSize - 2, blockSize / 2 - 2, -2)
    };
}
function canNekoEnter(coord, terrain) {
    return !(getBlock(terrain, coord).collision === "solid");
}
function canNekoStand(coord, terrain) {
    return canNekoEnter(coord, terrain) && getBlock(terrain, downCoord(coord)).collision === "solid";
}
function controlNeko(neko, field, player) {
    // 近づいたら
    if (Math.abs(player.coord.x - neko.coord.x) + Math.abs(player.coord.y - neko.coord.y) < 2) {
        //動く
        neko.coord = rightCoord(neko.coord);
    }
}
function controlEntity(entity, field, player) {
    if (entity.type === "neko") {
        controlNeko(entity, field, player);
    }
}
/// <reference path="./resources.ts" />
/// <reference path="./coord.ts" />
/// <reference path="./player.ts" />
/// <reference path="./entity.ts" />
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
        entities: [createNeko()],
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
    field.entities.forEach(e => drawGameObject(e, camera, renderer));
}
//プレイヤーの行動後に呼ばれる
function turn(field, player) {
    //敵などのターン処理はここ
    field.entities.forEach(e => controlEntity(e, field, player));
    while (field.terrain.length - 5 < player.coord.y ||
        field.terrain.length - 5 < Math.max(...field.entities.map(e => e.coord.y)))
        generateRow(field);
}
/// <reference path="./resources.ts" />
/// <reference path="./gameobject.ts" />
/// <reference path="./field.ts" />
function createPlayer() {
    return {
        state: "stand",
        coord: createCoord(0, 0),
        facingDirection: "facing_left",
        smallCount: 0,
        texture: cloneAndReplayTexture(resources.player_stand_right_texture),
    };
}
// その場所でプレイヤーがどのようにあるべきか
function checkPlayerState(coord, terrain, isSmall) {
    if (isSmall) {
        const ground = getBlock(terrain, downCoord(coord)).collision;
        const body = getBlock(terrain, coord).collision;
        if (body === "solid")
            return null;
        if (ground === "solid")
            return "stand";
        if (body === "ladder")
            return "ladder";
        if (body === "air")
            return "drop";
        //意味わからんけど網羅チェックとして機能するらしい
        return body;
    }
    else {
        const ground = getBlock(terrain, downCoord(coord)).collision;
        const foot = getBlock(terrain, coord).collision;
        const head = getBlock(terrain, upCoord(coord)).collision;
        if (head === "solid" || foot === "solid")
            return null;
        if (ground === "solid")
            return "stand";
        if (head === "ladder")
            return "ladder";
        if (head === "air")
            return "drop";
        //意味わからんけど網羅チェックとして機能するらしい
        return head;
    }
}
//そこにプレイヤーが入るスペースがあるか判定。空中でもtrue
function canEnter(coord, terrain, isSmall) {
    return checkPlayerState(coord, terrain, isSmall) !== null;
}
//その場に立てるか判定。上半身か下半身、足の下がはしごならtrue、足の下が空中だとfalse。スペースが無くてもfalse
function canStand(coord, terrain, isSmall) {
    return checkPlayerState(coord, terrain, isSmall) !== null
        && checkPlayerState(coord, terrain, isSmall) !== "drop";
}
function checkLeft(coord, terrain, isSmall) {
    // 左が空いているならそこ
    const leftState = checkPlayerState(leftCoord(coord), terrain, isSmall);
    if (leftState !== null) {
        return {
            coord: leftCoord(coord),
            state: leftState,
            moveDirection: "move_left",
        };
    }
    // 上がふさがってなくて左上に立てるならそこ
    if (checkPlayerState(upCoord(coord), terrain, isSmall) !== null
        && checkPlayerState(leftCoord(upCoord(coord)), terrain, isSmall) === "stand")
        return {
            coord: leftCoord(upCoord(coord)),
            state: "stand",
            moveDirection: "move_left_up",
        };
    return null;
}
function checkRight(coord, terrain, isSmall) {
    // 右が空いているならそこ
    const rightState = checkPlayerState(rightCoord(coord), terrain, isSmall);
    if (rightState !== null) {
        return {
            coord: rightCoord(coord),
            state: rightState,
            moveDirection: "move_right",
        };
    }
    // 上がふさがってなくて右上に立てるならそこ
    if (checkPlayerState(upCoord(coord), terrain, isSmall) !== null
        && checkPlayerState(rightCoord(upCoord(coord)), terrain, isSmall) === "stand")
        return {
            coord: rightCoord(upCoord(coord)),
            state: "stand",
            moveDirection: "move_right_up",
        };
    return null;
}
function checkUp(coord, terrain, isSmall) {
    // 上半身が梯子で、かつ真上に留まれるなら登る？
    if (getBlock(terrain, isSmall ? coord : upCoord(coord)).collision === "ladder" &&
        canStand(upCoord(coord), terrain, isSmall))
        return {
            coord: upCoord(coord),
            state: "ladder",
            moveDirection: "move_up",
        };
    return null;
}
function checkDown(coord, terrain, isSmall) {
    // 真下が空いてるなら（飛び）下りる？
    const downstate = checkPlayerState(downCoord(coord), terrain, isSmall);
    if (downstate !== null)
        return {
            coord: downCoord(coord),
            state: downstate,
            moveDirection: "move_down",
        };
    return null;
}
function shrinkPlayer(player) {
    if (!isStable(player))
        return;
    player.smallCount = 5;
    updatePlayersTexture(player);
}
function isStable(player) {
    return player.state === "stand" || player.state === "ladder";
}
// プレイヤーを落とす処理
function dropPlayer(player, field) {
    if (isStable(player)) {
        updatePlayersTexture(player);
    }
    else {
        //宙に浮いてたら自動で落ちる
        const result = checkDown(player.coord, field.terrain, 0 < player.smallCount)
            || { state: "drop", coord: downCoord(player.coord) }; //埋まる場合には更に落とす
        const textureSet = getDropTexture(result.state, player.facingDirection);
        player.texture = cloneAndReplayTexture(textureSet[0 < player.smallCount ? "small" : "normal"], () => dropPlayer(player, field));
        player.coord = result.coord;
        player.state = result.state;
        //moveDirectionは更新しない（向いている方向を判別したいので）
    }
    function getDropTexture(newState, facingDirection) {
        switch (newState) {
            //落下に関して移動方向は考えない（必ず下と見做す）。代わりに顔の向きを考える
            //着地
            case "stand":
                switch (facingDirection) {
                    case "facing_left":
                        return {
                            small: resources.player_small_drop_left_texture,
                            normal: resources.player_drop_left_texture,
                        };
                        break;
                    case "facing_right":
                        return {
                            small: resources.player_small_drop_right_texture,
                            normal: resources.player_drop_right_texture,
                        };
                        break;
                    default: return facingDirection;
                }
                break;
            //梯子に着地
            case "ladder":
                switch (facingDirection) {
                    case "facing_left":
                        return {
                            small: resources.player_small_drop_left_texture,
                            normal: resources.player_drop_left_texture,
                        };
                        break;
                    case "facing_right":
                        return {
                            small: resources.player_small_drop_right_texture,
                            normal: resources.player_drop_right_texture,
                        };
                        break;
                    default: return facingDirection;
                }
                break;
            //落下継続
            case "drop":
                switch (facingDirection) {
                    case "facing_left":
                        return {
                            small: resources.player_small_drop_left_texture,
                            normal: resources.player_drop_left_texture,
                        };
                        break;
                    case "facing_right":
                        return {
                            small: resources.player_small_drop_right_texture,
                            normal: resources.player_drop_right_texture,
                        };
                        break;
                    default: return facingDirection;
                }
                break;
            default: return newState;
        }
    }
}
//プレイヤーのstateを見てテクスチャを更新する。
function updatePlayersTexture(player) {
    const textureSet = getStateTexture(player.state, player.facingDirection);
    player.texture = textureSet[0 < player.smallCount ? "small" : "normal"];
    function getStateTexture(state, facingDirection) {
        switch (state) {
            case "stand":
                {
                    switch (facingDirection) {
                        case "facing_left":
                            return {
                                small: cloneAndReplayTexture(resources.player_small_stand_left_texture),
                                normal: cloneAndReplayTexture(resources.player_stand_left_texture),
                            };
                            break;
                        case "facing_right":
                            return {
                                small: cloneAndReplayTexture(resources.player_small_stand_right_texture),
                                normal: cloneAndReplayTexture(resources.player_stand_right_texture),
                            };
                            break;
                        default: return facingDirection;
                    }
                }
                break;
            case "ladder":
                return {
                    small: cloneAndReplayTexture(resources.player_small_hold_texture),
                    normal: cloneAndReplayTexture(resources.player_hold_texture),
                };
                break;
        }
    }
}
//プレイヤーを直接動かす。
function movePlayer(player, field, direction) {
    if (player.state === "drop")
        return;
    let result = null;
    switch (direction) {
        case "left":
            result = checkLeft(player.coord, field.terrain, 0 < player.smallCount);
            break;
        case "right":
            result = checkRight(player.coord, field.terrain, 0 < player.smallCount);
            break;
        case "up":
            result = checkUp(player.coord, field.terrain, 0 < player.smallCount);
            break;
        case "down":
            result = checkDown(player.coord, field.terrain, 0 < player.smallCount);
            break;
    }
    if (result === null)
        return null;
    const textureSet = getTransitionTexture(player.state, result.state, result.moveDirection, player.facingDirection);
    player.texture = cloneAndReplayTexture(textureSet[0 < player.smallCount ? "small" : "normal"], () => dropPlayer(player, field));
    player.coord = result.coord;
    player.state = result.state;
    //意図的に左を向いた時のみ左を向く。（梯子中など）無標は右
    player.facingDirection = direction === "left" ? "facing_left" : "facing_right";
    if (0 < player.smallCount)
        player.smallCount--;
    turn(field, player);
    function getTransitionTexture(oldState, newState, moveDirection, facingDirection) {
        switch (oldState) {
            case "stand":
                switch (newState) {
                    // 歩き系
                    case "stand":
                        switch (moveDirection) {
                            //左に歩く
                            case "move_left":
                                return {
                                    small: resources.player_small_walk_left_texture,
                                    normal: resources.player_walk_left_texture,
                                };
                                break;
                            //右に歩く
                            case "move_right":
                                return {
                                    small: resources.player_small_walk_right_texture,
                                    normal: resources.player_walk_right_texture,
                                };
                                break;
                            //左上によじ登る
                            case "move_left_up":
                                return {
                                    small: resources.player_small_climb_left_texture,
                                    normal: resources.player_climb_left_texture,
                                };
                                break;
                            //右上によじ登る
                            case "move_right_up":
                                return {
                                    small: resources.player_small_climb_right_texture,
                                    normal: resources.player_climb_right_texture,
                                };
                                break;
                        }
                        break;
                    //梯子につかまる
                    case "ladder":
                        switch (moveDirection) {
                            //左の梯子に掴まる
                            case "move_left":
                                return {
                                    small: resources.player_small_walk_left_texture,
                                    normal: resources.player_walk_left_texture,
                                };
                                break;
                            //右の梯子につかまる
                            case "move_right":
                                return {
                                    small: resources.player_small_walk_right_texture,
                                    normal: resources.player_walk_right_texture,
                                };
                                break;
                            //上の梯子につかまる
                            case "move_up":
                                return {
                                    small: resources.player_small_climb_up_texture,
                                    normal: resources.player_climb_up_texture,
                                };
                                break;
                        }
                        break;
                    //足場から飛び降り
                    case "drop":
                        switch (moveDirection) {
                            //左に飛び降り
                            case "move_left":
                                return {
                                    small: resources.player_small_walk_left_texture,
                                    normal: resources.player_walk_left_texture,
                                };
                                break;
                            //右に飛び降り
                            case "move_right":
                                return {
                                    small: resources.player_small_walk_right_texture,
                                    normal: resources.player_walk_right_texture,
                                };
                                break;
                        }
                        break;
                }
                break;
            case "ladder":
                switch (newState) {
                    //梯子から穏便に落ちる
                    case "stand":
                        switch (moveDirection) {
                            //左の足場に下りる
                            case "move_left":
                                return {
                                    small: resources.player_small_walk_left_texture,
                                    normal: resources.player_walk_left_texture,
                                };
                                break;
                            //右の足場に下りる
                            case "move_right":
                                return {
                                    small: resources.player_small_walk_right_texture,
                                    normal: resources.player_walk_right_texture,
                                };
                                break;
                            //下の足場に下りる
                            case "move_down":
                                return {
                                    small: resources.player_small_climb_down_texture,
                                    normal: resources.player_climb_down_texture,
                                };
                                break;
                        }
                        break;
                    //梯子上で移動
                    case "ladder":
                        switch (moveDirection) {
                            //左の梯子に掴まる
                            case "move_left":
                                return {
                                    small: resources.player_small_walk_left_texture,
                                    normal: resources.player_walk_left_texture,
                                };
                                break;
                            //右の梯子につかまる
                            case "move_right":
                                return {
                                    small: resources.player_small_walk_right_texture,
                                    normal: resources.player_walk_right_texture,
                                };
                                break;
                            //上の梯子につかまる
                            case "move_up":
                                return {
                                    small: resources.player_small_climb_up_texture,
                                    normal: resources.player_climb_up_texture,
                                };
                                break;
                            //下の梯子につかまる
                            case "move_down":
                                return {
                                    small: resources.player_small_climb_down_texture,
                                    normal: resources.player_climb_down_texture,
                                };
                                break;
                        }
                        break;
                    //梯子から飛び降り
                    case "drop":
                        switch (moveDirection) {
                            //左に
                            case "move_left":
                                return {
                                    small: resources.player_small_walk_left_texture,
                                    normal: resources.player_walk_left_texture,
                                };
                                break;
                            //右に
                            case "move_right":
                                return {
                                    small: resources.player_small_walk_right_texture,
                                    normal: resources.player_walk_right_texture,
                                };
                                break;
                            //下に
                            case "move_down":
                                return {
                                    small: resources.player_small_climb_down_texture,
                                    normal: resources.player_climb_down_texture,
                                };
                                break;
                        }
                        break;
                }
                break;
        }
        throw new Error("unecpected texture requested");
    }
}
/// <reference path="./coord.ts" />
/// <reference path="./player.ts" />
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
function animationLoop(field, player, camera, renderer, mainScreen) {
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
    requestAnimationFrame(() => animationLoop(field, player, camera, renderer, mainScreen));
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
        if (event.code === "KeyZ")
            shrinkPlayer(player);
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
    animationLoop(field, player, camera, renderer, mainScreen);
};
