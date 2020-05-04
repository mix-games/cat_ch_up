/// <reference path="./resources.ts" />
/// <reference path="./gameobject.ts" />
/// <reference path="./field.ts" />

interface Player extends GameObject {
    readonly state: "stand" | "ladder";
    readonly facingDirection: FacingDirection;
    readonly smallCount: number;
    readonly acceptInput: boolean;
}

type FacingDirection = "facing_left" | "facing_right";
type InputDirection = "input_up" | "input_left" | "input_right" | "input_down";

namespace Player {
    export function create(): Player {
        return {
            state: "stand",
            coord: createCoord(0, 0),
            facingDirection: "facing_right",
            smallCount: 0,
            animationTimestamp: 0,
            texture: resources.player_stand_right_texture,
            acceptInput: true,
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
    type MoveResult = {
        readonly coord: Coord;
        readonly state: "stand" | "ladder";
        readonly transition: TextureVariants;
    };

    //checkState(coord)が"drop"かnullであることを確認してから呼ぶ
    export function drop(coord: Coord, terrain: Terrain, isSmall: boolean, jumpoffState: "stand" | "ladder", direction: "left" | "right" | "down", distance: number = 1): MoveResult {
        const state = checkState(downCoord(coord), terrain, isSmall);
        if (state === "drop" || state === null)
            return (drop(downCoord(coord), terrain, isSmall, jumpoffState, direction, distance + 1));

        const jumpOff = {
            left: {
                "stand": {
                    normal: resources.player_walk_left_texture,
                    small: resources.player_small_walk_left_texture,
                },
                "ladder": {
                    normal: resources.player_walk_left_texture,
                    small: resources.player_small_walk_left_texture,
                },
            },
            right: {
                "stand": {
                    normal: resources.player_walk_right_texture,
                    small: resources.player_small_walk_right_texture,
                },
                "ladder": {
                    normal: resources.player_walk_right_texture,
                    small: resources.player_small_walk_right_texture,
                },
            },
            down: {
                "stand": {
                    normal: resources.player_climb_down_texture,
                    small: resources.player_small_climb_down_texture,
                },
                "ladder": {
                    normal: resources.player_climb_down_texture,
                    small: resources.player_small_climb_down_texture,
                },
            }
        }[direction][jumpoffState];

        const landing = {
            "stand": {
                normal: resources.player_climb_down_texture,
                small: resources.player_small_climb_down_texture,
            },
            "ladder": {
                normal: resources.player_climb_down_texture,
                small: resources.player_small_climb_down_texture,
            },
        }[state];

        return {
            coord: downCoord(coord),
            state: state,
            transition: {
                normal: generateDropAnimation(
                    jumpOff.normal,
                    resources.player_drop_left_texture,
                    landing.normal,
                    distance),
                small: generateDropAnimation(
                    jumpOff.small,
                    resources.player_small_drop_left_texture,
                    landing.normal,
                    distance),
            },
        };

        function generateDropAnimation(jumpOffTexture: Texture, fallingTexture: Texture, landingTexture: Texture, distance: number) {
            const Textures: Texture[] = [];
            Textures.push(createOffsetTexture(jumpOffTexture, 0, distance * blockSize));
            for (let i = 0; i < distance - 1; i++) {
                Textures.push(createOffsetTexture(fallingTexture, 0, (distance - i - 1) * blockSize));
            }
            Textures.push(landingTexture);

            return joinAnimation(Textures, false);
        }
    }

    export function checkLeft(coord: Coord, currentState: "stand" | "ladder", terrain: Terrain, isSmall: boolean): MoveResult | null {
        const leftState = checkState(leftCoord(coord), terrain, isSmall);
        switch (leftState) {
            //左に立てるなら
            case "stand": switch (currentState) {
                //いま立っているなら歩き
                case "stand": return {
                    coord: leftCoord(coord),
                    state: leftState,
                    transition: {
                        small: resources.player_small_walk_left_texture,
                        normal: resources.player_walk_left_texture,
                    },
                };
                //いま梯子なら降りる
                case "ladder": return {
                    coord: leftCoord(coord),
                    state: leftState,
                    transition: {
                        small: resources.player_small_walk_left_texture,
                        normal: resources.player_walk_left_texture,
                    },
                };
            } break;
            //左に梯子があるなら
            case "ladder": switch (currentState) {
                // いま立っているなら掴まる
                case "stand": return {
                    coord: leftCoord(coord),
                    state: leftState,
                    transition: {
                        small: resources.player_small_walk_left_texture,
                        normal: resources.player_walk_left_texture,
                    },
                };
                // いま梯子なら梯子上移動
                case "ladder": return {
                    coord: leftCoord(coord),
                    state: leftState,
                    transition: {
                        small: resources.player_small_walk_left_texture,
                        normal: resources.player_walk_left_texture,
                    },
                };
            } break;
            //左が空いてるなら飛び降りる
            case "drop": {
                return drop(leftCoord(coord), terrain, isSmall, currentState, "left");
            } break;
            //左がふさがっていたらよじ登りを試す
            case null: if (currentState === "stand"
                && checkState(upCoord(coord), terrain, isSmall) !== null
                && checkState(leftCoord(upCoord(coord)), terrain, isSmall) === "stand")
                return {
                    coord: leftCoord(upCoord(coord)),
                    state: "stand",
                    transition: {
                        small: resources.player_small_climb_left_texture,
                        normal: resources.player_climb_left_texture,
                    },
                };
        }
        return null;
    }

    export function checkRight(coord: Coord, currentState: "stand" | "ladder", terrain: Terrain, isSmall: boolean): MoveResult | null {
        const rightState = checkState(rightCoord(coord), terrain, isSmall);
        switch (rightState) {
            //右に立てるなら
            case "stand": switch (currentState) {
                //いま立っているなら歩き
                case "stand": return {
                    coord: rightCoord(coord),
                    state: rightState,
                    transition: {
                        small: resources.player_small_walk_right_texture,
                        normal: resources.player_walk_right_texture,
                    },
                };
                //いま梯子なら降りる
                case "ladder": return {
                    coord: rightCoord(coord),
                    state: rightState,
                    transition: {
                        small: resources.player_small_walk_right_texture,
                        normal: resources.player_walk_right_texture,
                    },
                };
            } break;
            //右に梯子があるなら
            case "ladder": switch (currentState) {
                // いま立っているなら掴まる
                case "stand": return {
                    coord: rightCoord(coord),
                    state: rightState,
                    transition: {
                        small: resources.player_small_walk_right_texture,
                        normal: resources.player_walk_right_texture,
                    },
                };
                // いま梯子なら梯子上移動
                case "ladder": return {
                    coord: rightCoord(coord),
                    state: rightState,
                    transition: {
                        small: resources.player_small_walk_right_texture,
                        normal: resources.player_walk_right_texture,
                    },
                };
            } break;
            //右が空いてるなら飛び降りる
            case "drop": {
                return drop(rightCoord(coord), terrain, isSmall, currentState, "right");
            } break;
            //右がふさがっていたらよじ登りを試す
            case null: if (currentState === "stand"
                && checkState(upCoord(coord), terrain, isSmall) !== null
                && checkState(rightCoord(upCoord(coord)), terrain, isSmall) === "stand")
                return {
                    coord: rightCoord(upCoord(coord)),
                    state: "stand",
                    transition: {
                        small: resources.player_small_climb_right_texture,
                        normal: resources.player_climb_right_texture,
                    },
                };
        }
        return null;
    }

    export function checkUp(coord: Coord, currentState: "stand" | "ladder", terrain: Terrain, isSmall: boolean): MoveResult | null {
        //真上移動は梯子に登るときのみ？
        const upState = checkState(upCoord(coord), terrain, isSmall);
        switch (upState) {
            case "ladder": switch (currentState) {
                //いま立ちなら、上半身（の後ろ）に梯子があるなら登る
                case "stand": if (getBlock(terrain, isSmall ? coord : upCoord(coord)).collision === "ladder") {
                    return {
                        coord: upCoord(coord),
                        state: "ladder",
                        transition: {
                            small: resources.player_small_climb_up_texture,
                            normal: resources.player_climb_up_texture,
                        },
                    };
                } break;
                //いま梯子なら登る
                case "ladder": return {
                    coord: upCoord(coord),
                    state: "ladder",
                    transition: {
                        small: resources.player_small_climb_up_texture,
                        normal: resources.player_climb_up_texture,
                    },
                };
            } break;
        }
        return null;
    }

    export function checkDown(coord: Coord, currentState: "stand" | "ladder", terrain: Terrain, isSmall: boolean): MoveResult | null {
        //下移動は梯子につかまってる時のみ
        if (currentState !== "ladder") return null;
        const downState = checkState(downCoord(coord), terrain, isSmall);
        switch (downState) {
            //下に立てるなら降りる
            case "stand": {
                return {
                    coord: downCoord(coord),
                    state: "stand",
                    transition: {
                        small: resources.player_small_climb_down_texture,
                        normal: resources.player_climb_down_texture,
                    },
                };
            } break;
            // 下でも梯子なら移動
            case "ladder": {
                return {
                    coord: downCoord(coord),
                    state: "stand",
                    transition: {
                        small: resources.player_small_climb_down_texture,
                        normal: resources.player_climb_down_texture,
                    },
                };
            } break;
            //下が空いているなら飛び降りる
            case "drop": {
                return drop(downCoord(coord), terrain, isSmall, currentState, "down");
            } break;
        }
        return null;
    }

    export function shrink(player: Player, field: Field): Player {
        return transitionEnd({
            ...player,
            smallCount: 5,
        }, field);
    }

    interface TextureVariants {
        small: Texture,
        normal: Texture,
    };
    function selectTexture(textureVariants: TextureVariants, smallCount: number): Texture {
        if (smallCount === 1) {
            return createFlashTexture(textureVariants.small, textureVariants.normal);
        }
        return textureVariants[0 < smallCount ? "small" : "normal"];
    }

    // 遷移アニメーション再生後にプレイヤーのstateを見てsmallCountとテクスチャを更新する。
    export function transitionEnd(player: Player, field: Field): Player {
        const smallCount = Math.max(0, player.smallCount - 1);

        const currentState = checkState(player.coord, field.terrain, 0 < smallCount);

        //埋まってなければテクスチャを更新するだけ
        if (currentState === "stand" || currentState === "ladder") {
            const textureSet = getStateTexture(player.state, player.facingDirection);

            return {
                ...player,
                animationTimestamp: tick,
                texture: selectTexture(textureSet, smallCount),
                acceptInput: true,
                smallCount: smallCount,
            };
        }
        else {
            //埋まっていたら落とさなきゃいけない
            const dropResult = drop(player.coord, field.terrain, 0 < smallCount, "stand", "down");

            return {
                ...player,
                texture: selectTexture(dropResult.transition, smallCount),
                coord: dropResult.coord,
                state: dropResult.state,
                acceptInput: false,
                smallCount: smallCount,
            };
        }
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

    //与えられたMoveResult | nullに従ってプレイヤーを動かす
    export function move(player: Player, field: Field, direction: InputDirection): [Player, Field] {
        const result = {
            input_left: checkLeft,
            input_right: checkRight,
            input_up: checkUp,
            input_down: checkDown,
        }[direction](player.coord, player.state, field.terrain, 0 < player.smallCount);

        if (result === null) return [player, field];

        const transitionTexture = selectTexture(
            result.transition,
            player.smallCount);

        return [{
            ...player,
            texture: transitionTexture,
            animationTimestamp: tick,
            coord: result.coord,
            state: result.state,
            facingDirection: direction === "input_left" ? "facing_left" : "facing_right",
            acceptInput: false,
        }, turn(field, player)];
    }
}