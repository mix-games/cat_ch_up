
interface Player extends GameObject {
    state: PlayerState;
    smallCount: number;
}

function createPlayer(): Player {
    return {
        state: "stand",
        coord: createCoord(0, 0),
        smallCount: 0,
        texture: cloneAndReplayTexture(resources.player_stand_right_texture),
    };
}


type PlayerState = "stand" | "ladder" | "drop";
// その場所でプレイヤーがどのようにあるべきか
function checkPlayerState(coord: Coord, terrain: Terrain, isSmall: boolean): PlayerState | null {
    if (isSmall) {
        const ground = getBlock(terrain, downCoord(coord)).collision;
        const body = getBlock(terrain, coord).collision;

        if (body === "solid") return null;
        if (ground === "solid") return "stand";
        if (body === "ladder") return "ladder";
        if (body === "air") return "drop";

        //意味わからんけど網羅チェックとして機能するらしい
        return body;
    }
    else {
        const ground = getBlock(terrain, downCoord(coord)).collision;
        const foot = getBlock(terrain, coord).collision;
        const head = getBlock(terrain, upCoord(coord)).collision;
        
        if (head === "solid" || foot === "solid") return null;
        if (ground === "solid") return "stand";
        if (head === "ladder") return "ladder";
        if (head === "air") return "drop";
        
        //意味わからんけど網羅チェックとして機能するらしい
        return head;
    }
}

//そこにプレイヤーが入るスペースがあるか判定。空中でもtrue
function canEnter(coord: Coord, terrain: Terrain, isSmall: boolean): boolean {
    return checkPlayerState(coord, terrain, isSmall) !== null;
}
//その場に立てるか判定。上半身か下半身、足の下がはしごならtrue、足の下が空中だとfalse。スペースが無くてもfalse
function canStand(coord: Coord, terrain: Terrain, isSmall: boolean): boolean {
    return checkPlayerState(coord, terrain, isSmall) !== null
        && checkPlayerState(coord, terrain, isSmall) !== "drop";
}

type Direction = "left" | "right" | "up" | "down";
type MoveDirection = "left" | "right" | "up" | "down" | "left_up" | "right_up";
type MoveResult = null | { coord: Coord; state: PlayerState, moveDirection: MoveDirection };

function checkLeft(coord: Coord, terrain: Terrain, isSmall: boolean): MoveResult {
    // 左が空いているならそこ
    const leftState = checkPlayerState(leftCoord(coord), terrain, isSmall);
    if (leftState !== null) {
        return {
            coord: leftCoord(coord),
            state: leftState,
            moveDirection: "left",
        };
    }
    // 上がふさがってなくて左上に立てるならそこ
    if (checkPlayerState(upCoord(coord), terrain, isSmall) !== null
    && checkPlayerState(leftCoord(upCoord(coord)), terrain, isSmall) === "stand")
        return { 
            coord: leftCoord(upCoord(coord)),
            state: "stand",
            moveDirection: "left_up", 
        };
    return null;
}
function checkRight(coord: Coord, terrain: Terrain, isSmall: boolean): MoveResult {
    // 右が空いているならそこ
    const rightState = checkPlayerState(rightCoord(coord), terrain, isSmall);
    if (rightState !== null) {
        return {
            coord: rightCoord(coord),
            state: rightState,
            moveDirection: "right",
        };
    }
    // 上がふさがってなくて右上に立てるならそこ
    if (checkPlayerState(upCoord(coord), terrain, isSmall) !== null
    && checkPlayerState(rightCoord(upCoord(coord)), terrain, isSmall) === "stand")
        return { 
            coord: rightCoord(upCoord(coord)),
            state: "stand",
            moveDirection: "right_up", 
        };
    return null;
}
function checkUp(coord: Coord, terrain: Terrain, isSmall: boolean): MoveResult {
    // 上半身が梯子で、かつ真上に留まれるなら登る？
    if (getBlock(terrain, isSmall ? coord : upCoord(coord)).collision === "ladder" &&
        canStand(upCoord(coord), terrain, isSmall))
        return {
            coord: upCoord(coord),
            state: "ladder",
            moveDirection: "up",
        };
    return null;
}
function checkDown(coord: Coord, terrain: Terrain, isSmall: boolean): MoveResult {
    // 真下が空いてるなら（飛び）下りる？
    const downstate = checkPlayerState(downCoord(coord), terrain, isSmall);
    if (downstate !== null)
        return {
            coord: downCoord(coord),
            state: downstate,
            moveDirection: "down",
        };
    return null;
}

function getPlayerTexture(state: PlayerState, oldState: PlayerState, moveDirection: MoveDirection, isSmall: boolean): Texture {
    switch (moveDirection) {
        case "left": {
            if (isSmall) {
                return cloneAndReplayTexture(resources.player_small_walk_left_texture);
            }
            else {
                return cloneAndReplayTexture(resources.player_walk_left_texture);
            }
        } break;
        case "right": {
            if (isSmall) {
                return cloneAndReplayTexture(resources.player_small_walk_right_texture);
            }
            else {
                return cloneAndReplayTexture(resources.player_walk_right_texture);
            }
        } break;
        case "up": {
            if (isSmall) {
                return cloneAndReplayTexture(resources.player_small_climb_up_texture);
            }
            else {
                return cloneAndReplayTexture(resources.player_climb_up_texture);
            }
        } break;
        case "down": {
            if (isSmall) {
                return cloneAndReplayTexture(resources.player_small_climb_up_texture);
            }
            else {
                return cloneAndReplayTexture(resources.player_climb_up_texture);
            }
        } break;
        case "left_up": {
            if (isSmall) {
                return cloneAndReplayTexture(resources.player_small_climb_left_texture);
            }
            else {
                return cloneAndReplayTexture(resources.player_climb_left_texture);
            }
        } break;
        case "right_up": {
            if (isSmall) {
                return cloneAndReplayTexture(resources.player_small_climb_right_texture);
            }
            else {
                return cloneAndReplayTexture(resources.player_climb_right_texture);
            }
        } break;
        default: {
            //網羅チェック
            const never:never = moveDirection;
        }
    }

    //網羅チェックになるらしい
    return moveDirection;
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
        result.coord = downCoord(result.coord);
    }
    player.texture = getPlayerTexture(result.state, player.state, result.moveDirection, 0 < player.smallCount);
    player.state = result.state;
    player.coord = result.coord;

    if(0 < player.smallCount)
        player.smallCount--;

    turn(field, player);
}