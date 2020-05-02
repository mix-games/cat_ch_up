/// <reference path="./resources.ts" />
/// <reference path="./gameobject.ts" />
/// <reference path="./field.ts" />

// ねこ、敵、アイテムなど。プレイヤーは含まない。

type Entity = Neko;

interface Neko extends GameObject {
    type: "neko";
}

function createNeko(): Neko {
    return {
        type: "neko",
        coord: createCoord(0, 5),
        texture: createRectTexture("blue", blockSize - 4, blockSize - 2, blockSize / 2 - 2, -2)
    };
}

function canNekoEnter(coord: Coord, terrain: Terrain): boolean {
    return !(getBlock(terrain, coord).collision === "solid");
}
function canNekoStand(coord: Coord, terrain: Terrain): boolean {
    return canNekoEnter(coord, terrain) && getBlock(terrain, downCoord(coord)).collision === "solid"
}

function controlNeko(neko: Neko, field: Field, player: Player): Neko {
    // 近づいたら
    if(Math.abs(player.coord.x - neko.coord.x) + Math.abs(player.coord.y - neko.coord.y) < 2) {
        //動く
        return {
            ...neko,
            coord: rightCoord(neko.coord),
        }
    }
    return neko;
}

function controlEntity(entity: Entity, field:Field, player: Player) {
    if (entity.type === "neko") {
        controlNeko(entity, field, player);
    }
}