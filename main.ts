type ImageResources = Map<string, HTMLImageElement>;
type AudioResources = Map<string, HTMLAudioElement>;
interface LoadingProgress {
    finishedCount: number;
    registeredCount: number;
    imageResources: ImageResources;
    audioResources: AudioResources;
}
function resourceLoader(sources: string[], callback: () => void = () => { }, progress: LoadingProgress = {
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
        else throw new Error("unknown extension");
    });

    return progress;
}

interface Renderer {
    lightColor: CanvasRenderingContext2D;
    shadowColor: CanvasRenderingContext2D;
    volumeLayers: CanvasRenderingContext2D[];

    compositScreen: CanvasRenderingContext2D;
    shadowAccScreens: CanvasRenderingContext2D[];

    compositOffsetX: number;
    compositOffsetY: number;
}

function createRenderer(width: number, height: number): Renderer {
    const marginTop = 28;
    const marginLeft = 28;
    const marginRignt = 0;
    const marginBottom = 0;

    const lightColor = create2dScreen(marginLeft + width + marginRignt, marginTop + height + marginBottom);
    const shadowColor = create2dScreen(marginLeft + width + marginRignt, marginTop + height + marginBottom);
    const volumeLayers: CanvasRenderingContext2D[] = [];
    for (let i = 0; i < 6; i++)
        volumeLayers.push(create2dScreen(marginLeft + width + marginRignt, marginTop + height + marginBottom));

    const shadowAccScreens: CanvasRenderingContext2D[] = [];
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

    function create2dScreen(width: number, height: number): CanvasRenderingContext2D {
        let canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        let context = canvas.getContext("2d");
        if (context === null) throw new Error("failed to get 2D context");
        return context;
    }
}

function composit(renderer: Renderer, mainScreen: CanvasRenderingContext2D): void {
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
        renderer.compositScreen.drawImage(renderer.shadowAccScreens[i].canvas,
            renderer.compositOffsetX + shadowDirectionX,
            renderer.compositOffsetY + shadowDirectionY);
        //見えなくなる部分を隠す
        renderer.compositScreen.globalCompositeOperation = "destination-out";
        renderer.compositScreen.drawImage(
            renderer.volumeLayers[i].canvas, renderer.compositOffsetX, renderer.compositOffsetY);
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

    function clearScreen(screen: CanvasRenderingContext2D): void {
        screen.clearRect(0, 0, screen.canvas.width, screen.canvas.height);
    }
}

interface Texture {
    // これの実装を色々にしてアニメーションなどを表現する
    draw: (x: number, y: number, renderer: Renderer, resources: ImageResources) => void;
}

function createEmptyTexture(): Texture {
    return {
        draw: () => {}
    };
}

// 四角を描画するテクスチャ
function createRectTexture(lightColor: string, width: number, height: number, offsetX: number, offsetY: number, shadowColor: string = lightColor): Texture {
    return {
        draw: (x: number, y: number, renderer: Renderer, resources: ImageResources) => {
            renderer.lightColor.fillStyle = lightColor;
            renderer.lightColor.fillRect(x - offsetX, y - offsetY, width, height);
            renderer.shadowColor.fillStyle = shadowColor;
            renderer.shadowColor.fillRect(x - offsetX, y - offsetY, width, height);
        }
    };
}

// ただの（アニメーションしない、影も落とさないし受けない）テクスチャを作る
function createStaticTexture(source: string, offsetX: number, offsetY: number, useShadowColor: boolean): Texture {
    return createAnimationVolumeTexture(source, offsetX, offsetY, -1, [], false, -1, useShadowColor, []);
}

function createStaticVolumeTexture(source: string, offsetX: number, offsetY: number, sh: number, useShadowColor: boolean, volumeLayout: number[]): Texture {
    return createAnimationVolumeTexture(source, offsetX, offsetY, -1, [], false, sh, useShadowColor, volumeLayout);
}

function createAnimationTexture(source: string, offsetX: number, offsetY: number, sw: number, timeline: number[], loop: boolean): Texture {
    return createAnimationVolumeTexture(source, offsetX, offsetY, sw, timeline, loop, -1, false, []);
}

function createAnimationVolumeTexture(source: string, offsetX: number, offsetY: number, sw: number, timeline: number[], loop: boolean, sh: number, useShadowColor: boolean, volumeLayout: number[]): Texture {
    const startTime = new Date().getTime();
    return {
        draw: (x: number, y: number, renderer: Renderer, resources: ImageResources) => {
            const image = resources.get(source);
            if (image === undefined) { console.log("not loaded yet"); return; }

            if (sh === -1) sh = image.height;
            if (sw === -1) sw = image.width;

            const elapse = new Date().getTime() - startTime;
            const phase = loop ? elapse % timeline[timeline.length - 1] : elapse;

            let frame = timeline.findIndex(t => phase < t);
            if (frame === -1) frame = Math.max(0, timeline.length - 1);

            renderer.lightColor.drawImage(
                image,
                sw * frame, // アニメーションによる横位置
                0,          // どんなテクスチャでも1番目はlightColor（ほんとか？）
                sw, sh,
                x - offsetX,
                y - offsetY,
                sw, sh);

            renderer.shadowColor.drawImage(image,
                sw * frame, // アニメーションによる横位置
                useShadowColor ? sh : 0, // useShadowColorがfalseのときはlightColorを流用する
                sw, sh,
                x - offsetX,
                y - offsetY,
                sw, sh);
            
            volumeLayout.forEach((target, layout) => 
                renderer.volumeLayers[target].drawImage(image,
                    sw * frame, // アニメーションによる横位置
                    (layout + (useShadowColor ? 2 : 1)) * sh,　// （色を除いて）上からlayout枚目の画像targetlayerに書く
                    sw, sh,
                    x - offsetX,
                    y - offsetY,
                    sw, sh)
            );
        }
    };
}

interface Coord {
    x: number;
    y: number;
}
interface BlockWithoutTexture {
    collision: "ladder" | "solid" | "air";
}
interface Block {
    collision: "ladder" | "solid" | "air";
    texture: Texture;
}
interface Field {
    terrain: Block[][];
    neko: Neko;
}

function upCoord(coord: Coord): Coord {
    return { x: coord.x, y: coord.y + 1 };
}
function downCoord(coord: Coord): Coord {
    return { x: coord.x, y: coord.y - 1 };
}
function leftCoord(coord: Coord): Coord {
    return { x: coord.x - 1, y: coord.y };
}
function rightCoord(coord: Coord): Coord {
    return { x: coord.x + 1, y: coord.y };
}

function createField(): Field {
    let field: Field = {
        terrain: [],
        neko: createNeko()
    };
    for (let i = 0; i < 10; i++) generateRow(field);
    return field;
}

const fieldWidth = 10;

//Y座標は下から数える
function generateRow(field: Field): void {
    const protoRow: BlockWithoutTexture[] = [];
    for (let x = 0; x < 10; x++) {
        if (Math.random() < 0.7)
            protoRow[x] = { collision: "air" };
        else if (Math.random() < 0.5)
            protoRow[x] = { collision: "solid" };
        else
            protoRow[x] = { collision: "ladder" };
    }
    const row = protoRow.map((bwt: BlockWithoutTexture): Block => {
        if (bwt.collision === "ladder")
            return {
                collision: "ladder",
                texture: createRectTexture("red", blockSize, blockSize, blockSize / 2, blockSize / 2)
            };
        else if (bwt.collision === "solid")
            return {
                collision: "solid",
                texture: createRectTexture("black", blockSize, blockSize, blockSize / 2, blockSize / 2)
            };
        else return {
            collision: "air",
            texture: createEmptyTexture()
        };
    });
    field.terrain.push(row);
}

function getBlock(terrain: Block[][], coord: Coord): Block {
    if (coord.y < 0 || coord.x < 0 || fieldWidth <= coord.x)
        return {
            collision: "solid",
            texture: createEmptyTexture()
        };
    return terrain[coord.y][coord.x];
}

interface GameObject {
    coord: Coord; //足元のブロックの座標
    texture: Texture;
}

interface Player extends GameObject {
    isSmall: boolean;
}

function createPlayer(): Player {
    return {
        coord: { x: 0, y: 0 },
        isSmall: false,
        texture: createRectTexture("yellow", blockSize - 4, blockSize * 2 - 4, blockSize * 0.5 - 2, blockSize * 1.5 - 4)
    };
}

//そこにプレイヤーが入るスペースがあるか判定。空中でもtrue
function canEnter(coord: Coord, field: Field, isSmall: boolean): boolean {
    if (isSmall)
        return getBlock(field.terrain, coord).collision !== "solid";

    return getBlock(field.terrain, coord).collision !== "solid"
        && getBlock(field.terrain, upCoord(coord)).collision !== "solid";
}
//その場に立てるか判定。上半身か下半身、足の下がはしごならtrue、足の下が空中だとfalse。スペースが無くてもfalse
function canStand(coord: Coord, field: Field, isSmall: boolean): boolean {
    if (!canEnter(coord, field, isSmall))
        return false;

    if (isSmall && getBlock(field.terrain, coord).collision === "ladder")
        return true;

    if (getBlock(field.terrain, coord).collision === "ladder"
        || getBlock(field.terrain, upCoord(coord)).collision === "ladder"
        || getBlock(field.terrain, downCoord(coord)).collision === "ladder")
        return true;

    return getBlock(field.terrain, downCoord(coord)).collision === "solid";
}

type Direction = "left" | "right" | "up" | "down";
type ActionType = "walk" | "climb" | "drop";
type MoveResult = null | { coord: Coord, actionType: ActionType; };

function checkLeft(coord: Coord, field: Field, isSmall: boolean): MoveResult {
    // 左が空いているならそこ
    if (canEnter(leftCoord(coord), field, isSmall))
        return { coord: leftCoord(coord), actionType: "walk" };
    // 上がふさがってなくて左上が空いているならそこ
    if (canEnter(upCoord(coord), field, isSmall)
        && canEnter(leftCoord(upCoord(coord)), field, isSmall))
        return { coord: leftCoord(upCoord(coord)), actionType: "climb" };
    return null;
}
function checkRight(coord: Coord, field: Field, isSmall: boolean): MoveResult {
    // 右が空いているならそこ
    if (canEnter(rightCoord(coord), field, isSmall))
        return { coord: rightCoord(coord), actionType: "walk" };
    // 上がふさがってなくて右上が空いているならそこ
    if (canEnter(upCoord(coord), field, isSmall)
        && canEnter(rightCoord(upCoord(coord)), field, isSmall))
        return { coord: rightCoord(upCoord(coord)), actionType: "climb" };
    return null;
}
function checkUp(coord: Coord, field: Field, isSmall: boolean): MoveResult {
    // 下半身か上半身が梯子で、かつ真上に留まれるなら登る？
    if ((getBlock(field.terrain, coord).collision === "ladder" ||
        getBlock(field.terrain, upCoord(coord)).collision === "ladder") &&
        canStand(upCoord(coord), field, isSmall))
        return { coord: upCoord(coord), actionType: "climb" };
    return null;
}
function checkDown(coord: Coord, field: Field, isSmall: boolean): MoveResult {
    // 真下が空いてるなら（飛び）下りる？
    if (canEnter(downCoord(coord), field, isSmall))
        return { coord: downCoord(coord), actionType: "climb" };
    return null;
}

//プレイヤーを直接動かす。落とす処理もする。
function movePlayer(player: Player, field: Field, direction: Direction) {
    let result: MoveResult = null;

    switch (direction) {
        case "left": result = checkLeft(player.coord, field, player.isSmall); break;
        case "right": result = checkRight(player.coord, field, player.isSmall); break;
        case "up": result = checkUp(player.coord, field, player.isSmall); break;
        case "down": result = checkDown(player.coord, field, player.isSmall); break;
    }
    if (result === null) return null;

    // 立てる場所まで落とす
    while (!canStand(result.coord, field, player.isSmall)) {
        result.actionType = "drop";
        result.coord = downCoord(result.coord);
    }
    player.coord = result.coord;

    console.log(direction + " " + result.actionType);

    turn(field, player);
}

function turn(field: Field, player: Player) {
    //敵などのターン処理はここ

    controlNeko(field.neko, field, player);

    while (field.terrain.length - 5 < player.coord.y || field.terrain.length - 5 < field.neko.coord.y)
        generateRow(field);
}

interface Neko extends GameObject {
    coord:  Coord;
    texture: Texture;
}

function createNeko(): Neko {
    return {
        coord: { x: 0, y: 5 },
        texture: createRectTexture("blue", blockSize - 4, blockSize - 2, blockSize / 2 - 2, blockSize / 2 - 2)
    };
}

function controlNeko(neko: Neko, field:Field, player:Player): void {
    neko.coord.x++;
}

interface Camera {
    centerX: number;
    centerY: number;

    offsetX: number;
    offsetY: number;
}

function createCamera(): Camera {
    return {
        centerX: 80,
        centerY: -80,

        offsetX: 0,
        offsetY: 0,
    };
}

function updateCamera(camera: Camera, player: Player, field: Field, renderer: Renderer): void {
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

function drawBlock(block: Block, coord: Coord, camera: Camera, renderer: Renderer, imageResources: ImageResources): void {
    block.texture.draw(camera.offsetX + coord.x * blockSize, camera.offsetY - coord.y * blockSize, renderer, imageResources);
}
function drawField(field: Field, camera: Camera, renderer: Renderer, imageResources: ImageResources): void {
    field.terrain.forEach((row, y) => row.forEach((block, x) => drawBlock(block, { x, y }, camera, renderer, imageResources)));
}
function drawGameObject(gameObject: GameObject, camera: Camera, renderer: Renderer, imageResources: ImageResources) {
    gameObject.texture.draw(camera.offsetX + gameObject.coord.x * blockSize, camera.offsetY - gameObject.coord.y * blockSize, renderer, imageResources);
}

function animationLoop(field: Field, player: Player, camera: Camera, renderer: Renderer, mainScreen: CanvasRenderingContext2D, loadingProgress: LoadingProgress): void {
    if (loadingProgress.registeredCount === loadingProgress.finishedCount) {
        updateCamera(camera, player, field, renderer);

        drawField(field, camera, renderer, loadingProgress.imageResources);
        drawGameObject(player, camera, renderer, loadingProgress.imageResources);
        drawGameObject(field.neko, camera, renderer, loadingProgress.imageResources);

        testAnimation.draw(40, 40, renderer, loadingProgress.imageResources);

        composit(renderer, mainScreen);
    }
    else {
        console.log("loading " + loadingProgress.finishedCount + "/" + loadingProgress.registeredCount);
        mainScreen.fillText("loading", 0, 0);
    }

    requestAnimationFrame(() => animationLoop(field, player, camera, renderer, mainScreen, loadingProgress));
}

let testAnimation: Texture;

window.onload = () => {
    const canvas = document.getElementById("canvas");
    if (canvas === null || !(canvas instanceof HTMLCanvasElement))
        throw new Error("canvas not found");

    const mainScreen = canvas.getContext("2d");
    if (mainScreen === null)
        throw new Error("context2d not found");

    const field: Field = createField();
    const player: Player = createPlayer();
    const camera: Camera = createCamera();
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

    document.addEventListener("keydown", (event: KeyboardEvent) => {
        // リピート（長押し時に繰り返し発火する）は無視
        if (event.repeat) return;

        if (event.code === "KeyA") player.coord.x--;
        if (event.code === "KeyD") player.coord.x++;
        if (event.code === "KeyW") player.coord.y++;
        if (event.code === "KeyS") player.coord.y--;

        if (event.code === "ArrowLeft") movePlayer(player, field, "left");
        if (event.code === "ArrowRight") movePlayer(player, field, "right");
        if (event.code === "ArrowUp") movePlayer(player, field, "up");
        if (event.code === "ArrowDown") movePlayer(player, field, "down");

        console.log(player.coord);
        console.log("canEnter: " + canEnter(player.coord, field, false));
        console.log("canStand: " + canStand(player.coord, field, false));
    }, false);

    animationLoop(field, player, camera, renderer, mainScreen, loadingProgress);
};
