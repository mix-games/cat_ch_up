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
    Renderer.layerNum = 10;
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
        tick++;
    }
    Renderer.composit = composit;
})(Renderer || (Renderer = {}));
function createEmptyTexture() {
    return {
        type: "empty"
    };
}
function createRectTexture(color, width, height) {
    return {
        type: "rect",
        color,
        width,
        height,
    };
}
function createVolumeTexture(width, height, depth, depthOffset) {
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
        lightLayers,
        shadowLayers,
        width,
        height,
        depth,
        depthOffset,
    };
}
function createAnimationTexture(textures, timeline, loop) {
    return {
        type: "animation",
        textures,
        timeline,
        loop,
    };
}
function createOffsetTexture(texture, offsetX, offsetY) {
    return {
        type: "offset",
        texture,
        offsetX,
        offsetY,
    };
}
function createFlashTexture(texture1, texture2) {
    return {
        type: "flash",
        texture1,
        texture2,
    };
}
function readyVolumeTexture(texture, image, useShadowColor) {
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
function getAnimationLength(texture) {
    switch (texture.type) {
        case "empty": return 0;
        case "rect": return 0;
        case "volume": return 0;
        case "animation": return texture.loop ? Infinity : texture.timeline[texture.timeline.length - 1];
        case "offset": return getAnimationLength(texture.texture);
        case "flash": return Math.max(getAnimationLength(texture.texture1), getAnimationLength(texture.texture1));
        //網羅チェック
        default: return texture;
    }
}
function joinAnimation(textures, loop) {
    const timeline = textures
        .map(t => getAnimationLength(t))
        .reduce((acc, cur) => [...acc, cur + acc[acc.length - 1]], [0]).slice(1);
    return createAnimationTexture(textures, timeline, loop);
}
function drawTexture(texture, x, y, elapse, renderer) {
    switch (texture.type) {
        case "empty":
            {
            }
            break;
        case "rect":
            {
                renderer.lightColor.fillStyle = texture.color;
                renderer.lightColor.fillRect(Renderer.marginLeft + x, Renderer.marginTop + y, texture.width, texture.height);
                renderer.shadowColor.fillStyle = texture.color;
                renderer.shadowColor.fillRect(Renderer.marginLeft + x, Renderer.marginTop + y, texture.width, texture.height);
            }
            break;
        case "volume":
            {
                for (let i = 0; i < texture.depth; i++) {
                    renderer.lightLayers[i + texture.depthOffset].drawImage(texture.lightLayers[i], Renderer.marginLeft + x, Renderer.marginTop + y);
                    renderer.shadowLayers[i + texture.depthOffset].drawImage(texture.shadowLayers[i], Renderer.marginLeft + x, Renderer.marginTop + y);
                }
            }
            break;
        case "animation":
            {
                const phase = texture.loop ? elapse % texture.timeline[texture.timeline.length - 1] : elapse;
                let frame = texture.timeline.findIndex(t => phase < t);
                if (frame === -1) {
                    //texture.animationEndCallback();
                    frame = Math.max(0, texture.timeline.length - 1);
                }
                drawTexture(texture.textures[frame], x, y, frame === 0 ? elapse : elapse - texture.timeline[frame - 1], renderer);
            }
            break;
        case "offset":
            {
                drawTexture(texture.texture, x - texture.offsetX, y - texture.offsetY, elapse, renderer);
            }
            break;
        case "flash":
            {
                drawTexture(elapse % 2 === 0 ? texture.texture1 : texture.texture2, x, y, elapse, renderer);
            }
            break;
        default: const never = texture;
    }
}
const resources = loadResources();
/// <reference path="./renderer.ts" />
/// <reference path="./texture.ts" />
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
        background_texture: loadStaticTexture("image/background.png", 400, 400, 200, 200, false, 1, 0),
        terrain_wall_texture: loadStaticTexture("image/terrain/wall.png", 24, 24, 10, 0, true, 1, 0),
        terrain_ladder_texture: loadStaticTexture("image/terrain/ladder.png", 24, 24, 11, 0, true, 3, 0),
        terrain_condenser_texture: loadAnimationTexture("image/terrain/condenser.png", 36, 24, 13, 0, true, [30, 60, 90], true, 7, 0),
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
        const texture = createVolumeTexture(width, height, depth, depthOffset);
        const image = loadImage(source, () => readyVolumeTexture(texture, image, useShadowColor));
        return createOffsetTexture(texture, offsetX, offsetY);
    }
    function loadAnimationTexture(source, width, height, offsetX, offsetY, useShadowColor, timeline, loop, depth, depthOffset) {
        const textures = timeline.map(() => createVolumeTexture(width, height, depth, depthOffset));
        const texture = createAnimationTexture(textures.map(t => createOffsetTexture(t, offsetX, offsetY)), timeline, loop);
        const image = loadImage(source, () => {
            textures.forEach((texture, i) => {
                const source = document.createElement("canvas");
                source.width = width;
                source.height = image.height;
                const context = source.getContext("2d");
                if (context === null)
                    throw new Error("failed to get context-2d");
                context.drawImage(image, width * i, 0, width, image.height, 0, 0, width, image.height);
                readyVolumeTexture(texture, source, useShadowColor);
            });
        });
        return texture;
    }
}
/// <reference path="./resources.ts" />
/// <reference path="./coord.ts" />
/// <reference path="./camera.ts" />
function drawGameObject(gameObject, camera, renderer) {
    drawTexture(gameObject.texture, camera.offsetX + gameObject.coord.x * blockSize, camera.offsetY - gameObject.coord.y * blockSize, tick - gameObject.animationTimestamp, renderer);
}
/// <reference path="./resources.ts" />
/// <reference path="./gameobject.ts" />
/// <reference path="./field.ts" />
function createNeko() {
    return {
        type: "neko",
        coord: createCoord(0, 5),
        texture: createOffsetTexture(createRectTexture("blue", blockSize - 4, blockSize - 2), blockSize / 2 - 2, -2),
        animationTimestamp: 0,
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
        backgroundTexture: resources.background_texture,
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
                    texture0: resources.terrain_wall_texture,
                    texture1: resources.terrain_ladder_texture,
                };
            case "solid":
                return {
                    collision: "solid",
                    texture0: resources.terrain_wall_texture,
                    texture1: resources.terrain_condenser_texture,
                };
            case "air":
                return {
                    collision: "air",
                    texture0: resources.terrain_wall_texture,
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
    drawTexture(field.backgroundTexture, renderer.width / 2, renderer.height / 2, tick, renderer);
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
            drawTexture(getBlock(field.terrain, coord).texture0, camera.offsetX + coord.x * blockSize, camera.offsetY - coord.y * blockSize, tick, renderer);
        }
    }
    for (var x = x1; x <= x2; x++) {
        for (var y = y1; y <= y2; y++) {
            if (field.terrain.length <= y)
                continue;
            const coord = createCoord(x, y);
            drawTexture(getBlock(field.terrain, coord).texture1, camera.offsetX + coord.x * blockSize, camera.offsetY - coord.y * blockSize, tick, renderer);
        }
    }
    // デバッグ用の赤い点
    //*
    for (var x = x1; x <= x2; x++) {
        for (var y = y1; y <= y2; y++) {
            if (field.terrain.length <= y)
                continue;
            const coord = createCoord(x, y);
            drawTexture(createRectTexture("red", 1, 1), camera.offsetX + coord.x * blockSize, camera.offsetY - coord.y * blockSize, tick, renderer);
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
            animationTimestamp: 0,
            texture: resources.player_stand_right_texture,
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
    function drop(coord, terrain, isSmall) {
        const state = checkState(downCoord(coord), terrain, isSmall);
        if (state === "stand" || state === "ladder")
            return { coord, state };
        return (drop(downCoord(coord), terrain, isSmall));
    }
    Player.drop = drop;
    function generateDropAnimation(jumpOffTexture, fallingTexture, landingTexture, distance) {
        const Textures = [];
        Textures.push(createOffsetTexture(jumpOffTexture, 0, distance * blockSize));
        for (let i = 0; i < distance - 1; i++) {
            Textures.push(createOffsetTexture(fallingTexture, 0, (distance - i - 1) * blockSize));
        }
        Textures.push(landingTexture);
        return joinAnimation(Textures, false);
    }
    function check(coord, terrain, isSmall, direction) {
        const currentState = checkState(coord, terrain, isSmall);
        //埋まってる場合
        if (currentState === null || currentState === "drop") {
            const dropResult = drop(coord, terrain, isSmall);
            const landing = {
                "stand": {
                    normal: resources.player_walk_left_texture,
                    small: resources.player_small_walk_left_texture,
                },
                "ladder": {
                    normal: resources.player_walk_left_texture,
                    small: resources.player_small_walk_left_texture,
                },
            }[dropResult.state];
            return {
                coord: dropResult.coord,
                state: dropResult.state,
                transition: {
                    normal: generateDropAnimation(createEmptyTexture(), resources.player_drop_left_texture, landing.normal, coord.y - dropResult.coord.y),
                    small: generateDropAnimation(createEmptyTexture(), resources.player_small_drop_left_texture, landing.normal, coord.y - dropResult.coord.y),
                },
            };
        }
        switch (direction) {
            case "input_left":
                {
                    const leftState = checkState(leftCoord(coord), terrain, isSmall);
                    switch (leftState) {
                        //左に立てるなら
                        case "stand":
                            switch (currentState) {
                                //いま立っているなら歩き
                                case "stand": return {
                                    coord: leftCoord(coord),
                                    state: leftState,
                                    transition: {
                                        small: resources.player_small_walk_left_texture,
                                        normal: resources.player_walk_left_texture,
                                    },
                                };
                                //いま梯子なら降りる
                                case "ladder": return {
                                    coord: leftCoord(coord),
                                    state: leftState,
                                    transition: {
                                        small: resources.player_small_walk_left_texture,
                                        normal: resources.player_walk_left_texture,
                                    },
                                };
                            }
                            break;
                        //左に梯子があるなら
                        case "ladder":
                            switch (currentState) {
                                // いま立っているなら掴まる
                                case "stand": return {
                                    coord: leftCoord(coord),
                                    state: leftState,
                                    transition: {
                                        small: resources.player_small_walk_left_texture,
                                        normal: resources.player_walk_left_texture,
                                    },
                                };
                                // いま梯子なら梯子上移動
                                case "ladder": return {
                                    coord: leftCoord(coord),
                                    state: leftState,
                                    transition: {
                                        small: resources.player_small_walk_left_texture,
                                        normal: resources.player_walk_left_texture,
                                    },
                                };
                            }
                            break;
                        //左が空いてるなら飛び降りる
                        case "drop":
                            {
                                const dropResult = drop(leftCoord(coord), terrain, isSmall);
                                const jumpOff = {
                                    "stand": {
                                        normal: resources.player_walk_left_texture,
                                        small: resources.player_small_walk_left_texture,
                                    },
                                    "ladder": {
                                        normal: resources.player_walk_left_texture,
                                        small: resources.player_small_walk_left_texture,
                                    },
                                }[currentState];
                                const landing = {
                                    "stand": {
                                        normal: resources.player_climb_down_texture,
                                        small: resources.player_small_climb_down_texture,
                                    },
                                    "ladder": {
                                        normal: resources.player_climb_down_texture,
                                        small: resources.player_small_climb_down_texture,
                                    },
                                }[dropResult.state];
                                return {
                                    coord: dropResult.coord,
                                    state: dropResult.state,
                                    transition: {
                                        normal: generateDropAnimation(jumpOff.normal, resources.player_drop_left_texture, landing.normal, coord.y - dropResult.coord.y),
                                        small: generateDropAnimation(jumpOff.small, resources.player_small_drop_left_texture, landing.normal, coord.y - dropResult.coord.y),
                                    },
                                };
                            }
                            break;
                        //左がふさがっていたらよじ登りを試す
                        case null: if (currentState === "stand"
                            && checkState(upCoord(coord), terrain, isSmall) !== null
                            && checkState(leftCoord(upCoord(coord)), terrain, isSmall) === "stand")
                            return {
                                coord: leftCoord(upCoord(coord)),
                                state: "stand",
                                transition: {
                                    small: resources.player_small_climb_left_texture,
                                    normal: resources.player_climb_left_texture,
                                },
                            };
                    }
                    return null;
                }
                break;
            case "input_right":
                {
                    const rightState = checkState(rightCoord(coord), terrain, isSmall);
                    switch (rightState) {
                        //右に立てるなら
                        case "stand":
                            switch (currentState) {
                                //いま立っているなら歩き
                                case "stand": return {
                                    coord: rightCoord(coord),
                                    state: rightState,
                                    transition: {
                                        small: resources.player_small_walk_right_texture,
                                        normal: resources.player_walk_right_texture,
                                    },
                                };
                                //いま梯子なら降りる
                                case "ladder": return {
                                    coord: rightCoord(coord),
                                    state: rightState,
                                    transition: {
                                        small: resources.player_small_walk_right_texture,
                                        normal: resources.player_walk_right_texture,
                                    },
                                };
                            }
                            break;
                        //右に梯子があるなら
                        case "ladder":
                            switch (currentState) {
                                // いま立っているなら掴まる
                                case "stand": return {
                                    coord: rightCoord(coord),
                                    state: rightState,
                                    transition: {
                                        small: resources.player_small_walk_right_texture,
                                        normal: resources.player_walk_right_texture,
                                    },
                                };
                                // いま梯子なら梯子上移動
                                case "ladder": return {
                                    coord: rightCoord(coord),
                                    state: rightState,
                                    transition: {
                                        small: resources.player_small_walk_right_texture,
                                        normal: resources.player_walk_right_texture,
                                    },
                                };
                            }
                            break;
                        //右が空いてるなら飛び降りる
                        case "drop":
                            {
                                const dropResult = drop(rightCoord(coord), terrain, isSmall);
                                const jumpOff = {
                                    "stand": {
                                        normal: resources.player_walk_right_texture,
                                        small: resources.player_small_walk_right_texture,
                                    },
                                    "ladder": {
                                        normal: resources.player_walk_right_texture,
                                        small: resources.player_small_walk_right_texture,
                                    },
                                }[currentState];
                                const landing = {
                                    "stand": {
                                        normal: resources.player_climb_down_texture,
                                        small: resources.player_small_climb_down_texture,
                                    },
                                    "ladder": {
                                        normal: resources.player_climb_down_texture,
                                        small: resources.player_small_climb_down_texture,
                                    },
                                }[dropResult.state];
                                return {
                                    coord: dropResult.coord,
                                    state: dropResult.state,
                                    transition: {
                                        normal: generateDropAnimation(jumpOff.normal, resources.player_drop_right_texture, landing.normal, coord.y - dropResult.coord.y),
                                        small: generateDropAnimation(jumpOff.small, resources.player_small_drop_right_texture, landing.normal, coord.y - dropResult.coord.y),
                                    },
                                };
                            }
                            break;
                        //右がふさがっていたらよじ登りを試す
                        case null: if (currentState === "stand"
                            && checkState(upCoord(coord), terrain, isSmall) !== null
                            && checkState(rightCoord(upCoord(coord)), terrain, isSmall) === "stand")
                            return {
                                coord: rightCoord(upCoord(coord)),
                                state: "stand",
                                transition: {
                                    small: resources.player_small_climb_right_texture,
                                    normal: resources.player_climb_right_texture,
                                },
                            };
                    }
                    return null;
                }
                break;
            case "input_up":
                {
                    //真上移動は梯子に登るときのみ？
                    const upState = checkState(upCoord(coord), terrain, isSmall);
                    switch (upState) {
                        case "ladder":
                            switch (currentState) {
                                //いま立ちなら、上半身（の後ろ）に梯子があるなら登る
                                case "stand":
                                    if (getBlock(terrain, isSmall ? coord : upCoord(coord)).collision === "ladder") {
                                        return {
                                            coord: upCoord(coord),
                                            state: "ladder",
                                            transition: {
                                                small: resources.player_small_climb_up_texture,
                                                normal: resources.player_climb_up_texture,
                                            },
                                        };
                                    }
                                    break;
                                //いま梯子なら登る
                                case "ladder": return {
                                    coord: upCoord(coord),
                                    state: "ladder",
                                    transition: {
                                        small: resources.player_small_climb_up_texture,
                                        normal: resources.player_climb_up_texture,
                                    },
                                };
                            }
                            break;
                    }
                    return null;
                }
                break;
            case "input_down":
                {
                    //下移動は梯子につかまってる時のみ
                    if (currentState !== "ladder")
                        return null;
                    const downState = checkState(downCoord(coord), terrain, isSmall);
                    switch (downState) {
                        //下に立てるなら降りる
                        case "stand":
                            {
                                return {
                                    coord: downCoord(coord),
                                    state: "stand",
                                    transition: {
                                        small: resources.player_small_climb_down_texture,
                                        normal: resources.player_climb_down_texture,
                                    },
                                };
                            }
                            break;
                        // 下でも梯子なら移動
                        case "ladder":
                            {
                                return {
                                    coord: downCoord(coord),
                                    state: "stand",
                                    transition: {
                                        small: resources.player_small_climb_down_texture,
                                        normal: resources.player_climb_down_texture,
                                    },
                                };
                            }
                            break;
                        //下が空いているなら飛び降りる
                        case "drop":
                            {
                                const dropResult = drop(downCoord(coord), terrain, isSmall);
                                const jumpOff = {
                                    normal: resources.player_climb_down_texture,
                                    small: resources.player_small_climb_down_texture,
                                };
                                const landing = {
                                    "stand": {
                                        normal: resources.player_climb_down_texture,
                                        small: resources.player_small_climb_down_texture,
                                    },
                                    "ladder": {
                                        normal: resources.player_climb_down_texture,
                                        small: resources.player_small_climb_down_texture,
                                    },
                                }[dropResult.state];
                                return {
                                    coord: dropResult.coord,
                                    state: dropResult.state,
                                    transition: {
                                        normal: generateDropAnimation(jumpOff.normal, resources.player_drop_right_texture, landing.normal, coord.y - dropResult.coord.y),
                                        small: generateDropAnimation(jumpOff.small, resources.player_small_drop_right_texture, landing.normal, coord.y - dropResult.coord.y),
                                    },
                                };
                            }
                            break;
                    }
                    return null;
                }
                break;
            default: return direction;
        }
    }
    Player.check = check;
    function shrink(player) {
        return updateTexture(Object.assign(Object.assign({}, player), { smallCount: 5 }));
    }
    Player.shrink = shrink;
    ;
    function selectTexture(textureVariants, smallCount) {
        if (smallCount === 1) {
            return createFlashTexture(textureVariants.small, textureVariants.normal);
        }
        return textureVariants[0 < smallCount ? "small" : "normal"];
    }
    //プレイヤーのstateを見てテクスチャを更新する。
    function updateTexture(player) {
        const textureSet = getStateTexture(player.state, player.facingDirection);
        return Object.assign(Object.assign({}, player), { animationTimestamp: tick, texture: selectTexture(textureSet, player.smallCount) });
    }
    function getStateTexture(state, facingDirection) {
        switch (state) {
            case "stand":
                {
                    switch (facingDirection) {
                        case "facing_left":
                            return {
                                small: resources.player_small_stand_left_texture,
                                normal: resources.player_stand_left_texture,
                            };
                            break;
                        case "facing_right":
                            return {
                                small: resources.player_small_stand_right_texture,
                                normal: resources.player_stand_right_texture,
                            };
                            break;
                        default: return facingDirection;
                    }
                }
                break;
            case "ladder":
                return {
                    small: resources.player_small_hold_texture,
                    normal: resources.player_hold_texture,
                };
                break;
        }
    }
    //与えられたMoveResult | nullに従ってプレイヤーを動かす
    function move(player, field, direction) {
        const result = check(player.coord, field.terrain, 0 < player.smallCount, direction);
        if (result === null)
            return [player, field];
        const transitionTexture = selectTexture(result.transition, player.smallCount);
        const stateTexture = selectTexture(getStateTexture(result.state, direction === "input_left" ? "facing_left" : "facing_right"), Math.max(0, player.smallCount - 1));
        return [Object.assign(Object.assign({}, player), { texture: joinAnimation([transitionTexture, stateTexture], false), animationTimestamp: tick, coord: result.coord, state: result.state, 
                //左に移動したときのみ左を向く。無標（上下移動）では右
                facingDirection: result.coord.x < player.coord.x ? "facing_left" : "facing_right", smallCount: Math.max(0, player.smallCount - 1) }), turn(field, player)];
    }
    Player.move = move;
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
let renderer; //デバッグ用に外に出した
let tick = 0;
function animationLoop(renderer, mainScreen, resources) {
    if (resources._progress.isFinished()) {
        camera = Camera.update(camera, player, field, renderer);
        drawField(field, camera, renderer);
        drawGameObject(player, camera, renderer);
        drawTexture(resources.player_walk_left_texture, 0, 0, 0, renderer);
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
    renderer = Renderer.create(mainScreen.canvas.width / 2, mainScreen.canvas.height / 2);
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
                    [player, field] = Player.move(player, field, "input_left");
                }
                break;
            case "ArrowRight":
                {
                    [player, field] = Player.move(player, field, "input_right");
                }
                break;
            case "ArrowUp":
                {
                    [player, field] = Player.move(player, field, "input_up");
                }
                break;
            case "ArrowDown":
                {
                    [player, field] = Player.move(player, field, "input_down");
                }
                break;
        }
        console.log(player.coord);
    }, false);
    animationLoop(renderer, mainScreen, resources);
};
