
interface Neko extends GameObject {
    type: "neko";
}

namespace Neko {
    export function create(): Neko {
        return {
            type: "neko",
            coord: createCoord(0, 10),
            texture: createOffsetTexture(createRectTexture("blue", blockSize - 4, blockSize - 2), blockSize / 2 - 2, -2),
            animationTimestamp: 0,
        };
    }

    function canEnter(coord: Coord, terrain: Field.Terrain, player: Player): boolean {
        return !equalsCoord(coord, player.coord) && Field.getCollision(terrain, coord) !== Field.Collision.Solid;
    }
    function canStand(coord: Coord, terrain: Field.Terrain, player: Player): boolean {
        return canEnter(coord, terrain, player) && Field.getCollision(terrain, downCoord(coord)) === Field.Collision.Solid;
    }

    function drop(neko: Neko, terrain: Field.Terrain): Neko {
        if (Field.getCollision(terrain, downCoord(neko.coord)) === Field.Collision.Solid) return neko;
        return drop({ ...neko, coord: downCoord(neko.coord) }, terrain);
    }

    export function control(neko: Neko, field: Field, player: Player): Neko {
        // 近づいたら
        if (Math.abs(player.coord.x - neko.coord.x) + Math.abs(player.coord.y - neko.coord.y) < 3) {
            //移動後の猫の状態の候補を列挙
            let candiate: Neko[] = [];

            //左上、右上のブロックに乗る案
            if (canEnter(upCoord(neko.coord), field.terrain, player) &&
                canStand(leftCoord(upCoord(neko.coord)), field.terrain, player))
                candiate.push({ ...neko, coord: leftCoord(upCoord(neko.coord)) });
            if (!canEnter(upCoord(neko.coord), field.terrain, player) &&
                canStand(rightCoord(upCoord(neko.coord)), field.terrain, player))
                candiate.push({ ...neko, coord: rightCoord(upCoord(neko.coord)) });

            // 真上または左右の梯子を駆け上がって左上、右上のブロックに乗る案
            [upCoord(neko.coord), leftCoord(neko.coord), rightCoord(neko.coord)].forEach(coord => {
                while (!equalsCoord(coord, player.coord) &&
                    Field.getCollision(field.terrain, coord) === Field.Collision.Ladder) {
                    if (canEnter(upCoord(coord), field.terrain, player) &&
                        canStand(leftCoord(upCoord(coord)), field.terrain, player))
                        candiate.push({ ...neko, coord: leftCoord(upCoord(coord)) });
                    if (canEnter(upCoord(coord), field.terrain, player) &&
                        canStand(rightCoord(upCoord(coord)), field.terrain, player))
                        candiate.push({ ...neko, coord: rightCoord(upCoord(coord)) });
                    coord = upCoord(coord);
                }
            });

            //左右に飛び出して落ちる案
            candiate.push(...[
                leftCoord(neko.coord),
                rightCoord(neko.coord)]
                .filter(coord => canEnter(coord, field.terrain, player))
                .map(coord => (drop({ ...neko, coord }, field.terrain))));

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
        return drop(neko, field.terrain);
    }
}