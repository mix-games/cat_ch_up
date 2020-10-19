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
        coord: createCoord(0, 10),
        texture: createOffsetTexture(createRectTexture("blue", blockSize - 4, blockSize - 2), blockSize / 2 - 2, -2),
        animationTimestamp: 0,
    };
}

function canNekoEnter(coord: Coord, terrain: Field.Terrain, player: Player): boolean {
    return !equalsCoord(coord, player.coord) && Field.getCollision(terrain, coord) !== Field.Collision.Solid;
}
function canNekoStand(coord: Coord, terrain: Field.Terrain, player: Player): boolean {
    return canNekoEnter(coord, terrain, player) && Field.getCollision(terrain, downCoord(coord)) === Field.Collision.Solid;
}

function dropNeko(neko: Neko, terrain: Field.Terrain): Neko {
    if (Field.getCollision(terrain, downCoord(neko.coord)) === Field.Collision.Solid) return neko;
    return dropNeko({ ...neko, coord: downCoord(neko.coord) }, terrain);
}

function controlNeko(neko: Neko, field: Field, player: Player): Neko {
    // 近づいたら
    if (Math.abs(player.coord.x - neko.coord.x) + Math.abs(player.coord.y - neko.coord.y) < 3) {
        //移動後の猫の状態の候補を列挙
        let candiate: Neko[] = [];

        //左上、右上のブロックに乗る案
        if (canNekoEnter(upCoord(neko.coord), field.terrain, player) &&
            canNekoStand(leftCoord(upCoord(neko.coord)), field.terrain, player))
            candiate.push({ ...neko, coord: leftCoord(upCoord(neko.coord)) });
        if (!canNekoEnter(upCoord(neko.coord), field.terrain, player) &&
            canNekoStand(rightCoord(upCoord(neko.coord)), field.terrain, player))
            candiate.push({ ...neko, coord: rightCoord(upCoord(neko.coord)) });

        // 真上または左右の梯子を駆け上がって左上、右上のブロックに乗る案
        [upCoord(neko.coord), leftCoord(neko.coord), rightCoord(neko.coord)].forEach(coord => {
            while (!equalsCoord(coord, player.coord) &&
                Field.getCollision(field.terrain, coord) === Field.Collision.Ladder) {
                if (canNekoEnter(upCoord(coord), field.terrain, player) &&
                    canNekoStand(leftCoord(upCoord(coord)), field.terrain, player))
                    candiate.push({ ...neko, coord: leftCoord(upCoord(coord)) });
                if (canNekoEnter(upCoord(coord), field.terrain, player) &&
                    canNekoStand(rightCoord(upCoord(coord)), field.terrain, player))
                    candiate.push({ ...neko, coord: rightCoord(upCoord(coord)) });
                coord = upCoord(coord);
            }
        });

        //左右に飛び出して落ちる案
        candiate.push(...[
            leftCoord(neko.coord),
            rightCoord(neko.coord)]
            .filter(coord => canNekoEnter(coord, field.terrain, player))
            .map(coord => (dropNeko({ ...neko, coord }, field.terrain))));

        // 一つ以上案が出たらその中から選ぶ（可能な移動がなければ移動なし）
        if (0 < candiate.length) {
            //スコアを計算して一番スコアの高い案を採用、
            return candiate.map(neko2 => ({
                neko: neko2,
                score: Math.abs(neko2.coord.x - player.coord.x)
                    + Math.abs(neko2.coord.y - player.coord.y) // プレイヤーからのマンハッタン距離
                    + neko2.coord.y - neko.coord.y  //高いところが好き
                    + 3 * Math.random() // ランダム性を与える
            })).sort((a, b) => b.score - a.score)[0].neko;
        }
    }
    return dropNeko(neko, field.terrain);
}

function controlEntity(entity: Entity, field: Field, player: Player): Entity {
    if (entity.type === "neko") {
        return controlNeko(entity, field, player);
    }
    // 網羅チェック
    return entity.type;
}