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
    return !(Field.getCollision(terrain, coord) === Field.Collision.Block);
}
function canNekoStand(coord, terrain) {
    return canNekoEnter(coord, terrain) && Field.getCollision(terrain, downCoord(coord)) === Field.Collision.Block;
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
var Field;
(function (Field) {
    Field.Collision = { Air: 1, Block: 2, Ladder: 4 };
    const anyCollision = Field.Collision.Air | Field.Collision.Block | Field.Collision.Ladder;
    function createField() {
        const x = Math.floor(Math.random() * fieldWidth);
        return annexRow({
            terrain: [
                new Array(fieldWidth).fill(0).map(_ => Field.Collision.Air),
            ],
            pendingTerrain: [
                new Array(fieldWidth).fill(0).map((_, i) => i == x ? Field.Collision.Ladder : ~Field.Collision.Block),
                new Array(fieldWidth).fill(0).map(_ => anyCollision),
            ],
            trafficGraph: new Array(fieldWidth).fill(0).map(_ => []),
            textures: [],
            entities: [createNeko()],
            backgroundTexture: resources.background_texture,
        }, 10);
    }
    Field.createField = createField;
    const fieldWidth = 10;
    //Y座標は下から数える
    function annexRow(field, targetHeight) {
        if (targetHeight <= field.textures.length)
            return field;
        return annexRow(generate(field), targetHeight);
    }
    Field.annexRow = annexRow;
    function assignTexture(row) {
        return row.map((collision) => {
            switch (collision) {
                case Field.Collision.Ladder:
                    return {
                        texture0: resources.terrain_wall_texture,
                        texture1: resources.terrain_ladder_texture,
                    };
                case Field.Collision.Block:
                    return {
                        texture0: resources.terrain_wall_texture,
                        texture1: resources.terrain_condenser_texture,
                    };
                case Field.Collision.Air:
                    return {
                        texture0: resources.terrain_wall_texture,
                        texture1: createEmptyTexture()
                    };
            }
        });
    }
    function getCollision(terrain, coord) {
        if (terrain.length <= coord.y)
            throw new Error("The accessed row has not been generated. coord:" + JSON.stringify(coord));
        if (coord.y < 0 || coord.x < 0 || fieldWidth <= coord.x)
            return Field.Collision.Block;
        return terrain[coord.y][coord.x];
    }
    Field.getCollision = getCollision;
    function getBlockTexture(field, coord) {
        if (field.textures.length <= coord.y)
            throw new Error("The accessed row has not been generated. coord:" + JSON.stringify(coord));
        if (coord.y < 0 || coord.x < 0 || fieldWidth <= coord.x)
            return {
                texture0: createEmptyTexture(),
                texture1: createEmptyTexture()
            };
        return field.textures[coord.y][coord.x];
    }
    Field.getBlockTexture = getBlockTexture;
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
                drawTexture(getBlockTexture(field, coord).texture0, camera.offsetX + coord.x * blockSize, camera.offsetY - coord.y * blockSize, tick, renderer);
            }
        }
        for (var x = x1; x <= x2; x++) {
            for (var y = y1; y <= y2; y++) {
                if (field.terrain.length <= y)
                    continue;
                const coord = createCoord(x, y);
                drawTexture(getBlockTexture(field, coord).texture1, camera.offsetX + coord.x * blockSize, camera.offsetY - coord.y * blockSize, tick, renderer);
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
    Field.drawField = drawField;
    // プレイヤー行動後の敵などの処理はここ
    function turn(field, player) {
        return annexRow(Object.assign(Object.assign({}, field), { entities: field.entities.map(e => controlEntity(e, field, player)) }), Math.max(player.coord.y + 5, ...field.entities.map(e => e.coord.y + 5)));
    }
    Field.turn = turn;
    function canEnter(terrain, x, y) {
        return getCollision(terrain, { x, y }) !== Field.Collision.Block && getCollision(terrain, { x, y: y + 1 }) !== Field.Collision.Block;
    }
    function canStand(terrain, x, y) {
        return canEnter(terrain, x, y) && (getCollision(terrain, { x, y: y - 1 }) == Field.Collision.Block || getCollision(terrain, { x, y }) == Field.Collision.Ladder);
    }
    function canGoUp(terrain, x, y) {
        return canEnter(terrain, x, y) && canStand(terrain, x, y) && canStand(terrain, x, y + 1);
    }
    function canGoDown(terrain, x, y) {
        return canEnter(terrain, x, y) && canEnter(terrain, x, y - 1);
    }
    function canGoLeft(terrain, x, y) {
        return canEnter(terrain, x, y) && canStand(terrain, x, y) && canEnter(terrain, x - 1, y);
    }
    function canGoRight(terrain, x, y) {
        return canEnter(terrain, x, y) && canStand(terrain, x, y) && canEnter(terrain, x + 1, y);
    }
    function canGoLeftUp(terrain, x, y) {
        return canEnter(terrain, x, y) && canStand(terrain, x, y) && getCollision(terrain, { x: x - 1, y }) == Field.Collision.Block && canEnter(terrain, x, y + 1) && canEnter(terrain, x - 1, y + 1);
    }
    function canGoRightUp(terrain, x, y) {
        return canEnter(terrain, x, y) && canStand(terrain, x, y) && getCollision(terrain, { x: x + 1, y }) == Field.Collision.Block && canEnter(terrain, x, y + 1) && canEnter(terrain, x + 1, y + 1);
    }
    // 配列をシャッフルした配列を返す
    function shuffle(array) {
        const array2 = [...array];
        for (let i = 0; i < array2.length; i++) {
            const j = i + Math.floor(Math.random() * (array2.length - i));
            const t = array2[i];
            array2[i] = array2[j];
            array2[j] = t;
        }
        return array2;
    }
    // 二つのグラフを合わせたグラフを作る
    function concatGraph(a, b) {
        const newGraph = new Array(a.length + b.length).fill(0).map(_ => []);
        a.forEach((v, from) => v.forEach(to => newGraph[from].push(to)));
        b.forEach((v, from) => v.forEach(to => newGraph[from + a.length].push(to + a.length)));
        return newGraph;
    }
    // n 以降の頂点とそれにつながる辺を削除する
    function dropGraph(graph, n) {
        return graph.slice(0, n).map(v => v.filter(to => to < n));
    }
    // 推移閉包を作成
    function transclosure(graph) {
        const newGraph = new Array(graph.length).fill(0).map(_ => []);
        function dfs(now, root, visited) {
            if (visited[now])
                return;
            visited[now] = true;
            newGraph[root].push(now);
            graph[now].forEach(x => dfs(x, root, visited));
        }
        graph.forEach((v, i) => v.forEach(j => dfs(j, i, new Array(graph.length).fill(false))));
        return newGraph.map(x => Array.from(new Set(x)));
    }
    // 辺の向きをすべて逆転したグラフを得る
    function reverse(graph) {
        const reversed = [];
        graph.forEach((vertex) => {
            reversed.push([]);
        });
        graph.forEach((vertex, i) => {
            vertex.forEach(j => reversed[j].push(i));
        });
        return reversed;
    }
    // 強連結成分分解
    function strongComponents(graph) {
        const reversed = reverse(graph);
        // dfs1で到達したら1、dfs2も到達したら2、いずれも未到達なら0
        const visited = new Array(graph.length).fill(0);
        // component[i] = i番目の頂点が属する強連結成分の番号
        const component = new Array(graph.length);
        let componentCount = 0;
        // 連結でないグラフに対応するためにはたぶんここをループする必要がある
        for (var i = 0; i < graph.length; i++) {
            if (visited[i] !== 0)
                continue;
            // 深さ優先探索 i<j⇒log[i] log[j]間に辺がある
            const order = [];
            function dfs1(now) {
                if (visited[now] !== 0)
                    return;
                visited[now] = 1;
                graph[now].forEach(x => dfs1(x));
                order.unshift(now);
            }
            dfs1(i);
            function dfs2(now) {
                if (visited[now] !== 1)
                    return;
                visited[now] = 2;
                component[now] = componentCount;
                reversed[now].forEach(x => dfs2(x));
            }
            for (var j = 0; j < order.length; j++) {
                if (visited[order[j]] !== 1)
                    continue;
                dfs2(order[j]);
                componentCount++;
            }
        }
        return [component, componentCount];
    }
    function generate(field) {
        const newRow = new Array(fieldWidth);
        // とりあえず確定してるところを置く
        field.pendingTerrain[0].forEach((pending, x) => {
            if (pending == Field.Collision.Air)
                newRow[x] = Field.Collision.Air;
            if (pending == Field.Collision.Block)
                newRow[x] = Field.Collision.Block;
            if (pending == Field.Collision.Ladder)
                newRow[x] = Field.Collision.Ladder;
        });
        // 自由にしていいブロックを勝手に決める。
        // 左右の対称性を保つために決定順をシャッフルする。
        shuffle(new Array(fieldWidth).fill(0).map((_, i) => i)).forEach(x => {
            const pending = field.pendingTerrain[0][x];
            if (pending == Field.Collision.Air ||
                pending == Field.Collision.Block ||
                pending == Field.Collision.Ladder)
                return;
            const candidate = [];
            if ((pending & Field.Collision.Air) !== 0) {
                // 梯子を相対的に少なくしたい
                candidate.push(Field.Collision.Air, Field.Collision.Air, Field.Collision.Air);
            }
            if ((pending & Field.Collision.Block) !== 0) {
                // 梯子を相対的に少なくしたい
                candidate.push(Field.Collision.Block, Field.Collision.Block);
                // ブロックの左右隣接を好む
                if (newRow[x - 1] === Field.Collision.Block || newRow[x + 1] === Field.Collision.Block)
                    candidate.push(Field.Collision.Block, Field.Collision.Block);
            }
            // 梯子、特に左右隣り合わせを嫌う
            if ((pending & Field.Collision.Ladder) !== 0) {
                if (newRow[x - 1] !== Field.Collision.Ladder && newRow[x + 1] !== Field.Collision.Ladder)
                    candidate.push(Field.Collision.Ladder);
            }
            newRow[x] = candidate[Math.floor(Math.random() * candidate.length)];
        });
        // 新しい行を追加
        const terrain2 = [...field.terrain, newRow];
        let pendingTerrain2 = [...field.pendingTerrain.slice(1), new Array(fieldWidth).fill(0).map((_, i) => anyCollision)];
        // ここからは追加した行に合わせて graphを更新したりpendingTerrainに条件を追加したり
        pendingTerrain2 = [pendingTerrain2[0].map((pending, x) => {
                // ブロックの上にブロックでないマスがあったらその上は高確率でブロックでない
                if (terrain2[terrain2.length - 2][x] === Field.Collision.Block &&
                    terrain2[terrain2.length - 1][x] !== Field.Collision.Block &&
                    Math.random() < 0.9)
                    pending &= ~Field.Collision.Block;
                // 梯子があったらその上は必ずブロックでない
                if (terrain2[terrain2.length - 1][x] === Field.Collision.Ladder)
                    pending &= ~Field.Collision.Block;
                // 長さ1の梯子を生成しない
                if (terrain2[terrain2.length - 1][x] === Field.Collision.Ladder &&
                    terrain2[terrain2.length - 2][x] !== Field.Collision.Ladder)
                    pending &= Field.Collision.Ladder;
                return pending;
            }), ...pendingTerrain2.slice(1)];
        // 生成されたterrainに合わせてgraphを更新
        // 後ろに下の段の頂点を追加しておく
        let graph2 = concatGraph(new Array(fieldWidth).fill(0).map(_ => []), field.trafficGraph);
        const tempTerrain = [...terrain2, ...pendingTerrain2.map(row => row.map(x => x & Field.Collision.Block ? Field.Collision.Block : !(x & Field.Collision.Ladder) ? Field.Collision.Air : Field.Collision.Ladder))];
        // 上下移動を繋ぐ
        for (let i = 0; i < fieldWidth; i++) {
            if (canGoUp(tempTerrain, i, terrain2.length - 2))
                graph2[i + fieldWidth].push(i);
            if (canGoDown(tempTerrain, i, terrain2.length - 1))
                graph2[i].push(i + fieldWidth);
        }
        // 左右、斜め移動を繋ぐ
        for (let i = 0; i < fieldWidth - 1; i++) {
            if (canGoRight(tempTerrain, i, terrain2.length - 1))
                graph2[i].push(i + 1);
            if (canGoLeft(tempTerrain, i + 1, terrain2.length - 1))
                graph2[i + 1].push(i);
            //　前の行では未確定だった左右移動があるかもしれないので追加
            if (canGoRight(tempTerrain, i, terrain2.length - 2))
                graph2[i + fieldWidth].push(i + 1 + fieldWidth);
            if (canGoLeft(tempTerrain, i + 1, terrain2.length - 2))
                graph2[i + 1 + fieldWidth].push(i + fieldWidth);
            if (canGoRightUp(tempTerrain, i, terrain2.length - 2))
                graph2[i + fieldWidth].push(i + 1);
            if (canGoLeftUp(tempTerrain, i + 1, terrain2.length - 2))
                graph2[i + 1 + fieldWidth].push(i);
        }
        // 推移閉包を取った上で、後ろに入れておいた古い頂点を落とす
        graph2 = dropGraph(transclosure(graph2), fieldWidth);
        // graphにあわせてpendingを更新
        // 強連結成分分解
        const [component, componentCount] = strongComponents(graph2);
        //各辺を見て、各強連結成分にいくつの入り口と出口があるか数える
        const entranceCount = new Array(componentCount).fill(0);
        const exitCount = new Array(componentCount).fill(0);
        graph2.forEach((v, from) => {
            v.forEach(to => {
                if (component[from] !== component[to]) {
                    exitCount[component[from]]++;
                    entranceCount[component[to]]++;
                }
            });
        });
        const componentsWithoutEntrance = [];
        const componentsWithoutExit = [];
        //入り口のない強連結成分、出口のない成分のメンバーを成分ごとに分けてリストアップする
        for (let i = 0; i < componentCount; i++) {
            if (exitCount[i] !== 0 && entranceCount[i] !== 0)
                continue;
            const members = [];
            for (let j = 0; j < field.trafficGraph.length; j++)
                if (component[j] === i)
                    members.push(j);
            if (exitCount[i] === 0)
                componentsWithoutExit.push([...members]);
            if (entranceCount[i] === 0)
                componentsWithoutEntrance.push([...members]);
        }
        // 制約パターンの組み合わせを列挙（二次元配列の各行から一つずつ選べればOK）
        const patternList = [
            ...componentsWithoutEntrance.map(points => {
                const list = [];
                points.forEach(x => {
                    // 立ち入れない点は孤立点だが出口を作る必要はない
                    if (!canEnter(tempTerrain, x, terrain2.length - 1))
                        return;
                    //上2個がブロックでなければ入り口になる
                    list.push({ pattern: [[~Field.Collision.Block], [~Field.Collision.Block]], offsetX: x });
                });
                return list;
            }),
            ...componentsWithoutExit.map(points => {
                const list = [];
                points.forEach(x => {
                    // 立ち入れない点は孤立点だが出口を作る必要はない
                    if (!canEnter(tempTerrain, x, terrain2.length - 1))
                        return;
                    // 立てない点に出口を作っても手遅れ
                    if (!canStand(tempTerrain, x, terrain2.length - 1))
                        return;
                    //上に梯子を作れば出口になる
                    list.push({ pattern: [[Field.Collision.Ladder]], offsetX: x });
                    //隣がブロックなら斜め上に立ち位置を作れば出口になる
                    if (terrain2[terrain2.length - 1][x - 1] == Field.Collision.Block)
                        list.push({ pattern: [[~Field.Collision.Block, ~Field.Collision.Block], [~Field.Collision.Block, ~Field.Collision.Block]], offsetX: x - 1 });
                    if (terrain2[terrain2.length - 1][x + 1] == Field.Collision.Block)
                        list.push({ pattern: [[~Field.Collision.Block, ~Field.Collision.Block], [~Field.Collision.Block, ~Field.Collision.Block, ~Field.Collision.Block]], offsetX: x });
                });
                return list;
            }),
        ].filter(x => 0 < x.length).map(x => shuffle(x));
        function putCollisionPattern(pendingTerrain, pattern, offsetX) {
            const pendingTerrain2 = pendingTerrain.map((row, y) => row.map((a, x) => {
                return a & (pattern[y] !== undefined && pattern[y][x - offsetX] !== undefined ? pattern[y][x - offsetX] : anyCollision);
            }));
            if (pendingTerrain2.some(row => row.some(p => p == 0)))
                return null;
            return pendingTerrain2;
        }
        // 制約パターンが矛盾しないような組み合わせを探して設置する（多分どう選んでも矛盾しないけど）
        function rec(pendingTerrain, patternList) {
            if (patternList.length === 0)
                return pendingTerrain;
            const head = patternList[0];
            const tail = patternList.slice(1);
            for (let i = 0; i < head.length; i++) {
                const pendingTerrain2 = putCollisionPattern(pendingTerrain, head[i].pattern, head[i].offsetX);
                if (pendingTerrain2 == null)
                    return null;
                const result = rec(pendingTerrain2, tail);
                if (result !== null)
                    return result;
            }
            return null;
        }
        const pendingTerrain3 = rec(pendingTerrain2, patternList);
        if (pendingTerrain3 === null)
            throw new Error();
        const field2 = Object.assign(Object.assign({}, field), { textures: terrain2.map(row => assignTexture(row)), terrain: terrain2, pendingTerrain: pendingTerrain3, trafficGraph: graph2 });
        // 以下デバッグ表示
        console.log(graph2);
        const entranceId1 = new Array(fieldWidth).fill("  ");
        const entranceId2 = new Array(fieldWidth).fill("  ");
        componentsWithoutEntrance.forEach((a, i) => a.forEach(x => { entranceId2[x] = i < 10 ? " " + i : "" + i; if (canEnter(tempTerrain, x, terrain2.length - 1))
            entranceId1[x] = i < 10 ? " " + i : "" + i; }));
        console.log("entrance↓");
        //console.log(entranceList);
        console.log(" " + entranceId1.join(""));
        console.log("(" + entranceId2.join("") + ")");
        const exitId1 = new Array(fieldWidth).fill("  ");
        const exitId2 = new Array(fieldWidth).fill("  ");
        componentsWithoutExit.forEach((a, i) => a.forEach(x => { exitId2[x] = i < 10 ? " " + i : "" + i; if (canEnter(tempTerrain, x, terrain2.length - 1))
            exitId1[x] = i < 10 ? " " + i : "" + i; }));
        console.log("exit↑");
        //console.log(exitList);
        console.log(" " + exitId1.join(""));
        console.log("(" + exitId2.join("") + ")");
        show(field2);
        function show(field) {
            function collisionToString(coll) {
                switch (coll) {
                    case Field.Collision.Air: return "  ";
                    case Field.Collision.Block: return "[]";
                    case Field.Collision.Ladder: return "|=";
                }
            }
            console.log("terrain:");
            [...field.terrain].reverse().forEach(line => console.log(":" + line.map(collisionToString).join("") + ":"));
        }
        if (exitId1.join("").trim() == "" || entranceId1.join("").trim() == "")
            throw new Error("no Exit or Entrance");
        return field2;
    }
})(Field || (Field = {}));
/// <reference path="./resources.ts" />
/// <reference path="./gameobject.ts" />
/// <reference path="./field.ts" />
var Player;
(function (Player) {
    function create() {
        return {
            state: "stand",
            coord: createCoord(0, 0),
            facingDirection: "facing_right",
            smallCount: 0,
            animationTimestamp: 0,
            texture: resources.player_stand_right_texture,
            acceptInput: true,
        };
    }
    Player.create = create;
    // その場所でプレイヤーがどのようにあるべきか
    function checkState(coord, terrain, isSmall) {
        if (isSmall) {
            const ground = Field.getCollision(terrain, downCoord(coord));
            const body = Field.getCollision(terrain, coord);
            if (body === Field.Collision.Block)
                return null;
            if (ground === Field.Collision.Block)
                return "stand";
            if (body === Field.Collision.Ladder)
                return "ladder";
            if (body === Field.Collision.Air)
                return "drop";
            //意味わからんけど網羅チェックとして機能するらしい
            return body;
        }
        else {
            const ground = Field.getCollision(terrain, downCoord(coord));
            const foot = Field.getCollision(terrain, coord);
            const head = Field.getCollision(terrain, upCoord(coord));
            if (head === Field.Collision.Block || foot === Field.Collision.Block)
                return null;
            if (ground === Field.Collision.Block)
                return "stand";
            if (head === Field.Collision.Ladder)
                return "ladder";
            if (head === Field.Collision.Air)
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
    //checkState(coord)が"drop"かnullであることを確認してから呼ぶ
    function drop(coord, terrain, isSmall, jumpoffState, direction, distance = 1) {
        const state = checkState(downCoord(coord), terrain, isSmall);
        if (state === "drop" || state === null)
            return (drop(downCoord(coord), terrain, isSmall, jumpoffState, direction, distance + 1));
        const jumpOff = {
            left: {
                "stand": {
                    normal: resources.player_walk_left_texture,
                    small: resources.player_small_walk_left_texture,
                },
                "ladder": {
                    normal: resources.player_walk_left_texture,
                    small: resources.player_small_walk_left_texture,
                },
            },
            right: {
                "stand": {
                    normal: resources.player_walk_right_texture,
                    small: resources.player_small_walk_right_texture,
                },
                "ladder": {
                    normal: resources.player_walk_right_texture,
                    small: resources.player_small_walk_right_texture,
                },
            },
            down: {
                "stand": {
                    normal: resources.player_climb_down_texture,
                    small: resources.player_small_climb_down_texture,
                },
                "ladder": {
                    normal: resources.player_climb_down_texture,
                    small: resources.player_small_climb_down_texture,
                },
            }
        }[direction][jumpoffState];
        const landing = {
            "stand": {
                normal: resources.player_climb_down_texture,
                small: resources.player_small_climb_down_texture,
            },
            "ladder": {
                normal: resources.player_climb_down_texture,
                small: resources.player_small_climb_down_texture,
            },
        }[state];
        return {
            coord: downCoord(coord),
            state: state,
            transition: {
                normal: generateDropAnimation(jumpOff.normal, resources.player_drop_left_texture, landing.normal, distance),
                small: generateDropAnimation(jumpOff.small, resources.player_small_drop_left_texture, landing.normal, distance),
            },
        };
        function generateDropAnimation(jumpOffTexture, fallingTexture, landingTexture, distance) {
            const Textures = [];
            Textures.push(createOffsetTexture(jumpOffTexture, 0, distance * blockSize));
            for (let i = 0; i < distance - 1; i++) {
                Textures.push(createOffsetTexture(fallingTexture, 0, (distance - i - 1) * blockSize));
            }
            Textures.push(landingTexture);
            return joinAnimation(Textures, false);
        }
    }
    Player.drop = drop;
    function checkLeft(coord, currentState, terrain, isSmall) {
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
                    return drop(leftCoord(coord), terrain, isSmall, currentState, "left");
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
    Player.checkLeft = checkLeft;
    function checkRight(coord, currentState, terrain, isSmall) {
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
                    return drop(rightCoord(coord), terrain, isSmall, currentState, "right");
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
    Player.checkRight = checkRight;
    function checkUp(coord, currentState, terrain, isSmall) {
        //真上移動は梯子に登るときのみ？
        const upState = checkState(upCoord(coord), terrain, isSmall);
        switch (upState) {
            case "ladder":
                switch (currentState) {
                    //いま立ちなら、上半身（の後ろ）に梯子があるなら登る
                    case "stand":
                        if (Field.getCollision(terrain, isSmall ? coord : upCoord(coord)) === Field.Collision.Ladder) {
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
    Player.checkUp = checkUp;
    function checkDown(coord, currentState, terrain, isSmall) {
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
                    return drop(downCoord(coord), terrain, isSmall, currentState, "down");
                }
                break;
        }
        return null;
    }
    Player.checkDown = checkDown;
    function shrink(player, field) {
        return transitionEnd(Object.assign(Object.assign({}, player), { smallCount: 5 }), field);
    }
    Player.shrink = shrink;
    ;
    function selectTexture(textureVariants, smallCount) {
        if (smallCount === 1) {
            return createFlashTexture(textureVariants.small, textureVariants.normal);
        }
        return textureVariants[0 < smallCount ? "small" : "normal"];
    }
    // 遷移アニメーション再生後にプレイヤーのstateを見てsmallCountとテクスチャを更新する。
    function transitionEnd(player, field) {
        const smallCount = Math.max(0, player.smallCount - 1);
        const currentState = checkState(player.coord, field.terrain, 0 < smallCount);
        //埋まってなければテクスチャを更新するだけ
        if (currentState === "stand" || currentState === "ladder") {
            const textureSet = getStateTexture(player.state, player.facingDirection);
            return {
                coord: player.coord,
                state: currentState,
                smallCount: smallCount,
                texture: selectTexture(textureSet, smallCount),
                facingDirection: player.facingDirection,
                animationTimestamp: tick,
                acceptInput: true,
            };
        }
        else {
            //埋まっていたら落とさなきゃいけない
            const dropResult = drop(player.coord, field.terrain, 0 < smallCount, "stand", "down");
            return {
                coord: dropResult.coord,
                state: dropResult.state,
                smallCount: smallCount,
                texture: selectTexture(dropResult.transition, smallCount),
                facingDirection: player.facingDirection,
                animationTimestamp: tick,
                acceptInput: false,
            };
        }
    }
    Player.transitionEnd = transitionEnd;
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
        const result = {
            input_left: checkLeft,
            input_right: checkRight,
            input_up: checkUp,
            input_down: checkDown,
        }[direction](player.coord, player.state, field.terrain, 0 < player.smallCount);
        if (result === null)
            return [player, field];
        const transitionTexture = selectTexture(result.transition, player.smallCount);
        return [{
                coord: result.coord,
                state: result.state,
                smallCount: player.smallCount,
                texture: transitionTexture,
                facingDirection: direction === "input_left" ? "facing_left" : "facing_right",
                animationTimestamp: tick,
                acceptInput: false,
            }, Field.turn(field, player)];
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
let field = Field.createField();
let player = Player.create();
let camera = Camera.create();
let renderer; //デバッグ用に外に出した
let tick = 0;
function animationLoop(renderer, mainScreen, resources) {
    if (resources._progress.isFinished()) {
        camera = Camera.update(camera, player, field, renderer);
        Field.drawField(field, camera, renderer);
        drawGameObject(player, camera, renderer);
        if (getAnimationLength(player.texture) < tick - player.animationTimestamp)
            player = Player.transitionEnd(player, field);
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
                    player = Player.shrink(player, field);
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
