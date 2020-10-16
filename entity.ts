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
        texture: createOffsetTexture(createRectTexture("blue", blockSize - 4, blockSize - 2), blockSize / 2 - 2, -2),
        animationTimestamp: 0,
    };
}

function canNekoEnter(coord: Coord, terrain: Field.Terrain): boolean {
    return !(Field.getCollision(terrain, coord) === Field.Collision.Block);
}
function canNekoStand(coord: Coord, terrain: Field.Terrain): boolean {
    return canNekoEnter(coord, terrain) && Field.getCollision(terrain, downCoord(coord)) === Field.Collision.Block
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

function controlEntity(entity: Entity, field:Field, player: Player): Entity {
    if (entity.type === "neko") {
        return controlNeko(entity, field, player);
    }
    // 網羅チェック
    return entity.type;
}