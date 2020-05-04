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
var Renderer;
(function (Renderer) {
    Renderer.layerNum = 6;
    Renderer.marginTop = 28;
    Renderer.marginLeft = 28;
    const marginRignt = 0;
    const marginBottom = 0;
    const shadowDirectionX = 2;
    const shadowDirectionY = 3;
    function create(width, height) {
        const lightColor = create2dScreen(Renderer.marginLeft + width + marginRignt, Renderer.marginTop + height + marginBottom);
        const shadowColor = create2dScreen(Renderer.marginLeft + width + marginRignt, Renderer.marginTop + height + marginBottom);
        const lightLayers = [];
        for (let i = 0; i < Renderer.layerNum; i++)
            lightLayers.push(create2dScreen(Renderer.marginLeft + width + marginRignt, Renderer.marginTop + height + marginBottom));
        const shadowLayers = [];
        for (let i = 0; i < Renderer.layerNum; i++)
            shadowLayers.push(create2dScreen(Renderer.marginLeft + width + marginRignt, Renderer.marginTop + height + marginBottom));
        const uiScreen = create2dScreen(width, height);
        const compositScreen = create2dScreen(width, height);
        return {
            lightColor,
            shadowColor,
            lightLayers,
            shadowLayers,
            uiScreen,
            compositScreen,
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
    Renderer.create = create;
    function composit(renderer, mainScreen) {
        for (let i = 0; i < Renderer.layerNum; i++)
            renderer.lightColor.drawImage(renderer.lightLayers[i].canvas, 0, 0);
        for (let i = 0; i < Renderer.layerNum; i++)
            renderer.shadowColor.drawImage(renderer.shadowLayers[i].canvas, 0, 0);
        // shadowLayersを斜め累積
        for (let i = Renderer.layerNum - 2; 0 <= i; i--) {
            renderer.shadowLayers[i].drawImage(renderer.shadowLayers[i + 1].canvas, shadowDirectionX, shadowDirectionY);
        }
        for (let i = 0; i < Renderer.layerNum; i++) {
            //i-1層目の形で打ち抜く
            if (i !== 0) {
                renderer.shadowLayers[i].globalCompositeOperation = "source-in";
                renderer.shadowLayers[i].drawImage(renderer.lightLayers[i - 1].canvas, -shadowDirectionX, -shadowDirectionY);
            }
            //compositに累積
            renderer.compositScreen.globalCompositeOperation = "source-over";
            renderer.compositScreen.drawImage(renderer.shadowLayers[i].canvas, -Renderer.marginLeft + shadowDirectionX, -Renderer.marginTop + shadowDirectionY);
            //見えなくなる部分を隠す
            renderer.compositScreen.globalCompositeOperation = "destination-out";
            renderer.compositScreen.drawImage(renderer.lightLayers[i].canvas, -Renderer.marginLeft, -Renderer.marginTop);
        }
        // 影部分が不透明な状態になっているはずなので、影色で上書きする
        renderer.compositScreen.globalCompositeOperation = "source-atop";
        renderer.compositScreen.drawImage(renderer.shadowColor.canvas, -Renderer.marginLeft, -Renderer.marginTop);
        // 残りの部分に光色
        renderer.compositScreen.globalCompositeOperation = "destination-over";
        renderer.compositScreen.drawImage(renderer.lightColor.canvas, -Renderer.marginLeft, -Renderer.marginTop);
        renderer.compositScreen.globalCompositeOperation = "source-over";
        renderer.compositScreen.drawImage(renderer.uiScreen.canvas, 0, 0);
        // メインスクリーン（本番のcanvas）にスムージングなしで拡大
        mainScreen.imageSmoothingEnabled = false;
        mainScreen.clearRect(0, 0, mainScreen.canvas.width, mainScreen.canvas.height);
        mainScreen.drawImage(renderer.compositScreen.canvas, 0, 0, mainScreen.canvas.width, mainScreen.canvas.height);
        //次フレームの描画に備えてレイヤーを消去
        clearScreen(renderer.lightColor);
        clearScreen(renderer.shadowColor);
        for (var i = 0; i < Renderer.layerNum; i++) {
            clearScreen(renderer.lightLayers[i]);
            clearScreen(renderer.shadowLayers[i]);
        }
        clearScreen(renderer.uiScreen);
        clearScreen(renderer.compositScreen);
        function clearScreen(screen) {
            screen.clearRect(0, 0, screen.canvas.width, screen.canvas.height);
            screen.globalCompositeOperation = "source-over";
        }
    }
    Renderer.composit = composit;
})(Renderer || (Renderer = {}));
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
        testAnimation: loadAnimationTexture("test.png", 32, 32, 0, 0, false, [30, 60, 90, 120, 150, 180, 210, 240], true, 1, 0),
        background_texture: loadStaticTexture("image/background.png", 400, 400, 200, 200, false, 0, 0),
        terrain_wall_texture: loadStaticTexture("image/terrain/wall.png", 24, 24, 10, 0, true, 0, 0),
        terrain_ladder_texture: loadStaticTexture("image/terrain/ladder.png", 24, 24, 11, 0, true, 2, 0),
        terrain_condenser_texture: loadAnimationTexture("image/terrain/condenser.png", 36, 24, 13, 0, true, [30, 60, 90], true, 6, 0),
        player_stand_right_texture: loadStaticTexture("image/player/stand_right.png", 24, 48, 12, 24, true, 1, 3),
        player_stand_left_texture: loadStaticTexture("image/player/stand_left.png", 24, 48, 12, 24, true, 1, 3),
        player_hold_texture: loadStaticTexture("image/player/hold.png", 24, 48, 12, 24, true, 1, 3),
        player_walk_right_texture: loadAnimationTexture("image/player/walk_right.png", 48, 48, 36, 24, true, [30, 60, 90, 120], false, 1, 3),
        player_walk_left_texture: loadAnimationTexture("image/player/walk_left.png", 48, 48, 12, 24, true, [30, 60, 90, 120], false, 1, 3),
        player_climb_right_texture: loadAnimationTexture("image/player/climb_right.png", 48, 72, 36, 24, true, [30, 60, 90, 120], false, 1, 3),
        player_climb_left_texture: loadAnimationTexture("image/player/climb_left.png", 48, 72, 12, 24, true, [30, 60, 90, 120], false, 1, 3),
        player_climb_up_texture: loadAnimationTexture("image/player/climb_up.png", 24, 72, 12, 24, true, [30, 60, 90, 120], false, 1, 3),
        player_climb_down_texture: loadAnimationTexture("image/player/climb_down.png", 24, 72, 12, 48, true, [30, 60, 90, 120], false, 1, 3),
        player_drop_left_texture: loadAnimationTexture("image/player/climb_down.png", 24, 72, 12, 48, true, [30, 60, 90, 120], false, 1, 3),
        player_drop_right_texture: loadAnimationTexture("image/player/climb_down.png", 24, 72, 12, 48, true, [30, 60, 90, 120], false, 1, 3),
        player_small_stand_right_texture: loadStaticTexture("image/player_small/stand_right.png", 24, 24, 12, 0, true, 1, 3),
        player_small_stand_left_texture: loadStaticTexture("image/player_small/stand_left.png", 24, 24, 12, 0, true, 1, 3),
        player_small_hold_texture: loadStaticTexture("image/player_small/hold.png", 24, 24, 12, 0, true, 1, 3),
        player_small_walk_right_texture: loadAnimationTexture("image/player_small/walk_right.png", 48, 24, 36, 0, true, [30, 60, 90, 120], false, 1, 3),
        player_small_walk_left_texture: loadAnimationTexture("image/player_small/walk_left.png", 48, 24, 12, 0, true, [30, 60, 90, 120], false, 1, 3),
        player_small_climb_right_texture: loadAnimationTexture("image/player_small/climb_right.png", 48, 48, 36, 0, true, [30, 60, 90, 120], false, 1, 3),
        player_small_climb_left_texture: loadAnimationTexture("image/player_small/climb_left.png", 48, 48, 12, 0, true, [30, 60, 90, 120], false, 1, 3),
        player_small_climb_up_texture: loadAnimationTexture("image/player_small/climb_up.png", 24, 48, 12, 0, true, [30, 60, 90, 120], false, 1, 3),
        player_small_climb_down_texture: loadAnimationTexture("image/player_small/climb_down.png", 24, 48, 12, 24, true, [30, 60, 90, 120], false, 1, 3),
        player_small_drop_left_texture: loadAnimationTexture("image/player_small/climb_down.png", 24, 48, 12, 24, true, [30, 60, 90, 120], false, 1, 3),
        player_small_drop_right_texture: loadAnimationTexture("image/player_small/climb_down.png", 24, 48, 12, 24, true, [30, 60, 90, 120], false, 1, 3),
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
    function loadStaticTexture(source, width, height, offsetX, offsetY, useShadowColor, depth, depthOffset) {
        return loadAnimationTexture(source, width, height, offsetX, offsetY, useShadowColor, [], false, depth, depthOffset);
    }
    function loadAnimationTexture(source, width, height, offsetX, offsetY, useShadowColor, timeline, loop, depth, depthOffset) {
        const texture = createVolumeTexture(width, height, offsetX, offsetY, depth, depthOffset);
        const image = loadImage(source, () => {
            const source1 = document.createElement("canvas");
            source1.width = width;
            source1.height = image.height;
            const context = source1.getContext("2d");
            if (context === null)
                throw new Error("failed to get context-2d");
            context.drawImage(image, 0, 0);
            readyVolumeTexture(texture, image, useShadowColor);
        });
        return texture;
        /*
        const lightColor = document.createElement("canvas");
        const shadowColor = document.createElement("canvas");
        const texture = {
            type: "image" as const,
            lightColor: lightColor,
            shadowColor: shadowColor,
            offsetX,
            offsetY,
            width,
            height,
            timeline,
            animationTimestamp: new Date().getTime(),
            loop,
            depth,
            depthOffset,
            animationEndCallback: () => { },
        };
        const image = loadImage(source, () => {
            const lightColorScreen = lightColor.getContext("2d");
            if (lightColorScreen === null) throw new Error("failed to get context-2d");
            const shadowColorScreen = shadowColor.getContext("2d");
            if (shadowColorScreen === null) throw new Error("failed to get context-2d");

            lightColor.width = image.width;
            lightColor.height = useShadowColor ? (image.height - height) : image.height;
            shadowColor.width = image.width;
            shadowColor.height = useShadowColor ? (image.height - height) : image.height;

            lightColorScreen.drawImage(
                image,
                0, 0,
                image.width, height,
                0, 0,
                image.width, height);
            lightColorScreen.drawImage(
                image,
                0, useShadowColor ? (height * 2) : height,
                image.width, useShadowColor ? (image.height - height * 2) : (image.height - height),
                0, height,
                image.width, useShadowColor ? (image.height - height * 2) : (image.height - height));
            lightColorScreen.globalCompositeOperation = "source-atop";
            for (var i = 0; (i + (useShadowColor ? 2 : 1)) * height < image.height; i++) {
                lightColorScreen.drawImage(
                    image,
                    0, 0,
                    image.width, height,
                    0, height * (i + 1),
                    image.width, height);
            }
            shadowColorScreen.drawImage(
                image,
                0, useShadowColor ? height : 0,
                image.width, height,
                0, 0,
                image.width, height);
            shadowColorScreen.drawImage(
                image,
                0, height * 2,
                image.width, useShadowColor ? (image.height - height * 2) : (image.height - height),
                0, height,
                image.width, useShadowColor ? (image.height - height * 2) : (image.height - height));
            shadowColorScreen.globalCompositeOperation = "source-atop";
            for (var i = 0; i < depth; i++) {
                shadowColorScreen.drawImage(
                    image,
                    0, height,
                    image.width, height,
                    0, height * (i + 1),
                    image.width, height);
            }
        });
        return texture;
        */
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
function createVolumeTexture(width, height, offsetX, offsetY, depth, depthOffset) {
    const lightColor = document.createElement("canvas");
    const shadowColor = document.createElement("canvas");
    lightColor.width = width;
    lightColor.height = height;
    shadowColor.width = width;
    shadowColor.height = height;
    const lightLayers = [];
    const shadowLayers = [];
    for (var i = 0; i < depth; i++) {
        lightLayers[i] = document.createElement("canvas");
        shadowLayers[i] = document.createElement("canvas");
        lightLayers[i].width = width;
        lightLayers[i].height = height;
        shadowLayers[i].width = width;
        shadowLayers[i].height = height;
    }
    return {
        type: "volume",
        lightColor,
        shadowColor,
        lightLayers,
        shadowLayers,
        width,
        height,
        offsetX,
        offsetY,
        depth,
        depthOffset,
    };
}
function createAnimationTexture() {
}
function cloneAndReplayTexture(texture, animationEndCallback = () => { }) {
    if (texture.type === "image") {
        return Object.assign(Object.assign({}, texture), { animationTimestamp: new Date().getTime(), animationEndCallback });
    }
    // いちおうコピーするけど意味なさそう
    else
        return Object.assign({}, texture);
}
function readyVolumeTexture(texture, image, useShadowColor) {
    const lightColorScreen = texture.lightColor.getContext("2d");
    if (lightColorScreen === null)
        throw new Error("failed to get context-2d");
    const shadowColorScreen = texture.shadowColor.getContext("2d");
    if (shadowColorScreen === null)
        throw new Error("failed to get context-2d");
    lightColorScreen.drawImage(image, 0, 0, texture.width, texture.height, 0, 0, texture.width, texture.height);
    shadowColorScreen.drawImage(image, 0, texture.height * (useShadowColor ? 1 : 0), texture.width, texture.height, 0, 0, texture.width, texture.height);
    for (var i = 0; i < texture.depth; i++) {
        const currentLightScreen = texture.lightLayers[i].getContext("2d");
        if (currentLightScreen === null)
            throw new Error("failed to get context-2d");
        const currentShadowScreen = texture.shadowLayers[i].getContext("2d");
        if (currentShadowScreen === null)
            throw new Error("failed to get context-2d");
        currentLightScreen.drawImage(image, 0, texture.height * (useShadowColor ? i + 2 : i + 1), texture.width, texture.height, 0, 0, texture.width, texture.height);
        currentShadowScreen.drawImage(image, 0, texture.height * (useShadowColor ? i + 2 : i + 1), texture.width, texture.height, 0, 0, texture.width, texture.height);
        currentLightScreen.globalCompositeOperation = "source-atop";
        currentLightScreen.drawImage(image, 0, 0, texture.width, texture.height, 0, 0, texture.width, texture.height);
        currentLightScreen.globalCompositeOperation = "source-over";
        currentShadowScreen.globalCompositeOperation = "source-atop";
        currentShadowScreen.drawImage(image, 0, texture.height * (useShadowColor ? 1 : 0), texture.width, texture.height, 0, 0, texture.width, texture.height);
        currentShadowScreen.globalCompositeOperation = "source-over";
    }
}
function drawTexture(texture, x, y, renderer) {
    switch (texture.type) {
        case "rect":
            {
                renderer.lightColor.fillStyle = texture.color;
                renderer.lightColor.fillRect(Renderer.marginLeft + x - texture.offsetX, Renderer.marginTop + y - texture.offsetY, texture.width, texture.height);
                renderer.shadowColor.fillStyle = texture.color;
                renderer.shadowColor.fillRect(Renderer.marginLeft + x - texture.offsetX, Renderer.marginTop + y - texture.offsetY, texture.width, texture.height);
            }
            break;
        case "volume":
            {
                renderer.lightColor.drawImage(texture.lightColor, Renderer.marginLeft + x - texture.offsetX, Renderer.marginTop + y - texture.offsetY);
                renderer.shadowColor.drawImage(texture.shadowColor, Renderer.marginLeft + x - texture.offsetX, Renderer.marginTop + y - texture.offsetY);
                for (let i = 0; i < texture.depth; i++) {
                    renderer.lightLayers[i + texture.depthOffset].drawImage(texture.lightLayers[i], Renderer.marginLeft + x - texture.offsetX, Renderer.marginTop + y - texture.offsetY);
                    renderer.shadowLayers[i + texture.depthOffset].drawImage(texture.shadowLayers[i], Renderer.marginLeft + x - texture.offsetX, Renderer.marginTop + y - texture.offsetY);
                }
            }
            break;
        case "image": {
            const elapse = new Date().getTime() - texture.animationTimestamp;
            const phase = texture.loop ? elapse % texture.timeline[texture.timeline.length - 1] : elapse;
            let frame = texture.timeline.findIndex(t => phase < t);
            if (frame === -1) {
                texture.animationEndCallback();
                frame = Math.max(0, texture.timeline.length - 1);
            }
            renderer.lightColor.drawImage(texture.lightColor, texture.width * frame, // アニメーションによる横位置
            0, texture.width, texture.height, Renderer.marginLeft + x - texture.offsetX, Renderer.marginTop + y - texture.offsetY, texture.width, texture.height);
            renderer.shadowColor.drawImage(texture.shadowColor, texture.width * frame, // アニメーションによる横位置
            0, texture.width, texture.height, Renderer.marginLeft + x - texture.offsetX, Renderer.marginTop + y - texture.offsetY, texture.width, texture.height);
            for (let i = 0; i < texture.depth; i++) {
                renderer.lightLayers[i + texture.depthOffset].drawImage(texture.lightColor, texture.width * frame, // アニメーションによる横位置
                (i + 1) * texture.height, // （色を除いて）上からi枚目の画像
                texture.width, texture.height, Renderer.marginLeft + x - texture.offsetX, Renderer.marginTop + y - texture.offsetY, texture.width, texture.height);
                renderer.shadowLayers[i + texture.depthOffset].drawImage(texture.shadowColor, texture.width * frame, // アニメーションによる横位置
                (i + 1) * texture.height, // （色を除いて）上からi枚目の画像
                texture.width, texture.height, Renderer.marginLeft + x - texture.offsetX, Renderer.marginTop + y - texture.offsetY, texture.width, texture.height);
            }
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
        return Object.assign(Object.assign({}, neko), { coord: rightCoord(neko.coord) });
    }
    return neko;
}
function controlEntity(entity, field, player) {
    if (entity.type === "neko") {
        return controlNeko(entity, field, player);
    }
    // 網羅チェック
    return entity.type;
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
    return {
        terrain: annexRow(protoTerrain.map((protoRow) => assignTexture(protoRow, [])), 10),
        entities: [createNeko()],
        backgroundTexture: resources.background_texture
    };
}
const fieldWidth = 10;
//Y座標は下から数える
function annexRow(terrain, targetHeight) {
    if (targetHeight <= terrain.length)
        return terrain;
    const protoRow = [];
    for (let x = 0; x < fieldWidth; x++) {
        if (Math.random() < 0.7)
            protoRow[x] = { collision: "air" };
        else if (Math.random() < 0.5)
            protoRow[x] = { collision: "solid" };
        else
            protoRow[x] = { collision: "ladder" };
    }
    return annexRow([...terrain, assignTexture(protoRow, terrain)], targetHeight);
}
function assignTexture(protoRow, terrain) {
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
// プレイヤー行動後の敵などの処理はここ
function turn(field, player) {
    return Object.assign(Object.assign({}, field), { entities: field.entities.map(e => controlEntity(e, field, player)), terrain: annexRow(field.terrain, Math.max(player.coord.y + 5, ...field.entities.map(e => e.coord.y + 5))) });
}
/// <reference path="./resources.ts" />
/// <reference path="./gameobject.ts" />
/// <reference path="./field.ts" />
var Player;
(function (Player) {
    function create() {
        return {
            state: "stand",
            coord: createCoord(0, 0),
            facingDirection: "facing_left",
            smallCount: 0,
            texture: cloneAndReplayTexture(resources.player_stand_right_texture),
        };
    }
    Player.create = create;
    // その場所でプレイヤーがどのようにあるべきか
    function checkState(coord, terrain, isSmall) {
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
        return checkState(coord, terrain, isSmall) !== null;
    }
    //その場に立てるか判定。上半身か下半身、足の下がはしごならtrue、足の下が空中だとfalse。スペースが無くてもfalse
    function canStand(coord, terrain, isSmall) {
        return checkState(coord, terrain, isSmall) !== null
            && checkState(coord, terrain, isSmall) !== "drop";
    }
    function drop(coord, state, terrain, isSmall) {
        if (state === "stand" || state === "ladder")
            return { coord, state };
        return (drop(downCoord(coord), checkState(downCoord(coord), terrain, isSmall), terrain, isSmall));
    }
    function checkLeft(coord, terrain, isSmall) {
        // 左が空いているならそこ
        const leftState = checkState(leftCoord(coord), terrain, isSmall);
        if (leftState !== null) {
            return drop(leftCoord(coord), leftState, terrain, isSmall);
        }
        // 上がふさがってなくて左上に立てるならそこ
        if (checkState(upCoord(coord), terrain, isSmall) !== null
            && checkState(leftCoord(upCoord(coord)), terrain, isSmall) === "stand")
            return {
                coord: leftCoord(upCoord(coord)),
                state: "stand",
            };
        return null;
    }
    function checkRight(coord, terrain, isSmall) {
        // 右が空いているならそこ
        const rightState = checkState(rightCoord(coord), terrain, isSmall);
        if (rightState !== null) {
            return drop(rightCoord(coord), rightState, terrain, isSmall);
        }
        // 上がふさがってなくて右上に立てるならそこ
        if (checkState(upCoord(coord), terrain, isSmall) !== null
            && checkState(rightCoord(upCoord(coord)), terrain, isSmall) === "stand")
            return {
                coord: rightCoord(upCoord(coord)),
                state: "stand",
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
            };
        return null;
    }
    function checkDown(coord, terrain, isSmall) {
        // 真下が空いてるなら（飛び）下りる？
        const downState = checkState(downCoord(coord), terrain, isSmall);
        if (downState !== null)
            return drop(downCoord(coord), downState, terrain, isSmall);
        return null;
    }
    function shrink(player) {
        return updateTexture(Object.assign(Object.assign({}, player), { smallCount: 5 }));
    }
    Player.shrink = shrink;
    function selectTexture(textureSet, smallCount) {
        return textureSet[0 < smallCount ? "small" : "normal"];
    }
    /*
    // プレイヤーを落とす処理（※グローバル参照）
    function drop(field: Field) {
        if (player.state !== "drop") {
            player = updateTexture(player);
        }
        else {
            //宙に浮いてたら自動で落ちる
            const result = checkDown(player.coord, field.terrain, 0 < player.smallCount)
                || { state: "drop", coord: downCoord(player.coord) }; //埋まる場合には更に落とす
            const textureSet = getDropTexture(result.state, player.facingDirection);
            player = {
                ...player,
                texture: cloneAndReplayTexture(
                    selectTexture(textureSet, player.smallCount),
                    () => drop(field)),
                coord: result.coord,
                state: result.state,
                //moveDirectionは更新しない（向いている方向を判別したいので）
            };
        }

        function getDropTexture(newState: "stand" | "ladder" | "drop", facingDirection: FacingDirection): { normal: Texture, small: Texture; } {
            switch (newState) {
                //落下に関して移動方向は考えない（必ず下と見做す）。代わりに顔の向きを考える
                //着地
                case "stand": switch (facingDirection) {
                    case "facing_left": return {
                        small: resources.player_small_drop_left_texture,
                        normal: resources.player_drop_left_texture,
                    }; break;
                    case "facing_right": return {
                        small: resources.player_small_drop_right_texture,
                        normal: resources.player_drop_right_texture,
                    }; break;
                    default: return facingDirection;
                } break;
                //梯子に着地
                case "ladder": switch (facingDirection) {
                    case "facing_left": return {
                        small: resources.player_small_drop_left_texture,
                        normal: resources.player_drop_left_texture,
                    }; break;
                    case "facing_right": return {
                        small: resources.player_small_drop_right_texture,
                        normal: resources.player_drop_right_texture,
                    }; break;
                    default: return facingDirection;
                }
                    break;
                //落下継続
                case "drop": switch (facingDirection) {
                    case "facing_left": return {
                        small: resources.player_small_drop_left_texture,
                        normal: resources.player_drop_left_texture,
                    }; break;
                    case "facing_right": return {
                        small: resources.player_small_drop_right_texture,
                        normal: resources.player_drop_right_texture,
                    }; break;
                    default: return facingDirection;
                } break;
                default: return newState;
            }
        }
    }
    */
    //プレイヤーのstateを見てテクスチャを更新する。
    function updateTexture(player) {
        const textureSet = getStateTexture(player.state, player.facingDirection);
        return Object.assign(Object.assign({}, player), { texture: selectTexture(textureSet, player.smallCount) });
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
    //与えられたMoveResult | nullに従ってプレイヤーを動かす
    function move(player, result) {
        const textureSet = getTransitionTexture(player.state, result.state, result.coord.x - player.coord.x, result.coord.y - player.coord.y, player.facingDirection);
        return Object.assign(Object.assign({}, player), { texture: cloneAndReplayTexture(selectTexture(textureSet, player.smallCount)), coord: result.coord, state: result.state, 
            //左に移動したときのみ左を向く。無標（上下移動）では右
            facingDirection: result.coord < player.coord ? "facing_left" : "facing_right", smallCount: Math.max(0, player.smallCount - 1) });
        function getTransitionTexture(oldState, newState, dx, dy, facingDirection) {
            //飛び降り条件
            if (dy < -1 || dy === -1 && (dx !== 0 || oldState !== "ladder")) {
                //一旦適当
                if (dx === -1)
                    return {
                        small: resources.player_small_walk_left_texture,
                        normal: resources.player_walk_left_texture,
                    };
                else
                    return {
                        small: resources.player_small_walk_right_texture,
                        normal: resources.player_walk_right_texture,
                    };
            }
            switch (oldState) {
                case "stand":
                    switch (newState) {
                        // 歩き系
                        case "stand":
                            switch (dx) {
                                //左に
                                case -1:
                                    switch (dy) {
                                        //歩く
                                        case 0:
                                            return {
                                                small: resources.player_small_walk_left_texture,
                                                normal: resources.player_walk_left_texture,
                                            };
                                            break;
                                        //よじ登る
                                        case 1:
                                            return {
                                                small: resources.player_small_climb_left_texture,
                                                normal: resources.player_climb_left_texture,
                                            };
                                            break;
                                    }
                                    break;
                                //右に
                                case 1:
                                    switch (dy) {
                                        //歩く
                                        case 0:
                                            return {
                                                small: resources.player_small_walk_right_texture,
                                                normal: resources.player_walk_right_texture,
                                            };
                                            break;
                                        //よじ登る
                                        case 1:
                                            return {
                                                small: resources.player_small_climb_right_texture,
                                                normal: resources.player_climb_right_texture,
                                            };
                                            break;
                                    }
                                    break;
                            }
                            break;
                        //梯子につかまる
                        case "ladder":
                            switch (dx) {
                                case -1:
                                    switch (dy) {
                                        //左の梯子に掴まる 
                                        case 0:
                                            return {
                                                small: resources.player_small_walk_left_texture,
                                                normal: resources.player_walk_left_texture,
                                            };
                                            break;
                                    }
                                    ;
                                    break;
                                case 1:
                                    switch (dy) {
                                        //右の梯子につかまる
                                        case 0:
                                            return {
                                                small: resources.player_small_walk_right_texture,
                                                normal: resources.player_walk_right_texture,
                                            };
                                            break;
                                    }
                                    break;
                                //上の梯子につかまる
                                case 0: switch (dy) {
                                    case 1:
                                        return {
                                            small: resources.player_small_climb_up_texture,
                                            normal: resources.player_climb_up_texture,
                                        };
                                        break;
                                }
                            }
                            break;
                    }
                    break;
                case "ladder":
                    switch (newState) {
                        //梯子から穏便に落ちる
                        case "stand":
                            switch (dx) {
                                //左に
                                case -1:
                                    switch (dy) {
                                        //左の足場に下りる
                                        case 0:
                                            return {
                                                small: resources.player_small_walk_left_texture,
                                                normal: resources.player_walk_left_texture,
                                            };
                                            break;
                                        //梯子から左上によじ登る
                                        case 1:
                                            return {
                                                small: resources.player_small_climb_left_texture,
                                                normal: resources.player_climb_left_texture,
                                            };
                                            break;
                                    }
                                    break;
                                //右に
                                case 1:
                                    switch (dy) {
                                        //右の足場に下りる
                                        case 0:
                                            return {
                                                small: resources.player_small_walk_right_texture,
                                                normal: resources.player_walk_right_texture,
                                            };
                                            break;
                                        //梯子から右上によじ登る
                                        case 1:
                                            return {
                                                small: resources.player_small_climb_right_texture,
                                                normal: resources.player_climb_right_texture,
                                            };
                                            break;
                                    }
                                    break;
                                //上下に
                                case 0:
                                    switch (dy) {
                                        //下の足場に下りる
                                        case -1:
                                            return {
                                                small: resources.player_small_climb_down_texture,
                                                normal: resources.player_climb_down_texture,
                                            };
                                            break;
                                    }
                                    break;
                            }
                            break;
                        //梯子上で移動
                        case "ladder":
                            switch (dx) {
                                //左
                                case -1:
                                    switch (dy) {
                                        //左の梯子に掴まる
                                        case 0:
                                            return {
                                                small: resources.player_small_walk_left_texture,
                                                normal: resources.player_walk_left_texture,
                                            };
                                            break;
                                    }
                                    break;
                                //上下
                                case 0:
                                    switch (dy) {
                                        //上の梯子につかまる
                                        case 1:
                                            return {
                                                small: resources.player_small_climb_up_texture,
                                                normal: resources.player_climb_up_texture,
                                            };
                                            break;
                                        //下の梯子につかまる
                                        case -1:
                                            return {
                                                small: resources.player_small_climb_down_texture,
                                                normal: resources.player_climb_down_texture,
                                            };
                                            break;
                                    }
                                    break;
                                //右
                                case 1:
                                    switch (dy) {
                                        //右の梯子につかまる
                                        case 0:
                                            return {
                                                small: resources.player_small_walk_right_texture,
                                                normal: resources.player_walk_right_texture,
                                            };
                                            break;
                                    }
                                    break;
                            }
                            break;
                    }
                    break;
            }
            throw new Error("unecpected texture requested");
        }
    }
    function moveLeft(player, field) {
        let result = checkLeft(player.coord, field.terrain, 0 < player.smallCount);
        return result === null ? [player, field] : [move(player, result), turn(field, player)];
    }
    Player.moveLeft = moveLeft;
    function moveRight(player, field) {
        let result = checkRight(player.coord, field.terrain, 0 < player.smallCount);
        return result === null ? [player, field] : [move(player, result), turn(field, player)];
    }
    Player.moveRight = moveRight;
    function moveUp(player, field) {
        let result = checkUp(player.coord, field.terrain, 0 < player.smallCount);
        return result === null ? [player, field] : [move(player, result), turn(field, player)];
    }
    Player.moveUp = moveUp;
    function moveDown(player, field) {
        let result = checkDown(player.coord, field.terrain, 0 < player.smallCount);
        return result === null ? [player, field] : [move(player, result), turn(field, player)];
    }
    Player.moveDown = moveDown;
})(Player || (Player = {}));
/// <reference path="./coord.ts" />
/// <reference path="./player.ts" />
/// <reference path="./field.ts" />
/// <reference path="./renderer.ts" />
var Camera;
(function (Camera) {
    // ヒステリシスゆとり幅
    const clearanceX = 4;
    const clearanceY = 2;
    const initialY = 4;
    const smooth = 0.9; // 1フレームあたりの減衰比(0～1の無次元値)
    const accel = 1; // 1フレームあたりの速度変化
    function create() {
        return {
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
    Camera.create = create;
    function update(camera, player, field, renderer) {
        const coord = createCoord(Math.max(player.coord.x - clearanceX, Math.min(player.coord.x + clearanceX, camera.coord.x)), Math.max(initialY, Math.max(player.coord.y - clearanceY, Math.min(player.coord.y + clearanceY, camera.coord.y))));
        const targetX = coord.x * blockSize;
        const targetY = -coord.y * blockSize;
        const velocityX = Math.max(camera.velocityX * smooth - accel, Math.min(camera.velocityX * smooth + accel, // 減衰後の速度から±accellの範囲にのみ速度を更新できる
        ((targetX - camera.centerX) * (1 - smooth)))); //この速度にしておけば公比smoothの無限級数がtargetXに収束する
        const velocityY = Math.max(camera.velocityY * smooth - accel, Math.min(camera.velocityY * smooth + accel, ((targetY - camera.centerY) * (1 - smooth))));
        const centerX = camera.centerX + velocityX;
        const centerY = camera.centerY + velocityY;
        const offsetX = Math.floor(renderer.width / 2 - centerX);
        const offsetY = Math.floor(renderer.height / 2 - centerY);
        return {
            coord,
            centerX,
            centerY,
            velocityX,
            velocityY,
            offsetX,
            offsetY,
        };
    }
    Camera.update = update;
})(Camera || (Camera = {}));
let field = createField();
let player = Player.create();
let camera = Camera.create();
function animationLoop(renderer, mainScreen, resources) {
    if (resources._progress.isFinished()) {
        camera = Camera.update(camera, player, field, renderer);
        drawField(field, camera, renderer);
        drawGameObject(player, camera, renderer);
        drawTexture(resources.player_walk_left_texture, 0, 0, renderer);
        Renderer.composit(renderer, mainScreen);
        requestAnimationFrame(() => animationLoop(renderer, mainScreen, resources));
    }
    else {
        console.log("loading " + (resources._progress.rate() * 100) + "%");
        mainScreen.fillText("loading", 0, 50);
        requestAnimationFrame(() => animationLoop(renderer, mainScreen, resources));
    }
}
window.onload = () => {
    const canvas = document.getElementById("canvas");
    if (canvas === null || !(canvas instanceof HTMLCanvasElement))
        throw new Error("canvas not found");
    const mainScreen = canvas.getContext("2d");
    if (mainScreen === null)
        throw new Error("context2d not found");
    const renderer = Renderer.create(mainScreen.canvas.width / 2, mainScreen.canvas.height / 2);
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
            player = Object.assign(Object.assign({}, player), { coord: leftCoord(player.coord) });
        if (event.code === "KeyD")
            player = Object.assign(Object.assign({}, player), { coord: rightCoord(player.coord) });
        if (event.code === "KeyW")
            player = Object.assign(Object.assign({}, player), { coord: upCoord(player.coord) });
        if (event.code === "KeyS")
            player = Object.assign(Object.assign({}, player), { coord: downCoord(player.coord) });
        switch (event.code) {
            case "KeyZ":
                {
                    player = Player.shrink(player);
                }
                break;
            case "ArrowLeft":
                {
                    [player, field] = Player.moveLeft(player, field);
                }
                break;
            case "ArrowRight":
                {
                    [player, field] = Player.moveRight(player, field);
                }
                break;
            case "ArrowUp":
                {
                    [player, field] = Player.moveUp(player, field);
                }
                break;
            case "ArrowDown":
                {
                    [player, field] = Player.moveDown(player, field);
                }
                break;
        }
        console.log(player.coord);
    }, false);
    animationLoop(renderer, mainScreen, resources);
};
