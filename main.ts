type ImageResources = Map<string, HTMLImageElement>;
interface ImageLoadingProgress {
    finishedCount: number;
    registeredCount: number;
    imageResources: ImageResources;
}
function imageLoader(sources: string[], callback: ()=>void = () => { }, progress: ImageLoadingProgress = {
        registeredCount: 0,
        finishedCount: 0,
        imageResources: new Map()
    }) {
    progress.registeredCount += sources.length;
  
    sources.forEach(source => {
        const image = new Image();
        image.onload = function() {
        progress.imageResources.set(source, image);
        progress.finishedCount++;
        if (progress.registeredCount === progress.finishedCount)
            callback();
        }
        image.src = source;
    });

    return progress;
}


interface Texture {
    // これの実装を色々にしてアニメーションなどを表現する
    draw: (x:number, y:number, camera:Camera, resources:ImageResources) => void;
}
  
// 四角を描画するテクスチャ
function createRectTexture(lightColor: string, width: number, height: number, shadowColor: string = lightColor): Texture{
    return {
        draw: (x:number, y:number, camera:Camera, resources:ImageResources) => {
            camera.lightColor.fillStyle = lightColor;
            camera.lightColor.fillRect(camera.offsetX + x, camera.offsetY + y, width, height);
            camera.shadowColor.fillStyle = shadowColor;
            camera.shadowColor.fillRect(camera.offsetX + x, camera.offsetY + y, width, height);
        }
    }
}
  
// ただの（アニメーションしない、影も落とさないし受けない）テクスチャを作る
function createStaticTexture(source: string, textureOffsetX: number, textureOffsetY: number): Texture {
    return {
        draw: (x:number, y:number, camera:Camera, resources:ImageResources) => {
            const image = resources.get(source);
            if (image === undefined) { console.log("not loaded yet"); return; }
            camera.lightColor.drawImage(image,
                camera.offsetX + textureOffsetX + x,
                camera.offsetY + textureOffsetY + y);
            camera.shadowColor.drawImage(image,
                camera.offsetX + textureOffsetX + x,
                camera.offsetY + textureOffsetY + y);
        }
    }
}

function createStaticVolumeTexture(source: string, textureOffsetX:number, textureOffsetY:number, sh:number): Texture {
    return {
        draw: (x:number, y:number, camera:Camera, resources:ImageResources) => {
            const image = resources.get(source);
            if (image === undefined) { console.log("not loaded yet"); return; }
      
            camera.lightColor.drawImage(image, 0, 0, image.width, sh,
                camera.offsetX + textureOffsetX + x,
                camera.offsetY + textureOffsetY + y, image.width, sh);

            camera.shadowColor.drawImage(image, 0, sh, image.width, sh,
                camera.offsetX + textureOffsetX + x,
                camera.offsetY + textureOffsetY + y, image.width, sh);

            for(var i = 0; i < camera.volumeLayers.length; i++)
                camera.volumeLayers[i].drawImage(image, 0, (i + 2) * sh, image.width, sh,
                    camera.offsetX + textureOffsetX + x,
                    camera.offsetY + textureOffsetY + y, image.width, sh);
        }
    }
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
    texture: Texture
}
interface Field {
    terrain: Block[][];
}

function upCoord(coord: Coord): Coord{
    return { x:coord.x, y:coord.y + 1};
}
function downCoord(coord: Coord): Coord{
    return { x:coord.x, y:coord.y - 1};
}
function leftCoord(coord: Coord): Coord{
    return { x:coord.x - 1, y:coord.y};
}
function rightCoord(coord: Coord): Coord{
    return { x:coord.x + 1, y:coord.y};
}

function createField(): Field {
    let field: Field = { terrain:[] };
    for (let i = 0; i < 10; i++) generateRow(field);
    return field;
}

const fieldWidth = 10;

//Y座標は下から数える
function generateRow(field: Field): void {
    const protoRow: BlockWithoutTexture[] = [];
    for (let x = 0; x < 10; x++) {
        if(Math.random() < 0.7)
            protoRow[x] = { collision: "air" };
        else if(Math.random() < 0.5)
            protoRow[x] = { collision: "solid" };
        else
            protoRow[x] = { collision: "ladder" };
    }
    const row = protoRow.map((bwt: BlockWithoutTexture): Block => {
        if (bwt.collision === "ladder") 
            return {
                collision: "ladder",
                texture: createRectTexture("red", blockSize, blockSize)
            };
        else if (bwt.collision === "solid")
            return {
                collision: "solid",
                texture: createRectTexture("black", blockSize, blockSize)
            };
        else return {
            collision: "air",
            texture: createRectTexture("white", blockSize, blockSize)
        };
    });
    field.terrain.push(row);
}

function getBlock(terrain: Block[][], coord: Coord): Block {
    if (coord.y < 0 || coord.x < 0 || fieldWidth <= coord.x)
        return {
            collision:"solid",
            texture: createRectTexture("white", blockSize, blockSize)
        };
    return terrain[coord.y][coord.x];
}

interface Player {
    position: Coord; //足元のブロックの座標
    texture: Texture;
    isSmall: boolean;
}

function createPlayer(): Player {
    return {
        position: { x: 0, y: 0 },
        isSmall: false,
        texture: createRectTexture("yellow", blockSize - 4, blockSize * 2 - 4)
    };
}

//そこにプレイヤーが入るスペースがあるか判定。空中でもtrue
function canEnter(coord: Coord, field: Field, isSmall: boolean): boolean {
    if (isSmall)
        return getBlock(field.terrain, coord).collision !== "solid";
    
    return getBlock(field.terrain, coord).collision !== "solid"
        && getBlock(field.terrain, upCoord(coord)).collision !== "solid";
}
//その場に立てるか判定。上半身か下半身がはしごならtrue、足の下が空中だとfalse。スペースが無くてもfalse
function canStand(coord: Coord, field: Field, isSmall: boolean): boolean {
    if (!canEnter(coord, field, isSmall))
        return false;

    if (isSmall && getBlock(field.terrain, coord).collision === "ladder")
        return true;

    if (getBlock(field.terrain, coord).collision === "ladder"
        || getBlock(field.terrain, upCoord(coord)).collision === "ladder")
        return true;
    
    return getBlock(field.terrain, downCoord(coord)).collision === "solid";
}

type Direction = "left" | "right" | "up" | "down";
type ActionType = "walk" | "climb" | "drop";
type MoveResult = null | { coord: Coord, actionType: ActionType };

function checkLeft(coord: Coord, field: Field, isSmall: boolean): MoveResult{
    // 左が空いているならそこ
    if (canEnter(leftCoord(coord), field, isSmall))
        return { coord:leftCoord(coord), actionType:"walk" };
    // 上がふさがってなくて左上が空いているならそこ
    if(canEnter(upCoord(coord), field, isSmall)
     && canEnter(leftCoord(upCoord(coord)), field, isSmall))
     return { coord:leftCoord(upCoord(coord)), actionType:"climb" };
    return null;
}
function checkRight(coord: Coord, field: Field, isSmall: boolean): MoveResult{
    // 右が空いているならそこ
    if (canEnter(rightCoord(coord), field, isSmall))
        return { coord: rightCoord(coord), actionType:"walk" };
    // 上がふさがってなくて右上が空いているならそこ
    if(canEnter(upCoord(coord), field, isSmall)
     && canEnter(rightCoord(upCoord(coord)), field, isSmall))
     return { coord:rightCoord(upCoord(coord)), actionType:"climb" };
    return null;
}
function checkUp(coord: Coord, field: Field, isSmall: boolean): MoveResult{
    // 真上に立てるなら登る？
    if (canStand(upCoord(coord), field, isSmall))
        return { coord:upCoord(coord), actionType:"climb" };
    return null;
}
function checkDown(coord: Coord, field: Field, isSmall: boolean): MoveResult{
    // 真下が空いてるなら（飛び）下りる？
    if (canEnter(downCoord(coord), field, isSmall))
        return { coord:downCoord(coord), actionType:"climb" };
    return null;
}

//プレイヤーを直接動かす。落とす処理もする。
function movePlayer(player: Player, field: Field, direction: Direction) {
    let result: MoveResult = null;

    switch (direction) {
        case "left": result = checkLeft(player.position, field, player.isSmall); break;
        case "right": result = checkRight(player.position, field, player.isSmall); break;
        case "up": result = checkUp(player.position, field, player.isSmall); break;
        case "down": result = checkDown(player.position, field, player.isSmall); break;
    }
    if (result === null) return null;

    // 立てる場所まで落とす
    while (!canStand(result.coord, field, player.isSmall)) {
        result.actionType = "drop";
        result.coord = downCoord(result.coord);
    }
    player.position = result.coord;

    console.log(direction + " " + result.actionType);

    //敵などのターン処理はここ

    while (field.terrain.length - 5 < player.position.y) generateRow(field);
}

const blockSize = 16;

function drawField(camera: Camera, field: Field, imageResources: ImageResources): void {
    field.terrain.forEach((row, y) => row.forEach((block, x) => drawBlock(camera, block, x, y)));
    
    function drawBlock(camera: Camera, block:Block, x:number, y:number): void {
        block.texture.draw(x * blockSize, - y * blockSize, camera, imageResources);
    }
}
function drawPlayer(camera: Camera, player:Player, imageResources: ImageResources) {
    player.texture.draw(player.position.x * blockSize + 2, - (player.position.y + 1) * blockSize + 4, camera, imageResources);
}
interface Camera {
    offsetX: number;
    offsetY: number;

    lightColor: CanvasRenderingContext2D;
    shadowColor: CanvasRenderingContext2D;
    volumeLayers: CanvasRenderingContext2D[];
  
    compositScreen: CanvasRenderingContext2D;
    shadowAccScreens: CanvasRenderingContext2D[];

    compositOffsetX: number;
    compositOffsetY: number;

    centerX: number;
    centerY: number;
}

function createCamera(width: number, height: number): Camera {
    const marginTop = 28;
    const marginLeft = 28;
    const marginRignt = 0;
    const marginBottom = 0;

    const lightColor = create2dScreen(marginLeft + width + marginRignt, marginTop + height + marginBottom);
    const shadowColor = create2dScreen(marginLeft + width + marginRignt, marginTop + height + marginBottom);
    const volumeLayers: CanvasRenderingContext2D[] = [];
    for(let i = 0; i < 6; i++)
        volumeLayers.push(create2dScreen(marginLeft + width + marginRignt, marginTop + height + marginBottom));

    const shadowAccScreens: CanvasRenderingContext2D[] = [];
    for(let i = 0; i < volumeLayers.length; i++) 
        shadowAccScreens.push(create2dScreen(marginLeft + width + marginRignt, marginTop + height + marginBottom));

    const compositScreen = create2dScreen(width, height);
  
    return {
        centerX: 80,
        centerY: -80,

        offsetX: 0,
        offsetY: 0,

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

function updateCamera(camera: Camera, player: Player, field: Field): void {
    /*
    const targetX = (player.position.x + 0.5) * blockSize;
    const targetY = -(player.position.y + 0.5) * blockSize;

    camera.centerX += (targetX - camera.centerX) * 0.2;
    camera.centerY += (targetY - camera.centerY) * 0.2;
    */
    
    camera.offsetX = camera.lightColor.canvas.width / 2 - camera.centerX;
    camera.offsetY = camera.lightColor.canvas.height / 2 - camera.centerY;
}

function composit(camera: Camera, mainScreen: CanvasRenderingContext2D): void {
    const shadowDirectionX = 3;
    const shadowDirectionY = 2;

    // shadowAccScreens[i]にはi-1層目に落ちる影を描画する
    for(let i = camera.volumeLayers.length - 1; 0 <= i; i--) {
        camera.shadowAccScreens[i].globalCompositeOperation = "source-over";
        camera.shadowAccScreens[i].drawImage(camera.volumeLayers[i].canvas, 0, 0);
        if(i !== camera.volumeLayers.length - 1)
            camera.shadowAccScreens[i].drawImage(camera.shadowAccScreens[i + 1].canvas, shadowDirectionX, shadowDirectionY);
    }
  
    for(let i = 0; i < camera.shadowAccScreens.length; i++) {
        //i-1層目の形で打ち抜く
        if(i !== 0) {
            camera.shadowAccScreens[i].globalCompositeOperation = "source-in";
            camera.shadowAccScreens[i].drawImage(camera.volumeLayers[i - 1].canvas, -shadowDirectionY, -shadowDirectionY);
        }
        //compositに累積
        camera.compositScreen.globalCompositeOperation = "source-over";
        camera.compositScreen.drawImage(camera.shadowAccScreens[i].canvas,
            camera.compositOffsetX + shadowDirectionX,
            camera.compositOffsetY + shadowDirectionY);
        //見えなくなる部分を隠す
        camera.compositScreen.globalCompositeOperation = "destination-out";
        camera.compositScreen.drawImage(
            camera.volumeLayers[i].canvas, camera.compositOffsetX, camera.compositOffsetY);
    }
    // 影部分が不透明な状態になっているはずなので、影色で上書きする
    camera.compositScreen.globalCompositeOperation = "source-atop";
    camera.compositScreen.drawImage(camera.shadowColor.canvas, camera.compositOffsetX, camera.compositOffsetY);
    // 残りの部分に光色
    camera.compositScreen.globalCompositeOperation = "destination-over";
    camera.compositScreen.drawImage(camera.lightColor.canvas, camera.compositOffsetX, camera.compositOffsetY);
    // メインスクリーン（本番のcanvas）にスムージングなしで拡大
    mainScreen.imageSmoothingEnabled = false;
    mainScreen.clearRect(0, 0, mainScreen.canvas.width, mainScreen.canvas.height);
    mainScreen.drawImage(camera.compositScreen.canvas, 0, 0, mainScreen.canvas.width, mainScreen.canvas.height);

    //次フレームの描画に備えてレイヤーを消去
    clearScreen(camera.lightColor);
    clearScreen(camera.shadowColor);
    for(var i = 0; i < camera.volumeLayers.length; i++) {
        clearScreen(camera.volumeLayers[i]);
        clearScreen(camera.shadowAccScreens[i]);
    }
    clearScreen(camera.compositScreen);

    function clearScreen(screen: CanvasRenderingContext2D): void {
        screen.clearRect(0, 0, screen.canvas.width, screen.canvas.height);
    }
}

function animationLoop(field: Field, player: Player, camera: Camera, mainScreen: CanvasRenderingContext2D, imageLoadingProgress: ImageLoadingProgress): void {
    if (imageLoadingProgress.registeredCount === imageLoadingProgress.finishedCount) {
        updateCamera(camera, player, field);

        drawField(camera, field, imageLoadingProgress.imageResources);
        drawPlayer(camera, player, imageLoadingProgress.imageResources);

        composit(camera, mainScreen);
    }
    else {
        console.log("loading " + imageLoadingProgress.finishedCount + "/" + imageLoadingProgress.registeredCount);
        mainScreen.fillText("loading", 0, 0);
    }

    requestAnimationFrame(() => animationLoop(field, player, camera, mainScreen, imageLoadingProgress));
}

window.onload = () => {
    const canvas = document.getElementById("canvas");
    if　(canvas === null || !(canvas instanceof HTMLCanvasElement))
        throw new Error("canvas not found");

    const mainScreen = canvas.getContext("2d");
    if　(mainScreen === null)
        throw new Error("context2d not found");
      
    const field: Field = createField();
    const player: Player = createPlayer();
    const camera = createCamera(mainScreen.canvas.width / 2, mainScreen.canvas.height / 2);
    
    const imageLoadingProgress = imageLoader([]);

    /*
    canvas.addEventListener("click", (ev: MouseEvent) => {
        //const x = ev.clientX - canvas.offsetLeft;
        //const y = ev.clientY - canvas.offsetTop;
        player.position.x += 1;
    }, false);
    */

    document.addEventListener("keydown", (event: KeyboardEvent) => {
        // リピート（長押し時に繰り返し発火する）は無視
        if (event.repeat) return;
        
        if (event.code === "KeyA") player.position.x--; 
        if (event.code === "KeyD") player.position.x++;
        if (event.code === "KeyW") player.position.y++;
        if (event.code === "KeyS") player.position.y--;

        if (event.code === "ArrowLeft") movePlayer(player, field, "left");
        if (event.code === "ArrowRight") movePlayer(player, field, "right");
        if (event.code === "ArrowUp") movePlayer(player, field, "up");
        if (event.code === "ArrowDown") movePlayer(player, field, "down");

        console.log(player.position);
        console.log("canEnter: " + canEnter(player.position, field, false));
        console.log("canStand: " + canStand(player.position, field, false));
    }, false);

    animationLoop(field, player, camera, mainScreen, imageLoadingProgress);
}
