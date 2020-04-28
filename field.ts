/// <reference path="./resources.ts" />
/// <reference path="./coord.ts" />
/// <reference path="./gameobject.ts" />

interface BlockWithoutTexture {
    collision: "ladder" | "solid" | "air";
}
interface Block {
    collision: "ladder" | "solid" | "air";
    texture0: Texture;
    texture1: Texture;
}
type Terrain = Block[][];
interface Field {
    terrain: Terrain;
    neko: Neko;
    backgroundTexture: Texture;
}

function createField(): Field {
    const protoTerrain: BlockWithoutTexture[][] = [[], []];
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

    let field: Field = {
        terrain: protoTerrain.map((protoRow)=>assignTexture(protoRow)),
        neko: createNeko(),
        backgroundTexture: resources.background_texture
    };
    for (let i = 0; i < 10; i++) generateRow(field);
    return field;
}

const fieldWidth = 10;

//Y座標は下から数える
function generateRow(field: Field): void {
    const protoRow: BlockWithoutTexture[] = [];
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
function assignTexture(protoRow: BlockWithoutTexture[]): Block[] {
    return protoRow.map((bwt: BlockWithoutTexture): Block => {
        switch(bwt.collision) {
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

function getBlock(terrain: Terrain, coord: Coord): Block {
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

function drawField(field: Field, camera: Camera, renderer: Renderer): void {
    drawTexture(
        field.backgroundTexture,
        renderer.width / 2,
        renderer.height / 2,
        renderer
    );

    const xRange = Math.ceil(renderer.width / blockSize / 2);
    const yRange = Math.ceil(renderer.height / blockSize / 2);
    const x1 = Math.floor(camera.centerX / blockSize) - xRange;
    const x2 = Math.ceil(camera.centerX / blockSize) + xRange;
    const y1 = Math.floor(-camera.centerY / blockSize) - yRange;
    const y2 = Math.ceil(-camera.centerY / blockSize) + yRange;

    for(var x = x1; x <= x2; x++) {
        for(var y = y1; y <= y2; y++) {
            if (field.terrain.length <= y) continue;
            const coord = createCoord(x, y);
            drawTexture(
                getBlock(field.terrain, coord).texture0,
                camera.offsetX + coord.x * blockSize,
                camera.offsetY - coord.y * blockSize,
                renderer
            );
        }
    }

    for(var x = x1; x <= x2; x++) {
        for(var y = y1; y <= y2; y++) {
            if (field.terrain.length <= y) continue;
            const coord = createCoord(x, y);
            drawTexture(
                getBlock(field.terrain, coord).texture1,
                camera.offsetX + coord.x * blockSize,
                camera.offsetY - coord.y * blockSize,
                renderer
            );
        }
    }

    // デバッグ用の赤い点
    //*
    for(var x = x1; x <= x2; x++) {
        for(var y = y1; y <= y2; y++) {
            if (field.terrain.length <= y) continue;
            const coord = createCoord(x, y);
            drawTexture(
                createRectTexture("red", 1, 1, 0, 0),
                camera.offsetX + coord.x * blockSize,
                camera.offsetY - coord.y * blockSize,
                renderer
            );
        }
    }//*/

    drawGameObject(field.neko, camera, renderer);
}