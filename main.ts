interface Coord {
    x: number;
    y: number;
}
interface Block {
    collision: "ladder" | "solid" | "air";
}
interface Player {
    position: Coord; //足元のブロックの座標
    isSmall: boolean;
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

function initField(): Field {
    let field: Field = { terrain:[] };
    for (let i = 0; i < 10; i++) generateRow(field);
    return field;
}

const fieldWidth = 10;

//Y座標は下から数える
function generateRow(field: Field): void {
    const row: Block[] = [];
    for (let x = 0; x < fieldWidth; x++) {
        if(Math.random() < 0.7)
            row[x] = { collision: "air" };
        else if(Math.random() < 0.5)
            row[x] = { collision: "solid" };
        else
            row[x] = { collision: "ladder" };
    }
    field.terrain.push(row);
}

function getBlock(terrain: Block[][], coord: Coord): Block {
    if (coord.y < 0 || coord.x < 0 || fieldWidth <= coord.x)
        return { collision:"solid" };
    return terrain[coord.y][coord.x];
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
}


const blockSize = 30;

function drawField(context: CanvasRenderingContext2D, field: Field, offsetX: number, offsetY: number): void {
    field.terrain.forEach((row, y) => row.forEach((block, x) => drawBlock(context, block, x, y)));
    function drawBlock(context: CanvasRenderingContext2D, block:Block, x:number, y:number): void {
        if(block.collision === "solid") {
            context.fillStyle = 'black';
            context.fillRect(offsetX + x * blockSize, offsetY - y * blockSize, blockSize, blockSize);
        }
        if(block.collision === "ladder") {
            context.fillStyle = 'red';
            context.fillRect(offsetX + x * blockSize, offsetY - y * blockSize, blockSize, blockSize);
        }
        if(block.collision === "air") {
            context.fillStyle = 'white';
            context.fillRect(offsetX + x * blockSize, offsetY - y * blockSize, blockSize, blockSize);
        }
    }
}
function drawPlayer(context: CanvasRenderingContext2D, player:Player, offsetX: number, offsetY: number) {
    context.fillStyle = 'yellow';
    context.fillRect(offsetX + player.position.x * blockSize + 5, offsetY - (player.position.y + 1) * blockSize + 10, blockSize - 10, blockSize * 2 - 10);
}

window.onload = () => {
    const canvas = document.getElementById("canvas");
    if　(canvas === null || !(canvas instanceof HTMLCanvasElement)){
        alert("canvas not found");
        return;
    }
    const context: CanvasRenderingContext2D | null = canvas.getContext("2d");
    if　(context === null){
        alert("context2d not found");
        return
    }
    
    let field = initField();
    let player = { position:{x:0, y:0}, isSmall:false };
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

    animationLoop(context);

    function animationLoop(context: CanvasRenderingContext2D) {
        drawField(context, field, 0, 300);
        drawPlayer(context, player, 0, 300);
        requestAnimationFrame(() => animationLoop(context));
    }
}
