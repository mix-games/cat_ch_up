/// <reference path="./resources.ts" />
/// <reference path="./gameobject.ts" />
/// <reference path="./field.ts" />

interface Player extends GameObject {
    readonly state: "stand" | "ladder";
    readonly facingDirection: FacingDirection;
    readonly smallCount: number;
}

type FacingDirection = "facing_left" | "facing_right";
type InputDirection = "input_up" | "input_left" | "input_right" | "input_down";

namespace Player {
    export function create(): Player {
        return {
            state: "stand",
            coord: createCoord(0, 0),
            facingDirection: "facing_left",
            smallCount: 0,
            animationTimestamp: 0,
            texture: resources.player_stand_right_texture,
        };
    }

    // その場所でプレイヤーがどのようにあるべきか
    function checkState(coord: Coord, terrain: Terrain, isSmall: boolean): "stand" | "ladder" | "drop" | null {
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

    //type MoveDirection = "move_left" | "move_right" | "move_up" | "move_down" | "move_left_up" | "move_right_up";
    type MoveResult = { coord: Coord; state: "stand" | "ladder"; };

    export function drop(coord: Coord, state: "stand" | "ladder" | "drop" | null, terrain: Terrain, isSmall: boolean): MoveResult {
        if (state === "stand" || state === "ladder") return { coord, state };
        return (drop(downCoord(coord), checkState(downCoord(coord), terrain, isSmall), terrain, isSmall));
    }

    export function check(coord: Coord, terrain: Terrain, isSmall: boolean, direction: InputDirection): MoveResult | null {
        switch (direction) {
            case "input_left": {
                // 左が空いているならそこ
                const leftState = checkState(leftCoord(coord), terrain, isSmall);
                if (leftState !== null) {
                    return drop(leftCoord(coord), leftState, terrain, isSmall);
                }
                // 上がふさがってなくて左上に立てるならそこ
                if (checkState(upCoord(coord), terrain, isSmall) !== null
                    && checkState(leftCoord(upCoord(coord)), terrain, isSmall) === "stand")
                    return {
                        coord: leftCoord(upCoord(coord)),
                        state: "stand",
                    };
                return null;
            }
            case "input_right": {
                // 右が空いているならそこ
                const rightState = checkState(rightCoord(coord), terrain, isSmall);
                if (rightState !== null) {
                    return drop(rightCoord(coord), rightState, terrain, isSmall);
                }
                // 上がふさがってなくて右上に立てるならそこ
                if (checkState(upCoord(coord), terrain, isSmall) !== null
                    && checkState(rightCoord(upCoord(coord)), terrain, isSmall) === "stand")
                    return {
                        coord: rightCoord(upCoord(coord)),
                        state: "stand",
                    };
                return null;
            }
            case "input_up": {
                // 上半身が梯子で、かつ真上に留まれるなら登る？
                if (getBlock(terrain, isSmall ? coord : upCoord(coord)).collision === "ladder" &&
                    canStand(upCoord(coord), terrain, isSmall))
                    return {
                        coord: upCoord(coord),
                        state: "ladder",
                    };
                return null;
            }
            case "input_down": {
                // 真下が空いてるなら（飛び）下りる？
                const downState = checkState(downCoord(coord), terrain, isSmall);
                if (downState !== null)
                    return drop(downCoord(coord), downState, terrain, isSmall);
                return null;
            }
            default: return direction;
        }
    }

    export function shrink(player: Player): Player {
        return updateTexture({
            ...player,
            smallCount: 5,
        });
    }

    interface TextureVariants {
        small: Texture,
        normal: Texture,
    };
    function selectTexture(textureVariants: TextureVariants, smallCount: number): Texture {
        if(smallCount === 1) {
            return createFlashTexture(textureVariants.small, textureVariants.normal);
        }
        return textureVariants[0 < smallCount ? "small" : "normal"];
    }

    //プレイヤーのstateを見てテクスチャを更新する。
    function updateTexture(player: Player): Player {
        const textureSet = getStateTexture(player.state, player.facingDirection);

        return {
            ...player,
            animationTimestamp: tick,
            texture: selectTexture(textureSet, player.smallCount),
        };
    }

    function getStateTexture(state: "stand" | "ladder", facingDirection: FacingDirection): TextureVariants {
        switch (state) {
            case "stand": {
                switch (facingDirection) {
                    case "facing_left": return {
                        small: resources.player_small_stand_left_texture,
                        normal: resources.player_stand_left_texture,
                    }; break;
                    case "facing_right": return {
                        small: resources.player_small_stand_right_texture,
                        normal: resources.player_stand_right_texture,
                    }; break;
                    default: return facingDirection;
                }
            } break;
            case "ladder": return {
                small: resources.player_small_hold_texture,
                normal: resources.player_hold_texture,
            }; break;
        }
    }

    function getTransitionTexture(oldState: "stand" | "ladder", newState: "stand" | "ladder", dx: number, dy: number, facingDirection: FacingDirection): TextureVariants {
        // 梯子真下移動を除く下方向の移動は飛び降りとして処理
        if (dy <= -1 && !(oldState === "ladder" && newState === "ladder" && dx === 0 && dy === -1)) {
            let startTexture: TextureVariants;
            switch (oldState) {
                case "stand": switch (dx) {
                    //足場から左に落ちた
                    case -1:
                        startTexture = {
                            small: resources.player_small_walk_left_texture,
                            normal: resources.player_walk_left_texture,
                        };
                        break;
                    //足場から右に落ちた
                    case 1:
                        startTexture = {
                            small: resources.player_small_walk_right_texture,
                            normal: resources.player_walk_right_texture,
                        };
                        break;
                    default: throw new Error("unexpected texture requested");
                } break;
                case "ladder": switch (dx) {
                    //梯子から左に落ちた
                    case -1:
                        startTexture = {
                            small: resources.player_small_walk_left_texture,
                            normal: resources.player_walk_left_texture,
                        };
                        break;
                    //梯子から真下に落ちた
                    case 0:
                        startTexture = {
                            small: resources.player_small_climb_down_texture,
                            normal: resources.player_small_climb_down_texture,
                        };
                        break;
                    //梯子から右に落ちた
                    case 1:
                        startTexture = {
                            small: resources.player_small_walk_right_texture,
                            normal: resources.player_walk_right_texture,
                        };
                        break;
                    default: throw new Error("unexpected texture requested");
                } break;
                //網羅チェック
                default: startTexture = oldState; 
            }

            let midTexture: TextureVariants;
            switch (facingDirection) {
                case "facing_left":
                    midTexture = {
                        small: resources.player_small_drop_left_texture,
                        normal: resources.player_drop_left_texture,
                    };
                    break;
                case "facing_right":
                    midTexture = {
                        small: resources.player_small_drop_right_texture,
                        normal: resources.player_drop_right_texture,
                    };
                    break;
                default: midTexture = facingDirection;
            }

            let endTexture: TextureVariants;
            switch (newState) {
                case "stand": switch (facingDirection) {
                    //左を向いて足場に着地
                    case "facing_left":
                        endTexture = {
                            small: resources.player_small_stand_left_texture,
                            normal: resources.player_stand_left_texture,
                        }; break;
                    //右を向いて足場に着地
                    case "facing_right":
                        endTexture = {
                            small: resources.player_small_stand_right_texture,
                            normal: resources.player_stand_right_texture,
                        }; break;
                    default: endTexture = facingDirection;
                } break;
                case "ladder": switch (facingDirection) {
                    //左を向いて梯子に着地
                    case "facing_left":
                        endTexture = {
                            small: resources.player_small_stand_left_texture,
                            normal: resources.player_stand_left_texture,
                        }; break;
                    //右を向いて梯子に着地
                    case "facing_right":
                        endTexture = {
                            small: resources.player_small_stand_right_texture,
                            normal: resources.player_stand_right_texture,
                        }; break;
                    default: endTexture = facingDirection;
                } break;
                default: endTexture = newState;
            }

            const smallTextures: Texture[] = [];
            smallTextures.push(createOffsetTexture(startTexture.small, 0, -dy * blockSize));
            for (let i = 0; i < -dy - 1; i++) {
                smallTextures.push(createOffsetTexture(midTexture.small, 0, (-dy - i - 1) * blockSize));
            }
            smallTextures.push(endTexture.small);

            const normalTextures: Texture[] = [];
            normalTextures.push(createOffsetTexture(startTexture.normal, 0, -dy * blockSize));
            for (let i = 0; i < -dy - 1; i++) {
                normalTextures.push(createOffsetTexture(midTexture.normal, 0, (-dy - i - 1) * blockSize));
            }
            normalTextures.push(endTexture.normal);

            return { 
                small: joinAnimation(smallTextures, false),
                normal: joinAnimation(normalTextures, false),
            }
        }

        switch (oldState) {
            case "stand": switch (newState) {
                // 歩き系
                case "stand": switch (dx) {
                    //左に
                    case -1: switch (dy) {
                        //歩く
                        case 0: return {
                            small: resources.player_small_walk_left_texture,
                            normal: resources.player_walk_left_texture,
                        }; break;
                        //よじ登る
                        case 1: return {
                            small: resources.player_small_climb_left_texture,
                            normal: resources.player_climb_left_texture,
                        }; break;
                    } break;
                    //右に
                    case 1: switch (dy) {
                        //歩く
                        case 0: return {
                            small: resources.player_small_walk_right_texture,
                            normal: resources.player_walk_right_texture,
                        }; break;
                        //よじ登る
                        case 1: return {
                            small: resources.player_small_climb_right_texture,
                            normal: resources.player_climb_right_texture,
                        }; break;
                    } break;
                } break;
                //梯子につかまる
                case "ladder": switch (dx) {
                    case -1: switch (dy) {
                        //左の梯子に掴まる 
                        case 0: return {
                            small: resources.player_small_walk_left_texture,
                            normal: resources.player_walk_left_texture,
                        }; break;
                    }; break;
                    case 1: switch (dy) {
                        //右の梯子につかまる
                        case 0: return {
                            small: resources.player_small_walk_right_texture,
                            normal: resources.player_walk_right_texture,
                        }; break;
                    } break;
                    //上の梯子につかまる
                    case 0: switch (dy) {
                        case 1: return {
                            small: resources.player_small_climb_up_texture,
                            normal: resources.player_climb_up_texture,
                        }; break;
                    }
                } break;
            } break;
            case "ladder": switch (newState) {
                //梯子から穏便に落ちる
                case "stand": switch (dx) {
                    //左に
                    case -1: switch (dy) {
                        //左の足場に下りる
                        case 0: return {
                            small: resources.player_small_walk_left_texture,
                            normal: resources.player_walk_left_texture,
                        }; break;
                        //梯子から左上によじ登る
                        case 1: return {
                            small: resources.player_small_climb_left_texture,
                            normal: resources.player_climb_left_texture,
                        }; break;
                    } break;
                    //右に
                    case 1: switch (dy) {
                        //右の足場に下りる
                        case 0: return {
                            small: resources.player_small_walk_right_texture,
                            normal: resources.player_walk_right_texture,
                        }; break;
                        //梯子から右上によじ登る
                        case 1: return {
                            small: resources.player_small_climb_right_texture,
                            normal: resources.player_climb_right_texture,
                        }; break;
                    } break;
                    //上下に
                    case 0: switch (dy) {
                        //下の足場に下りる
                        case -1: return {
                            small: resources.player_small_climb_down_texture,
                            normal: resources.player_climb_down_texture,
                        }; break;
                    } break;
                } break;
                //梯子上で移動
                case "ladder": switch (dx) {
                    //左
                    case -1: switch (dy) {
                        //左の梯子に掴まる
                        case 0: return {
                            small: resources.player_small_walk_left_texture,
                            normal: resources.player_walk_left_texture,
                        }; break;
                    } break;
                    //上下
                    case 0: switch (dy) {
                        //上の梯子につかまる
                        case 1: return {
                            small: resources.player_small_climb_up_texture,
                            normal: resources.player_climb_up_texture,
                        }; break;
                        //下の梯子につかまる
                        case -1: return {
                            small: resources.player_small_climb_down_texture,
                            normal: resources.player_climb_down_texture,
                        }; break;
                    } break;
                    //右
                    case 1: switch (dy) {
                        //右の梯子につかまる
                        case 0: return {
                            small: resources.player_small_walk_right_texture,
                            normal: resources.player_walk_right_texture,
                        }; break;
                    } break;
                } break;
            } break;
        }
        throw new Error("unecpected texture requested");
    }

    //与えられたMoveResult | nullに従ってプレイヤーを動かす
    export function move(player: Player, field: Field, direction: InputDirection): [Player, Field] {
        const result = check(player.coord, field.terrain, 0 < player.smallCount, direction);

        if (result === null) return [player, field];

        const transitionTexture = selectTexture(
            getTransitionTexture(player.state, result.state, result.coord.x - player.coord.x, result.coord.y - player.coord.y, player.facingDirection),
            player.smallCount);

        const stateTexture = selectTexture(
            getStateTexture(result.state, direction === "input_left" ? "facing_left" : "facing_right"),
            Math.max(0, player.smallCount - 1));

        return [{
            ...player,
            texture: joinAnimation([transitionTexture, stateTexture], false),
            animationTimestamp: tick,
            coord: result.coord,
            state: result.state,
            //左に移動したときのみ左を向く。無標（上下移動）では右
            facingDirection: result.coord.x < player.coord.x ? "facing_left" : "facing_right",

            smallCount: Math.max(0, player.smallCount - 1),
        }, turn(field, player)];
    }
}