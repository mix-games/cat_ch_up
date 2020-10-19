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
            coord: Coord.create(0, 0),
            facingDirection: "facing_right",
            smallCount: 0,
            animationTimestamp: 0,
            texture: resources.player_stand_right_texture,
            acceptInput: true,
        };
    }

    // その場所でプレイヤーがどのようにあるべきか
    export function checkState(coord: Coord, terrain: Field.Terrain, isSmall: boolean): "stand" | "ladder" | "drop" | null {
        if (isSmall) {
            const ground = Field.getCollision(terrain, Coord.down(coord));
            const body = Field.getCollision(terrain, coord);

            if (body === Field.Collision.Solid) return null;
            if (ground === Field.Collision.Solid) return "stand";
            if (body === Field.Collision.Ladder) return "ladder";

            return "drop";
        }
        else {
            const ground = Field.getCollision(terrain, Coord.down(coord));
            const foot = Field.getCollision(terrain, coord);
            const head = Field.getCollision(terrain, Coord.up(coord));

            if (head === Field.Collision.Solid || foot === Field.Collision.Solid) return null;
            if (ground === Field.Collision.Solid) return "stand";
            if (foot === Field.Collision.Ladder || head === Field.Collision.Ladder) return "ladder";

            return "drop";
        }
    }

    //そこにプレイヤーが入るスペースがあるか判定。空中でもtrue
    export function canEnter(coord: Coord, terrain: Field.Terrain, isSmall: boolean): boolean {
        return checkState(coord, terrain, isSmall) !== null;
    }
    //その場に立てるか判定。上半身か下半身がはしごならtrue、足の下が空中だとfalse。スペースが無くてもfalse
    export function canStay(coord: Coord, terrain: Field.Terrain, isSmall: boolean): boolean {
        const state = checkState(coord, terrain, isSmall);
        return state !== null && state !== "drop";
    }

    //type MoveDirection = "move_left" | "move_right" | "move_up" | "move_down" | "move_left_up" | "move_right_up";
    type MoveResult = {
        readonly coord: Coord;
        readonly state: "stand" | "ladder";
        readonly transition: TextureVariants;
    };

    //checkState(coord)が"drop"かnullであることを確認してから呼ぶ
    export function drop(coord: Coord, terrain: Field.Terrain, isSmall: boolean, jumpoffState: "stand" | "ladder", direction: "left" | "right" | "down", distance: number = 1): MoveResult {
        const state = checkState(Coord.down(coord), terrain, isSmall);
        if (state === "drop" || state === null)
            return (drop(Coord.down(coord), terrain, isSmall, jumpoffState, direction, distance + 1));

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
            coord: Coord.down(coord),
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

    export function checkLeft(coord: Coord, terrain: Field.Terrain, isSmall: boolean): MoveResult | null {
        const currentState = checkState(coord, terrain, isSmall);
        if (currentState == "drop" || currentState == null) return null;

        const leftState = checkState(Coord.left(coord), terrain, isSmall);
        switch (leftState) {
            //左に立てるなら
            case "stand": switch (currentState) {
                //いま立っているなら歩き
                case "stand": return {
                    coord: Coord.left(coord),
                    state: leftState,
                    transition: {
                        small: resources.player_small_walk_left_texture,
                        normal: resources.player_walk_left_texture,
                    },
                };
                //いま梯子なら降りる
                case "ladder": return {
                    coord: Coord.left(coord),
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
                    coord: Coord.left(coord),
                    state: leftState,
                    transition: {
                        small: resources.player_small_walk_left_texture,
                        normal: resources.player_walk_left_texture,
                    },
                };
                // いま梯子なら梯子上移動
                case "ladder": return {
                    coord: Coord.left(coord),
                    state: leftState,
                    transition: {
                        small: resources.player_small_walk_left_texture,
                        normal: resources.player_walk_left_texture,
                    },
                };
            } break;
            //左が空いてるなら飛び降りる
            case "drop": {
                return drop(Coord.left(coord), terrain, isSmall, currentState, "left");
            } break;
        }
        return null;
    }

    //左がふさがっていたらよじ登りを試す
    export function checkLeftUp(coord: Coord, terrain: Field.Terrain, isSmall: boolean): MoveResult | null {
        if (canStay(coord, terrain, isSmall)
            && checkState(Coord.left(coord), terrain, isSmall) === null
            && checkState(Coord.up(coord), terrain, isSmall) !== null
            && checkState(Coord.leftUp(coord), terrain, isSmall) === "stand")
            return {
                coord: Coord.leftUp(coord),
                state: "stand",
                transition: {
                    small: resources.player_small_climb_left_texture,
                    normal: resources.player_climb_left_texture,
                },
            };

        return null;
    }

    export function checkRight(coord: Coord, terrain: Field.Terrain, isSmall: boolean): MoveResult | null {
        const currentState = checkState(coord, terrain, isSmall);
        if (currentState == "drop" || currentState == null) return null;
        const rightState = checkState(Coord.right(coord), terrain, isSmall);
        switch (rightState) {
            //右に立てるなら
            case "stand": switch (currentState) {
                //いま立っているなら歩き
                case "stand": return {
                    coord: Coord.right(coord),
                    state: rightState,
                    transition: {
                        small: resources.player_small_walk_right_texture,
                        normal: resources.player_walk_right_texture,
                    },
                };
                //いま梯子なら降りる
                case "ladder": return {
                    coord: Coord.right(coord),
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
                    coord: Coord.right(coord),
                    state: rightState,
                    transition: {
                        small: resources.player_small_walk_right_texture,
                        normal: resources.player_walk_right_texture,
                    },
                };
                // いま梯子なら梯子上移動
                case "ladder": return {
                    coord: Coord.right(coord),
                    state: rightState,
                    transition: {
                        small: resources.player_small_walk_right_texture,
                        normal: resources.player_walk_right_texture,
                    },
                };
            } break;
            //右が空いてるなら飛び降りる
            case "drop": {
                return drop(Coord.right(coord), terrain, isSmall, currentState, "right");
            } break;
        }
        return null;
    }

    export function checkRightUp(coord: Coord, terrain: Field.Terrain, isSmall: boolean): MoveResult | null {
        if (canStay(coord, terrain, isSmall)
            && checkState(Coord.right(coord), terrain, isSmall) === null
            && checkState(Coord.up(coord), terrain, isSmall) !== null
            && checkState(Coord.rightUp(coord), terrain, isSmall) === "stand")
            return {
                coord: Coord.rightUp(coord),
                state: "stand",
                transition: {
                    small: resources.player_small_climb_right_texture,
                    normal: resources.player_climb_right_texture,
                },
            };

        return null;
    }

    export function checkUp(coord: Coord, terrain: Field.Terrain, isSmall: boolean): MoveResult | null {
        //真上移動は梯子に登るときのみ？
        const currentState = checkState(coord, terrain, isSmall);
        const upState = checkState(Coord.up(coord), terrain, isSmall);

        if (currentState == "drop" || currentState == null) return null;
        switch (upState) {
            case "ladder": switch (currentState) {
                //小さい時は頭の上の梯子にも掴まれる（そうしないと不便なので）
                //いま立ちなら、上半身（の後ろ）に梯子があるなら登る
                case "stand": if (isSmall || Field.getCollision(terrain, Coord.up(coord)) === Field.Collision.Ladder) {
                    return {
                        coord: Coord.up(coord),
                        state: "ladder",
                        transition: {
                            small: resources.player_small_climb_up_texture,
                            normal: resources.player_climb_up_texture,
                        },
                    };
                } break;
                //いま梯子なら登る
                case "ladder": return {
                    coord: Coord.up(coord),
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

    export function checkDown(coord: Coord, terrain: Field.Terrain, isSmall: boolean): MoveResult | null {
        //下移動は梯子につかまってる時のみ
        const currentState = checkState(coord, terrain, isSmall);
        if (currentState == "drop" || currentState == null) return null;

        if (currentState !== "ladder") return null;
        const downState = checkState(Coord.down(coord), terrain, isSmall);
        switch (downState) {
            //下に立てるなら降りる
            case "stand": {
                return {
                    coord: Coord.down(coord),
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
                    coord: Coord.down(coord),
                    state: "stand",
                    transition: {
                        small: resources.player_small_climb_down_texture,
                        normal: resources.player_climb_down_texture,
                    },
                };
            } break;
            //下が空いているなら飛び降りる
            case "drop": {
                return drop(Coord.down(coord), terrain, isSmall, currentState, "down");
            } break;
        }
        return null;
    }

    export function inputLeft(coord: Coord, terrain: Field.Terrain, isSmall: boolean): MoveResult | null {
        const leftResult = checkLeft(coord, terrain, isSmall);
        if (leftResult !== null) return leftResult;
        const leftUpResult = checkLeftUp(coord, terrain, isSmall);
        if (leftUpResult !== null) return leftUpResult;
        return null;
    }

    export function inputRight(coord: Coord, terrain: Field.Terrain, isSmall: boolean): MoveResult | null {
        const rightResult = checkRight(coord, terrain, isSmall);
        if (rightResult !== null) return rightResult;
        const rightUpResult = checkRightUp(coord, terrain, isSmall);
        if (rightUpResult !== null) return rightUpResult;
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
        console.log(smallCount);
        const currentState = checkState(player.coord, field.terrain, 0 < smallCount);

        //埋まってなければテクスチャを更新するだけ
        if (currentState === "stand" || currentState === "ladder") {
            const textureSet = getStateTexture(player.state, player.facingDirection);

            return {
                coord: player.coord,
                state: currentState,
                smallCount: smallCount,
                texture: selectTexture(textureSet, smallCount),
                facingDirection: player.facingDirection,
                animationTimestamp: tick,
                acceptInput: true,
            };
        }
        else {
            //埋まっていたら落とさなきゃいけない
            const dropResult = drop(player.coord, field.terrain, 0 < smallCount, "stand", "down");

            return {
                coord: dropResult.coord,
                state: dropResult.state,
                smallCount: smallCount,
                texture: selectTexture(dropResult.transition, smallCount),
                facingDirection: player.facingDirection,
                animationTimestamp: tick,
                acceptInput: false,
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
            input_left: inputLeft,
            input_right: inputRight,
            input_up: checkUp,
            input_down: checkDown,
        }[direction](player.coord, field.terrain, 0 < player.smallCount);

        if (result === null) return [player, field];

        const transitionTexture = selectTexture(
            result.transition,
            player.smallCount);

        return [{
            coord: result.coord,
            state: result.state,
            smallCount: player.smallCount,
            texture: transitionTexture,
            facingDirection: direction === "input_left" ? "facing_left" : "facing_right",
            animationTimestamp: tick,
            acceptInput: false,
        }, Field.turn(field, player)];
    }
}