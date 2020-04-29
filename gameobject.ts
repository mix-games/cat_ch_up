/// <reference path="./resources.ts" />
/// <reference path="./coord.ts" />
/// <reference path="./field.ts" />

interface GameObject {
    coord: Coord; //足元のブロックの座標
    texture: Texture;
}

interface Player extends GameObject {
    smallCount: number;
}

function createPlayer(): Player {
    return {
        coord: createCoord(0, 0),
        smallCount: 0,
        texture: cloneAndReplayTexture(resources.player_stand_right_texture),
    };
}

//そこにプレイヤーが入るスペースがあるか判定。空中でもtrue
function canEnter(coord: Coord, terrain: Terrain, isSmall: boolean): boolean {
    if (isSmall)
        return getBlock(terrain, coord).collision !== "solid";

    return getBlock(terrain, coord).collision !== "solid"
        && getBlock(terrain, upCoord(coord)).collision !== "solid";
}
//その場に立てるか判定。上半身か下半身、足の下がはしごならtrue、足の下が空中だとfalse。スペースが無くてもfalse
function canStand(coord: Coord, terrain: Terrain, isSmall: boolean): boolean {
    if (!canEnter(coord, terrain, isSmall))
        return false;

    if (isSmall && getBlock(terrain, coord).collision === "ladder")
        return true;

    if (getBlock(terrain, coord).collision === "ladder"
        || getBlock(terrain, upCoord(coord)).collision === "ladder"
        || getBlock(terrain, downCoord(coord)).collision === "ladder")
        return true;

    return getBlock(terrain, downCoord(coord)).collision === "solid";
}

type Direction = "left" | "right" | "up" | "down";
type ActionType = "walk" | "climb" | "drop";
type MoveResult = null | { coord: Coord; actionType: ActionType; texture: Texture };

function checkLeft(coord: Coord, terrain: Terrain, isSmall: boolean): MoveResult {
    // 左が空いているならそこ
    if (canEnter(leftCoord(coord), terrain, isSmall))
        return { coord: leftCoord(coord), actionType: "walk", texture: isSmall ? resources.player_small_walk_left_texture : resources.player_walk_left_texture};
    // 上がふさがってなくて左上が空いているならそこ
    if (canEnter(upCoord(coord), terrain, isSmall)
        && canEnter(leftCoord(upCoord(coord)), terrain, isSmall))
        return { coord: leftCoord(upCoord(coord)), actionType: "climb", texture: isSmall ? resources.player_small_climb_left_texture : resources.player_climb_left_texture};
    return null;
}
function checkRight(coord: Coord, terrain: Terrain, isSmall: boolean): MoveResult {
    // 右が空いているならそこ
    if (canEnter(rightCoord(coord), terrain, isSmall))
        return { coord: rightCoord(coord), actionType: "walk", texture: isSmall ? resources.player_small_walk_right_texture : resources.player_walk_right_texture };
    // 上がふさがってなくて右上が空いているならそこ
    if (canEnter(upCoord(coord), terrain, isSmall)
        && canEnter(rightCoord(upCoord(coord)), terrain, isSmall))
        return { coord: rightCoord(upCoord(coord)), actionType: "climb", texture: isSmall ? resources.player_small_climb_right_texture : resources.player_climb_right_texture };
    return null;
}
function checkUp(coord: Coord, terrain: Terrain, isSmall: boolean): MoveResult {
    // 下半身か上半身が梯子で、かつ真上に留まれるなら登る？
    if ((getBlock(terrain, coord).collision === "ladder" ||
        getBlock(terrain, upCoord(coord)).collision === "ladder") &&
        canStand(upCoord(coord), terrain, isSmall))
        return { coord: upCoord(coord), actionType: "climb", texture: isSmall ? resources.player_small_climb_up_texture : resources.player_climb_up_texture };
    return null;
}
function checkDown(coord: Coord, terrain: Terrain, isSmall: boolean): MoveResult {
    // 真下が空いてるなら（飛び）下りる？
    if (canEnter(downCoord(coord), terrain, isSmall))
        return { coord: downCoord(coord), actionType: "climb", texture: isSmall ? resources.player_small_climb_down_texture : resources.player_climb_down_texture };
    return null;
}

//プレイヤーを直接動かす。落とす処理もする。
function movePlayer(player: Player, field: Field, direction: Direction) {
    let result: MoveResult = null;

    switch (direction) {
        case "left": result = checkLeft(player.coord, field.terrain, 0 < player.smallCount); break;
        case "right": result = checkRight(player.coord, field.terrain, 0 < player.smallCount); break;
        case "up": result = checkUp(player.coord, field.terrain, 0 < player.smallCount); break;
        case "down": result = checkDown(player.coord, field.terrain, 0 < player.smallCount); break;
    }
    if (result === null) return null;

    // 立てる場所まで落とす
    while (!canStand(result.coord, field.terrain, 0 < player.smallCount)) {
        result.actionType = "drop";
        result.coord = downCoord(result.coord);
    }
    player.coord = result.coord;
    player.texture = cloneAndReplayTexture(result.texture);

    if(0 < player.smallCount)
        player.smallCount--;

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
        coord: createCoord(0, 5),
        texture: createRectTexture("blue", blockSize - 4, blockSize - 2, blockSize / 2 - 2, -2)
    };
}

function controlNeko(neko: Neko, field:Field, player:Player): void {
    neko.coord = rightCoord(neko.coord);
}

function drawGameObject(gameObject: GameObject, camera: Camera, renderer: Renderer) {
    drawTexture(
        gameObject.texture,
        camera.offsetX + gameObject.coord.x * blockSize,
        camera.offsetY - gameObject.coord.y * blockSize,
        renderer
    );
}