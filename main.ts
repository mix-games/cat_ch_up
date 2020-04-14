interface Coord {
    x: number;
    y: number;
}
interface Block {
    collision: "ladder" | "solid" | "air";
}
interface Player {
    position: Coord; //足元のブロックの座標
}
interface Field {
    terrain: Block[][];
}

function initField(): Field {
    let field: Field = { terrain:[] };
    for (let i = 0; i < 10; i++) generateRow(field);
    return field;
}

//Y座標は下から数える
function generateRow(field: Field): void {
    const row: Block[] = [];
    for (let x = 0; x < 10; x++) {
        if(Math.random() < 0.7)
            row[x] = { collision: "air" };
        else if(Math.random() < 0.5)
            row[x] = { collision: "solid" };
        else
            row[x] = { collision: "ladder" };
    }
    field.terrain.push(row);
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
    let player = {position:{x:0, y:0}};
    
    canvas.addEventListener("click", (ev: MouseEvent) => {
        //const x = ev.clientX - canvas.offsetLeft;
        //const y = ev.clientY - canvas.offsetTop;
        player.position.x += 1;
    }, false);

    animationLoop(context);

    function animationLoop(context: CanvasRenderingContext2D) {
        drawField(context, field, 0, 300);
        drawPlayer(context, player, 0, 300);
        requestAnimationFrame(() => animationLoop(context));
    }
}
