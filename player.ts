/// <reference path="./resources.ts" />
/// <reference path="./gameobject.ts" />
/// <reference path="./field.ts" />

interface Player extends GameObject {
    readonly state: PlayerState;
    readonly facingDirection: FacingDirection;
    readonly smallCount: number;
}

type PlayerState = "stand" | "ladder" | "drop";
type FacingDirection = "facing_left" | "facing_right";

namespace Player {
    export function create(): Player {
        return {
            state: "stand",
            coord: createCoord(0, 0),
            facingDirection: "facing_left",
            smallCount: 0,
            texture: cloneAndReplayTexture(resources.player_stand_right_texture),
        };
    }

    // その場所でプレイヤーがどのようにあるべきか
    function checkState(coord: Coord, terrain: Terrain, isSmall: boolean): PlayerState | null {
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
        return checkState(coord, terrain, isSmall) !== null;
    }
    //その場に立てるか判定。上半身か下半身、足の下がはしごならtrue、足の下が空中だとfalse。スペースが無くてもfalse
    function canStand(coord: Coord, terrain: Terrain, isSmall: boolean): boolean {
        return checkState(coord, terrain, isSmall) !== null
            && checkState(coord, terrain, isSmall) !== "drop";
    }

    type Direction = "left" | "right" | "up" | "down";
    type MoveDirection = "move_left" | "move_right" | "move_up" | "move_down" | "move_left_up" | "move_right_up";
    type MoveResult = null | { coord: Coord; state: PlayerState, moveDirection: MoveDirection; };

    function checkLeft(coord: Coord, terrain: Terrain, isSmall: boolean): MoveResult {
        // 左が空いているならそこ
        const leftState = checkState(leftCoord(coord), terrain, isSmall);
        if (leftState !== null) {
            return {
                coord: leftCoord(coord),
                state: leftState,
                moveDirection: "move_left",
            };
        }
        // 上がふさがってなくて左上に立てるならそこ
        if (checkState(upCoord(coord), terrain, isSmall) !== null
            && checkState(leftCoord(upCoord(coord)), terrain, isSmall) === "stand")
            return {
                coord: leftCoord(upCoord(coord)),
                state: "stand",
                moveDirection: "move_left_up",
            };
        return null;
    }
    function checkRight(coord: Coord, terrain: Terrain, isSmall: boolean): MoveResult {
        // 右が空いているならそこ
        const rightState = checkState(rightCoord(coord), terrain, isSmall);
        if (rightState !== null) {
            return {
                coord: rightCoord(coord),
                state: rightState,
                moveDirection: "move_right",
            };
        }
        // 上がふさがってなくて右上に立てるならそこ
        if (checkState(upCoord(coord), terrain, isSmall) !== null
            && checkState(rightCoord(upCoord(coord)), terrain, isSmall) === "stand")
            return {
                coord: rightCoord(upCoord(coord)),
                state: "stand",
                moveDirection: "move_right_up",
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
                moveDirection: "move_up",
            };
        return null;
    }
    function checkDown(coord: Coord, terrain: Terrain, isSmall: boolean): MoveResult {
        // 真下が空いてるなら（飛び）下りる？
        const downstate = checkState(downCoord(coord), terrain, isSmall);
        if (downstate !== null)
            return {
                coord: downCoord(coord),
                state: downstate,
                moveDirection: "move_down",
            };
        return null;
    }

    export function shrink(player: Player): Player {
        if (!isStable(player)) return player;

        return updateTexture({
            ...player,
            smallCount: 5,
        });
    }

    function isStable(player: Player): player is Player & { state: "stand" | "ladder"; } {
        return player.state === "stand" || player.state === "ladder";
    }

    // プレイヤーを落とす処理
    function drop(player: Player, field: Field): Player {
        if (isStable(player)) {
            return updateTexture(player);
        }
        else {
            //宙に浮いてたら自動で落ちる
            const result = checkDown(player.coord, field.terrain, 0 < player.smallCount)
                || { state: "drop", coord: downCoord(player.coord) }; //埋まる場合には更に落とす
            const textureSet = getDropTexture(result.state, player.facingDirection);
            return {
                ...player,
                texture: cloneAndReplayTexture(
                    textureSet[0 < player.smallCount ? "small" : "normal"],
                    () => drop(player, field)),
                coord: result.coord,
                state: result.state,
                //moveDirectionは更新しない（向いている方向を判別したいので）
            };
        }

        function getDropTexture(newState: PlayerState, facingDirection: FacingDirection): { normal: Texture, small: Texture; } {
            switch (newState) {
                //落下に関して移動方向は考えない（必ず下と見做す）。代わりに顔の向きを考える
                //着地
                case "stand": switch (facingDirection) {
                    case "facing_left": return {
                        small: resources.player_small_drop_left_texture,
                        normal: resources.player_drop_left_texture,
                    }; break;
                    case "facing_right": return {
                        small: resources.player_small_drop_right_texture,
                        normal: resources.player_drop_right_texture,
                    }; break;
                    default: return facingDirection;
                } break;
                //梯子に着地
                case "ladder": switch (facingDirection) {
                    case "facing_left": return {
                        small: resources.player_small_drop_left_texture,
                        normal: resources.player_drop_left_texture,
                    }; break;
                    case "facing_right": return {
                        small: resources.player_small_drop_right_texture,
                        normal: resources.player_drop_right_texture,
                    }; break;
                    default: return facingDirection;
                }
                    break;
                //落下継続
                case "drop": switch (facingDirection) {
                    case "facing_left": return {
                        small: resources.player_small_drop_left_texture,
                        normal: resources.player_drop_left_texture,
                    }; break;
                    case "facing_right": return {
                        small: resources.player_small_drop_right_texture,
                        normal: resources.player_drop_right_texture,
                    }; break;
                    default: return facingDirection;
                } break;
                default: return newState;
            }
        }
    }

    //プレイヤーのstateを見てテクスチャを更新する。
    function updateTexture(player: Player & { state: "stand" | "ladder"; }): Player {
        const textureSet = getStateTexture(player.state, player.facingDirection);

        return {
            ...player,
            texture: textureSet[0 < player.smallCount ? "small" : "normal"],
        };

        function getStateTexture(state: "stand" | "ladder", facingDirection: FacingDirection): { normal: Texture, small: Texture; } {
            switch (state) {
                case "stand": {
                    switch (facingDirection) {
                        case "facing_left": return {
                            small: cloneAndReplayTexture(resources.player_small_stand_left_texture),
                            normal: cloneAndReplayTexture(resources.player_stand_left_texture),
                        }; break;
                        case "facing_right": return {
                            small: cloneAndReplayTexture(resources.player_small_stand_right_texture),
                            normal: cloneAndReplayTexture(resources.player_stand_right_texture),
                        }; break;
                        default: return facingDirection;
                    }
                } break;
                case "ladder": return {
                    small: cloneAndReplayTexture(resources.player_small_hold_texture),
                    normal: cloneAndReplayTexture(resources.player_hold_texture),
                }; break;
            }
        }
    }

    //プレイヤーを直接動かす。
    export function move(player: Player, field: Field, direction: Direction): Player {
        if (player.state === "drop") return player;

        let result: MoveResult = null;
        switch (direction) {
            case "left": result = checkLeft(player.coord, field.terrain, 0 < player.smallCount); break;
            case "right": result = checkRight(player.coord, field.terrain, 0 < player.smallCount); break;
            case "up": result = checkUp(player.coord, field.terrain, 0 < player.smallCount); break;
            case "down": result = checkDown(player.coord, field.terrain, 0 < player.smallCount); break;
        }
        if (result === null) return player;

        const textureSet = getTransitionTexture(player.state, result.state, result.moveDirection, player.facingDirection);

        return {
            ...player,
            texture: cloneAndReplayTexture(
                textureSet[0 < player.smallCount ? "small" : "normal"],
                () => drop(player, field)),
            coord: result.coord,
            state: result.state,
            //意図的に左を向いた時のみ左を向く。（梯子中など）無標は右
            facingDirection: direction === "left" ? "facing_left" : "facing_right",

            smallCount: Math.max(0, player.smallCount - 1),
        };

        turn(field, player);

        function getTransitionTexture(oldState: "stand" | "ladder", newState: PlayerState, moveDirection: MoveDirection, facingDirection: FacingDirection): { normal: Texture, small: Texture; } {
            switch (oldState) {
                case "stand": switch (newState) {
                    // 歩き系
                    case "stand": switch (moveDirection) {
                        //左に歩く
                        case "move_left": return {
                            small: resources.player_small_walk_left_texture,
                            normal: resources.player_walk_left_texture,
                        }; break;
                        //右に歩く
                        case "move_right": return {
                            small: resources.player_small_walk_right_texture,
                            normal: resources.player_walk_right_texture,
                        }; break;
                        //左上によじ登る
                        case "move_left_up": return {
                            small: resources.player_small_climb_left_texture,
                            normal: resources.player_climb_left_texture,
                        }; break;
                        //右上によじ登る
                        case "move_right_up": return {
                            small: resources.player_small_climb_right_texture,
                            normal: resources.player_climb_right_texture,
                        }; break;
                    } break;
                    //梯子につかまる
                    case "ladder": switch (moveDirection) {
                        //左の梯子に掴まる
                        case "move_left": return {
                            small: resources.player_small_walk_left_texture,
                            normal: resources.player_walk_left_texture,
                        }; break;
                        //右の梯子につかまる
                        case "move_right": return {
                            small: resources.player_small_walk_right_texture,
                            normal: resources.player_walk_right_texture,
                        }; break;
                        //上の梯子につかまる
                        case "move_up": return {
                            small: resources.player_small_climb_up_texture,
                            normal: resources.player_climb_up_texture,
                        }; break;
                    } break;
                    //足場から飛び降り
                    case "drop": switch (moveDirection) {
                        //左に飛び降り
                        case "move_left": return {
                            small: resources.player_small_walk_left_texture,
                            normal: resources.player_walk_left_texture,
                        }; break;
                        //右に飛び降り
                        case "move_right": return {
                            small: resources.player_small_walk_right_texture,
                            normal: resources.player_walk_right_texture,
                        }; break;
                    } break;
                } break;
                case "ladder": switch (newState) {
                    //梯子から穏便に落ちる
                    case "stand": switch (moveDirection) {
                        //左の足場に下りる
                        case "move_left": return {
                            small: resources.player_small_walk_left_texture,
                            normal: resources.player_walk_left_texture,
                        }; break;
                        //右の足場に下りる
                        case "move_right": return {
                            small: resources.player_small_walk_right_texture,
                            normal: resources.player_walk_right_texture,
                        }; break;
                        //下の足場に下りる
                        case "move_down": return {
                            small: resources.player_small_climb_down_texture,
                            normal: resources.player_climb_down_texture,
                        }; break;
                        //梯子から左上によじ登る
                        case "move_left_up": return {
                            small: resources.player_small_climb_left_texture,
                            normal: resources.player_climb_left_texture,
                        }; break;
                        //梯子から右上によじ登る
                        case "move_right_up": return {
                            small: resources.player_small_climb_right_texture,
                            normal: resources.player_climb_right_texture,
                        }; break;
                    } break;
                    //梯子上で移動
                    case "ladder": switch (moveDirection) {
                        //左の梯子に掴まる
                        case "move_left": return {
                            small: resources.player_small_walk_left_texture,
                            normal: resources.player_walk_left_texture,
                        }; break;
                        //右の梯子につかまる
                        case "move_right": return {
                            small: resources.player_small_walk_right_texture,
                            normal: resources.player_walk_right_texture,
                        }; break;
                        //上の梯子につかまる
                        case "move_up": return {
                            small: resources.player_small_climb_up_texture,
                            normal: resources.player_climb_up_texture,
                        }; break;
                        //下の梯子につかまる
                        case "move_down": return {
                            small: resources.player_small_climb_down_texture,
                            normal: resources.player_climb_down_texture,
                        }; break;
                    } break;
                    //梯子から飛び降り
                    case "drop": switch (moveDirection) {
                        //左に
                        case "move_left": return {
                            small: resources.player_small_walk_left_texture,
                            normal: resources.player_walk_left_texture,
                        }; break;
                        //右に
                        case "move_right": return {
                            small: resources.player_small_walk_right_texture,
                            normal: resources.player_walk_right_texture,
                        }; break;
                        //下に
                        case "move_down": return {
                            small: resources.player_small_climb_down_texture,
                            normal: resources.player_climb_down_texture,
                        }; break;
                    } break;
                } break;
            }
            throw new Error("unecpected texture requested");
        }
    }
}