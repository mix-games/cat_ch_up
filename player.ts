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
    type MoveResult = {
        coord: Coord;
        state: "stand" | "ladder";
        transition: TextureVariants;
    };

    export function drop(coord: Coord, terrain: Terrain, isSmall: boolean): { coord:Coord, state: "stand" | "ladder" } {
        const state = checkState(downCoord(coord), terrain, isSmall);
        if (state === "stand" || state === "ladder") return { coord:downCoord(coord), state };
        return (drop(downCoord(coord), terrain, isSmall));
    }

    function generateDropAnimation(jumpOffTexture: Texture, fallingTexture: Texture, landingTexture: Texture, distance: number) {
        const Textures: Texture[] = [];
        Textures.push(createOffsetTexture(jumpOffTexture, 0, distance * blockSize));
        for (let i = 0; i < distance - 1; i++) {
            Textures.push(createOffsetTexture(fallingTexture, 0, (distance - i - 1) * blockSize));
        }
        Textures.push(landingTexture);

        return joinAnimation(Textures, false)
    }

    export function check(coord: Coord, terrain: Terrain, isSmall: boolean, direction: InputDirection): MoveResult | null {
        const currentState = checkState(coord, terrain, isSmall);

        //埋まってる場合
        if (currentState === null || currentState === "drop") {
            const dropResult = drop(coord, terrain, isSmall);

            const landing = {
                "stand": {
                    normal: resources.player_walk_left_texture,
                    small: resources.player_small_walk_left_texture,
                },
                "ladder": {
                    normal: resources.player_walk_left_texture,
                    small: resources.player_small_walk_left_texture,
                },
            }[dropResult.state];

            return {
                coord: dropResult.coord,
                state: dropResult.state,
                transition: {
                    normal: generateDropAnimation(
                        createEmptyTexture(),
                        resources.player_drop_left_texture,
                        landing.normal,
                        coord.y - dropResult.coord.y),
                    small: generateDropAnimation(
                        createEmptyTexture(),
                        resources.player_small_drop_left_texture,
                        landing.normal,
                        coord.y - dropResult.coord.y),
                },
            }
        }
        switch (direction) {
            case "input_left": {
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
                        const dropResult = drop(leftCoord(coord), terrain, isSmall);
                        
                        const jumpOff = {
                            "stand": {
                                normal: resources.player_walk_left_texture,
                                small: resources.player_small_walk_left_texture,
                            },
                            "ladder": {
                                normal: resources.player_walk_left_texture,
                                small: resources.player_small_walk_left_texture,
                            },
                        }[currentState];
                        const landing = {
                            "stand": {
                                normal: resources.player_climb_down_texture,
                                small: resources.player_small_climb_down_texture,
                            },
                            "ladder": {
                                normal: resources.player_climb_down_texture,
                                small: resources.player_small_climb_down_texture,
                            },
                        }[dropResult.state];

                        return {
                            coord: dropResult.coord,
                            state: dropResult.state,
                            transition: {
                                normal: generateDropAnimation(
                                    jumpOff.normal,
                                    resources.player_drop_left_texture,
                                    landing.normal,
                                    coord.y - dropResult.coord.y),
                                small: generateDropAnimation(
                                    jumpOff.small,
                                    resources.player_small_drop_left_texture,
                                    landing.normal,
                                    coord.y - dropResult.coord.y),
                            },
                        };
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
            } break;
            case "input_right": {
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
                        const dropResult = drop(rightCoord(coord), terrain, isSmall);
                        const jumpOff = {
                            "stand": {
                                normal: resources.player_walk_right_texture,
                                small: resources.player_small_walk_right_texture,
                            },
                            "ladder": {
                                normal: resources.player_walk_right_texture,
                                small: resources.player_small_walk_right_texture,
                            },
                        }[currentState];
                        const landing = {
                            "stand": {
                                normal: resources.player_climb_down_texture,
                                small: resources.player_small_climb_down_texture,
                            },
                            "ladder": {
                                normal: resources.player_climb_down_texture,
                                small: resources.player_small_climb_down_texture,
                            },
                        }[dropResult.state];

                        return {
                            coord: dropResult.coord,
                            state: dropResult.state,
                            transition: {
                                normal: generateDropAnimation(
                                    jumpOff.normal,
                                    resources.player_drop_right_texture,
                                    landing.normal,
                                    coord.y - dropResult.coord.y),
                                small: generateDropAnimation(
                                    jumpOff.small,
                                    resources.player_small_drop_right_texture,
                                    landing.normal,
                                    coord.y - dropResult.coord.y),
                            },
                        };
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
            } break;
            case "input_up": {
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
            } break;
            case "input_down": {
                //下移動は梯子につかまってる時のみ
                if(currentState !== "ladder") return null;
                const downState = checkState(downCoord(coord), terrain, isSmall);
                switch(downState) {
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
                        const dropResult = drop(downCoord(coord), terrain, isSmall);
                        const jumpOff = {
                                normal: resources.player_climb_down_texture,
                                small: resources.player_small_climb_down_texture,
                            };
                        const landing = {
                            "stand": {
                                normal: resources.player_climb_down_texture,
                                small: resources.player_small_climb_down_texture,
                            },
                            "ladder": {
                                normal: resources.player_climb_down_texture,
                                small: resources.player_small_climb_down_texture,
                            },
                        }[dropResult.state];

                        return {
                            coord: dropResult.coord,
                            state: dropResult.state,
                            transition: {
                                normal: generateDropAnimation(
                                    jumpOff.normal,
                                    resources.player_drop_right_texture,
                                    landing.normal,
                                    coord.y - dropResult.coord.y),
                                small: generateDropAnimation(
                                    jumpOff.small,
                                    resources.player_small_drop_right_texture,
                                    landing.normal,
                                    coord.y - dropResult.coord.y),
                            },
                        };
                    } break;
                }
                return null;
            } break;
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
        if (smallCount === 1) {
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

    //与えられたMoveResult | nullに従ってプレイヤーを動かす
    export function move(player: Player, field: Field, direction: InputDirection): [Player, Field] {
        const result = check(player.coord, field.terrain, 0 < player.smallCount, direction);

        if (result === null) return [player, field];

        const transitionTexture = selectTexture(
            result.transition,
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