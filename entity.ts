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

function canNekoEnter(coord: Coord, terrain: Field.Terrain): boolean {
    return !(Field.getCollision(terrain, coord) === Field.Collision.Solid);
}
function canNekoStand(coord: Coord, terrain: Field.Terrain): boolean {
    return canNekoEnter(coord, terrain) && Field.getCollision(terrain, downCoord(coord)) === Field.Collision.Solid;
}

function dropNeko(neko: Neko, terrain: Field.Terrain): Neko {
    if (canNekoStand(neko.coord, terrain)) return neko;
    return dropNeko({ ...neko, coord: downCoord(neko.coord) }, terrain);
}

function controlNeko(neko: Neko, field: Field, player: Player): Neko {
    // 近づいたら
    if (Math.abs(player.coord.x - neko.coord.x) + Math.abs(player.coord.y - neko.coord.y) < 3) {
        let candiate: Neko[] = [];

        if (!equalsCoord(upCoord(neko.coord), player.coord) &&
            !equalsCoord(leftCoord(upCoord(neko.coord)), player.coord) &&
            canNekoStand(leftCoord(upCoord(neko.coord)), field.terrain))
            candiate.push({ ...neko, coord: leftCoord(upCoord(neko.coord)) });
        if (!equalsCoord(upCoord(neko.coord), player.coord) &&
            !equalsCoord(rightCoord(upCoord(neko.coord)), player.coord) &&
            canNekoStand(rightCoord(upCoord(neko.coord)), field.terrain))
            candiate.push({ ...neko, coord: rightCoord(upCoord(neko.coord)) });

        let coord = upCoord(neko.coord);
        while (!equalsCoord(coord, player.coord) &&
            Field.getCollision(field.terrain, coord) === Field.Collision.Ladder) {
            if (!equalsCoord(upCoord(coord), player.coord) &&
                !equalsCoord(leftCoord(upCoord(coord)), player.coord) &&
                canNekoStand(leftCoord(upCoord(coord)), field.terrain))
                candiate.push({ ...neko, coord: leftCoord(upCoord(coord)) });
            if (!equalsCoord(upCoord(coord), player.coord) &&
                !equalsCoord(rightCoord(upCoord(coord)), player.coord) &&
                canNekoStand(rightCoord(upCoord(coord)), field.terrain))
                candiate.push({ ...neko, coord: rightCoord(upCoord(coord)) });
            coord = upCoord(coord);
        }

        coord = leftCoord(upCoord(neko.coord));
        while (!equalsCoord(coord, player.coord) &&
            Field.getCollision(field.terrain, coord) === Field.Collision.Ladder) {
            if (!equalsCoord(upCoord(coord), player.coord) &&
                !equalsCoord(leftCoord(upCoord(coord)), player.coord) &&
                canNekoStand(leftCoord(upCoord(coord)), field.terrain))
                candiate.push({ ...neko, coord: leftCoord(upCoord(coord)) });
            if (!equalsCoord(upCoord(coord), player.coord) &&
                !equalsCoord(rightCoord(upCoord(coord)), player.coord) &&
                canNekoStand(rightCoord(upCoord(coord)), field.terrain))
                candiate.push({ ...neko, coord: rightCoord(upCoord(coord)) });
            coord = upCoord(coord);
        }

        coord = rightCoord(upCoord(neko.coord));
        while (!equalsCoord(coord, player.coord) &&
            Field.getCollision(field.terrain, coord) === Field.Collision.Ladder) {
            if (!equalsCoord(upCoord(coord), player.coord) &&
                !equalsCoord(leftCoord(upCoord(coord)), player.coord) &&
                canNekoStand(leftCoord(upCoord(coord)), field.terrain))
                candiate.push({ ...neko, coord: leftCoord(upCoord(coord)) });
            if (!equalsCoord(upCoord(coord), player.coord) &&
                !equalsCoord(rightCoord(upCoord(coord)), player.coord) &&
                canNekoStand(rightCoord(upCoord(coord)), field.terrain))
                candiate.push({ ...neko, coord: rightCoord(upCoord(coord)) });
            coord = upCoord(coord);
        }

        candiate.push(...[
            leftCoord(neko.coord),
            rightCoord(neko.coord)]
            .filter(coord => !equalsCoord(coord, player.coord) && canNekoEnter(coord, field.terrain))
            .map(coord => (dropNeko({ ...neko, coord }, field.terrain))));

        let candiate2 = candiate.map(neko2 => ({
            neko: neko2,
            score: Math.abs(neko2.coord.x - player.coord.x)
                + Math.abs(neko2.coord.y - player.coord.y)
                + neko2.coord.y - neko.coord.y
                + 3 * Math.random()
        }));

        // 配列をシャッフルした配列を返す
        function shuffle<T>(array: T[]): T[] {
            const array2 = [...array];
            for (let i = 0; i < array2.length; i++) {
                const j = i + Math.floor(Math.random() * (array2.length - i));

                const t = array2[i];
                array2[i] = array2[j];
                array2[j] = t;
            }
            return array2;
        }
        //降順ソート
        candiate2 = shuffle(candiate2).sort((a, b)=>b.score - a.score);
        if (0 < candiate2.length) {
            return candiate2[0].neko;
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