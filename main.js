"use strict";
let trafficDigraphForTest = new Map(); //テスト
function createTrafficDigraph(lowerBound, upperBound, field) {
    const digraph = new Map();
    // とりあえず虚無の頂点リストを作る（埋まってないマスのみで構成）
    for (let y = lowerBound; y < upperBound; y++) {
        for (let x = 0; x < fieldWidth; x++) {
            const coord = { x, y };
            if (canEnter(coord, field, false))
                digraph.set(JSON.stringify(coord), { coord, inflow: [], outflow: [] });
        }
    }
    for (let y = lowerBound; y < upperBound; y++) {
        for (let x = 0; x < fieldWidth; x++) {
            const coord = { x, y };
            if (!canEnter(coord, field, false))
                continue;
            //空中のマスは落ちるだけできる
            if (!canStand(coord, field, false)) {
                addArrow(digraph, coord, downCoord(coord));
                continue;
            }
            const left = checkLeft(coord, field, false);
            if (left !== null)
                addArrow(digraph, coord, left.coord);
            const right = checkRight(coord, field, false);
            if (right !== null)
                addArrow(digraph, coord, right.coord);
            const down = checkDown(coord, field, false);
            if (down !== null)
                addArrow(digraph, coord, down.coord);
            const up = checkUp(coord, field, false);
            if (up !== null)
                addArrow(digraph, coord, up.coord);
        }
    }
    return digraph;
    function addArrow(digraph, from, to) {
        const fromVertex = digraph.get(JSON.stringify(from));
        const toVertex = digraph.get(JSON.stringify(to));
        // どちらかの頂点が範囲外なら無視
        if (fromVertex === undefined || toVertex === undefined)
            return;
        fromVertex.outflow.push(toVertex);
        toVertex.inflow.push(fromVertex);
    }
}
let sccs = new Map(); //テスト
// 強連結成分(stronglyConnectedComponent) 分解
function sccDecomposition(vertexes) {
    const seen = new Map();
    const decomposition = new Map();
    let root = vertexes[0];
    // 全部巡回できてなかったら、次の根を選ぶ
    while (root !== undefined) {
        const stack = [];
        outflowRecursion(root, seen, stack);
        // 全部巡回出来てなかったらstackの先頭から次の根を選ぶ
        let root2 = stack[0];
        while (root2 !== undefined) {
            const component = { vertexes: [], inflow: new Set(), outflow: new Set() };
            inflowRecursion(root2, seen, component, decomposition);
            root2 = stack.find(v => seen.get(v) === 1);
        }
        // 適当な未探索ノードを選ぶ
        root = vertexes.find(v => seen.get(v) === undefined);
    }
    vertexes.forEach((vertex) => {
        const component = decomposition.get(vertex);
        if (component === undefined)
            throw new Error("んなはずない");
        component.vertexes.push(vertex);
        vertex.outflow.forEach(to => {
            const toComponent = decomposition.get(to);
            if (toComponent === undefined)
                throw new Error("んなはずない2");
            component.outflow.add(toComponent);
        });
        vertex.inflow.forEach(from => {
            const fromComponent = decomposition.get(from);
            if (fromComponent === undefined)
                throw new Error("んなはずない3");
            component.outflow.add(fromComponent);
        });
    });
    return decomposition;
    //一つ目の再帰
    function outflowRecursion(currentVertex, seen, stack) {
        // 巡回済みなら何もせず帰る
        if (seen.get(currentVertex) !== undefined)
            return;
        // 巡回済みフラグを残す（coordがIDのようにふるまうはず）
        seen.set(currentVertex, 1);
        // 行きがけ順でstackに記録
        stack.push(currentVertex);
        // 深さ優先探索
        currentVertex.outflow.forEach(to => outflowRecursion(to, seen, stack));
    }
    //二つ目の再帰
    function inflowRecursion(currentVertex, seen, component, decomposition) {
        // 巡回済みまたは一つ目の再帰で未巡回なら何もせず帰る
        if (seen.get(currentVertex) !== 1)
            return;
        // 巡回済みフラグを残す
        seen.set(currentVertex, 2);
        // componentに追加
        decomposition.set(currentVertex, component);
        // 深さ優先探索
        currentVertex.inflow.forEach(from => inflowRecursion(from, seen, component, decomposition));
    }
}
//テスト
function drawDigraphForTest(camera, screen) {
    screen.fillStyle = "lightgray";
    trafficDigraphForTest.forEach((vertex) => {
        vertex.outflow.forEach((to) => {
            drawArrow(camera.offsetX + (vertex.coord.x + 0.5) * blockSize, camera.offsetY - (vertex.coord.y - 0.5) * blockSize, camera.offsetX + (to.coord.x + 0.5) * blockSize, camera.offsetY - (to.coord.y - 0.5) * blockSize);
        });
    });
    screen.fillStyle = "black";
    Array.from(new Set(sccs.values())).forEach((component, componentIndex) => component.vertexes.forEach(vertex => {
        screen.fillText(componentIndex.toString(), camera.offsetX + (vertex.coord.x) * blockSize, camera.offsetY - (vertex.coord.y - 1) * blockSize);
    }));
    //alert("こんにちは")
    //camera.offsetX + coord.x * blockSize, camera.offsetY - coord.y * blockSize
    function drawArrow(fromX, fromY, toX, toY) {
        const arrowX = toX - fromX;
        const arrowY = toY - fromY;
        const arrowL = Math.sqrt(arrowX * arrowX + arrowY * arrowY);
        const thicknessX = 3 * -arrowY / arrowL;
        const thicknessY = 3 * arrowX / arrowL;
        screen.beginPath();
        screen.moveTo(fromX, fromY);
        screen.lineTo(fromX + thicknessX, fromY + thicknessY);
        screen.lineTo(toX + thicknessX, toY + thicknessY);
        screen.fill();
    }
}
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
function createEmptyTexture() {
    return {
        draw: () => { }
    };
}
// 四角を描画するテクスチャ
function createRectTexture(lightColor, width, height, offsetX, offsetY, shadowColor = lightColor) {
    return {
        draw: (x, y, renderer, resources) => {
            renderer.lightColor.fillStyle = lightColor;
            renderer.lightColor.fillRect(x - offsetX, y - offsetY, width, height);
            renderer.shadowColor.fillStyle = shadowColor;
            renderer.shadowColor.fillRect(x - offsetX, y - offsetY, width, height);
        }
    };
}
// ただの（アニメーションしない、影も落とさないし受けない）テクスチャを作る
function createStaticTexture(source, offsetX, offsetY, useShadowColor) {
    return createAnimationVolumeTexture(source, offsetX, offsetY, -1, [], false, -1, useShadowColor, []);
}
function createStaticVolumeTexture(source, offsetX, offsetY, sh, useShadowColor, volumeLayout) {
    return createAnimationVolumeTexture(source, offsetX, offsetY, -1, [], false, sh, useShadowColor, volumeLayout);
}
function createAnimationTexture(source, offsetX, offsetY, sw, timeline, loop) {
    return createAnimationVolumeTexture(source, offsetX, offsetY, sw, timeline, loop, -1, false, []);
}
function createAnimationVolumeTexture(source, offsetX, offsetY, sw, timeline, loop, sh, useShadowColor, volumeLayout) {
    const startTime = new Date().getTime();
    return {
        draw: (x, y, renderer, resources) => {
            const image = resources.get(source);
            if (image === undefined) {
                console.log("not loaded yet");
                return;
            }
            if (sh === -1)
                sh = image.height;
            if (sw === -1)
                sw = image.width;
            const elapse = new Date().getTime() - startTime;
            const phase = loop ? elapse % timeline[timeline.length - 1] : elapse;
            let frame = timeline.findIndex(t => phase < t);
            if (frame === -1)
                frame = Math.max(0, timeline.length - 1);
            renderer.lightColor.drawImage(image, sw * frame, // アニメーションによる横位置
            0, // どんなテクスチャでも1番目はlightColor（ほんとか？）
            sw, sh, x - offsetX, y - offsetY, sw, sh);
            renderer.shadowColor.drawImage(image, sw * frame, // アニメーションによる横位置
            useShadowColor ? sh : 0, // useShadowColorがfalseのときはlightColorを流用する
            sw, sh, x - offsetX, y - offsetY, sw, sh);
            volumeLayout.forEach((target, layout) => renderer.volumeLayers[target].drawImage(image, sw * frame, // アニメーションによる横位置
            (layout + (useShadowColor ? 2 : 1)) * sh, // （色を除いて）上からlayout枚目の画像targetlayerに書く
            sw, sh, x - offsetX, y - offsetY, sw, sh));
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
        neko: createNeko()
    };
    for (let i = 0; i < 10; i++)
        generateRow(field);
    trafficDigraphForTest = createTrafficDigraph(0, 8, field); //テスト
    sccs = sccDecomposition(Array.from(trafficDigraphForTest.values()));
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
                    texture: createRectTexture("red", blockSize, blockSize, blockSize / 2, blockSize / 2)
                };
            case "solid":
                return {
                    collision: "solid",
                    texture: createRectTexture("black", blockSize, blockSize, blockSize / 2, blockSize / 2)
                };
            case "air":
                return {
                    collision: "air",
                    texture: createEmptyTexture()
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
            texture: createEmptyTexture()
        };
    return terrain[coord.y][coord.x];
}
function createPlayer() {
    return {
        coord: { x: 0, y: 0 },
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
        coord: { x: 0, y: 5 },
        texture: createRectTexture("blue", blockSize - 4, blockSize - 2, blockSize / 2 - 2, blockSize / 2 - 2)
    };
}
function controlNeko(neko, field, player) {
    neko.coord.x++;
}
function createCamera() {
    const clearanceX = 4;
    const clearanceY = 4;
    return {
        // ヒステリシスゆとり幅
        clearanceX,
        clearanceY,
        // カメラ中心の移動目標マス
        coord: { x: clearanceX, y: clearanceY },
        // カメラ中心のスクリーン座標(移動アニメーション折り込み)
        centerX: clearanceX * blockSize,
        centerY: -clearanceY * blockSize,
        // カメラの移動速度
        velocityX: 0,
        velocityY: 0,
        // 描画用オフセット（スクリーン左上座標）
        offsetX: 0,
        offsetY: 0,
    };
}
function updateCamera(camera, player, field, renderer) {
    if (camera.coord.x > player.coord.x + camera.clearanceX)
        camera.coord.x = player.coord.x + camera.clearanceX;
    if (camera.coord.x < player.coord.x - camera.clearanceX)
        camera.coord.x = player.coord.x - camera.clearanceX;
    if (camera.coord.y > player.coord.y + camera.clearanceY)
        camera.coord.y = player.coord.y + camera.clearanceY;
    if (camera.coord.y < player.coord.y - camera.clearanceY)
        camera.coord.y = player.coord.y - camera.clearanceY;
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
        drawDigraphForTest(camera, renderer.lightColor); //テスト
        testAnimation.draw(40, 40, renderer, loadingProgress.imageResources);
        composit(renderer, mainScreen);
    }
    else {
        console.log("loading " + loadingProgress.finishedCount + "/" + loadingProgress.registeredCount);
        mainScreen.fillText("loading", 0, 0);
    }
    requestAnimationFrame(() => animationLoop(field, player, camera, renderer, mainScreen, loadingProgress));
}
let testAnimation;
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
    const loadingProgress = resourceLoader(["test.png"]);
    testAnimation = createAnimationTexture("test.png", 0, 0, 32, [30, 60, 90, 120, 150, 180, 210, 240], true);
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
    }, false);
    animationLoop(field, player, camera, renderer, mainScreen, loadingProgress);
};
