
interface Player extends GameObject {
    state: PlayerState;
    facingDirection: "left" | "right";
    smallCount: number;
}

function createPlayer(): Player {
    return {
        state: "stand",
        coord: createCoord(0, 0),
        facingDirection: "left",
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

//プレイヤーを直接動かす。落とす処理もする。
function movePlayer(player: Player, field: Field, direction: Direction) {
    if(player.state === "drop") return;

    let result: MoveResult = null;
    switch (direction) {
        case "left": result = checkLeft(player.coord, field.terrain, 0 < player.smallCount); break;
        case "right": result = checkRight(player.coord, field.terrain, 0 < player.smallCount); break;
        case "up": result = checkUp(player.coord, field.terrain, 0 < player.smallCount); break;
        case "down": result = checkDown(player.coord, field.terrain, 0 < player.smallCount); break;
    }
    if (result === null) return null;

    player.texture = cloneAndReplayTexture(getTransitionTexture(player, result.state, result.moveDirection, field), () => updateTexture(player, field));
    player.coord = result.coord;
    player.state = result.state;
    //意図的に左を向いた時のみ左を向く。（梯子中など）無標は右
    player.facingDirection = direction === "left" ? "left" : "right";

    if(0 < player.smallCount)
        player.smallCount--;

    turn(field, player);

    function updateTexture(player: Player, field: Field){
        switch(player.state) {
            case "stand": {
                switch (player.facingDirection) {
                    case "left": {
                        if (0 < player.smallCount)
                            player.texture = cloneAndReplayTexture(resources.player_small_stand_left_texture);
                        else
                            player.texture = cloneAndReplayTexture(resources.player_stand_left_texture);
                    } break;
                    case "right": {
                        if (0 < player.smallCount)
                            player.texture = cloneAndReplayTexture(resources.player_small_stand_right_texture);
                        else
                            player.texture = cloneAndReplayTexture(resources.player_stand_right_texture);
                    } break;
                    default : const never: never = player.facingDirection;
                }
            } break;
            case "ladder": {
                if (0 < player.smallCount)
                    player.texture = cloneAndReplayTexture(resources.player_small_hold_texture);
                else
                   player.texture = cloneAndReplayTexture(resources.player_hold_texture);
            } break;
            case "drop": {
                //宙に浮いてたら自動で落ちる
                const result = checkDown(player.coord, field.terrain, 0 < player.smallCount);
                if(result !== null) {
                    player.texture = cloneAndReplayTexture(
                        getTransitionTexture(player, result.state, result.moveDirection, field),
                        () => updateTexture(player, field));
                    player.coord = result.coord;
                    player.state = result.state;
                    //moveDirectionは更新しない（向いている方向を判別したいので）
                }
            } break;
        }
    }
    
    function getTransitionTexture(player: Player, newState: PlayerState, moveDirection: MoveDirection, field: Field): Texture {
        // 最上位は移動方向で区別（素材が間に合わなかった場合、同じ移動方向のテクスチャで代用することになりそうなので）
        switch (moveDirection) {
            case "left": {
                if (0 < player.smallCount) 
                    return resources.player_small_walk_left_texture;
                else 
                    return resources.player_walk_left_texture;
            } break;
            case "right": {
                if (0 < player.smallCount)
                    return resources.player_small_walk_right_texture;
                else 
                    return resources.player_walk_right_texture;
            } break;
            case "left_up": {
                if (0 < player.smallCount) 
                    return resources.player_small_climb_left_texture;
                else 
                    return resources.player_climb_left_texture
            } break;
            case "right_up": {
                if (0 < player.smallCount)
                    return resources.player_small_climb_right_texture;
                else
                    return resources.player_climb_right_texture;
            } break;
            case "up": {
                if (0 < player.smallCount) 
                    return resources.player_small_climb_up_texture;
                else
                    return resources.player_climb_up_texture;
            } break;
            case "down": {
                switch (player.state) {
                    case "stand": {
                        //ないはずだけど
                        return resources.player_drop_left_texture;
                    } break;
                    case "ladder": {
                        switch (newState) {
                            //足場の一ブロック上に足があるところから飛び下りる
                            case "stand": {
                                if (0 < player.smallCount) 
                                    return resources.player_small_drop_left_texture;
                                else
                                    return resources.player_drop_left_texture;
                            } break;
                            //下に梯子移動
                            case "ladder": {
                                if (0 < player.smallCount) 
                                    return resources.player_small_climb_down_texture;
                                else 
                                    return resources.player_climb_down_texture;
                            } break;
                            //梯子の一番下から飛び降りる
                            case "drop": {
                                if (0 < player.smallCount) 
                                    return resources.player_small_drop_left_texture;
                                else 
                                    return resources.player_drop_left_texture;
                            } break;
                            default: return newState;
                        }
                    } break;
                    case "drop": {
                        switch (newState) {
                            //着地
                            case "stand": {
                                switch (player.facingDirection) {
                                    case "left": {
                                        if (0 < player.smallCount)
                                            return resources.player_small_drop_right_texture;
                                        else
                                            return resources.player_drop_right_texture;
                                    } break;
                                    case "right": {
                                        if (0 < player.smallCount)
                                            return resources.player_small_drop_left_texture;
                                        else
                                            return resources.player_drop_left_texture;
                                    } break;
                                    default : return player.facingDirection;
                                }
                            } break;
                            //梯子に着地
                            case "ladder": {
                                switch (player.facingDirection) {
                                    case "left": {
                                        if (0 < player.smallCount)
                                            return resources.player_small_drop_right_texture;
                                        else
                                            return resources.player_drop_right_texture;
                                    } break;
                                    case "right": {
                                        if (0 < player.smallCount)
                                            return resources.player_small_drop_left_texture;
                                        else
                                            return resources.player_drop_left_texture;
                                    } break;
                                    default : return player.facingDirection;
                                }
                            } break;
                            //落下継続
                            case "drop": {
                                switch (player.facingDirection) {
                                    case "left": {
                                        if (0 < player.smallCount)
                                            return resources.player_small_drop_right_texture;
                                        else
                                            return resources.player_drop_right_texture;
                                    } break;
                                    case "right": {
                                        if (0 < player.smallCount)
                                            return resources.player_small_drop_left_texture;
                                        else
                                            return resources.player_drop_left_texture;
                                    } break;
                                    default : return player.facingDirection;
                                }
                            } break;
                            default: return newState;
                        }
                    } break;
                    default: return player.state;
                }
            } break;
            default: return moveDirection;
        }
    }
}