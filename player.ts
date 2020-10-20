/// <reference path="./resources.ts" />
/// <reference path="./gameobject.ts" />
/// <reference path="./field.ts" />

interface Player extends GameObject {
    readonly facingDirection: FacingDirection;
    readonly smallCount: number;
    readonly acceptInput: boolean;
}

type FacingDirection = "facing_left" | "facing_right";
type InputDirection = "input_up" | "input_left" | "input_right" | "input_down";

namespace Player {
    export function create(): Player {
        return {
            coord: Coord.create(0, 0),
            facingDirection: "facing_right",
            smallCount: 0,
            animationTimestamp: 0,
            texture: resources.player_stand_right_texture,
            acceptInput: true,
        };
    }

    // その場所でプレイヤーがどのようにあるべきか
    export function checkState(coord: Coord, terrain: Field.Terrain, smallCount: number): "stand" | "ladder" | "falling" | null {
        if (0 < smallCount) {
            const ground = Field.getCollision(terrain, Coord.down(coord));
            const body = Field.getCollision(terrain, coord);

            if (body === Field.Collision.Solid) return null;
            if (ground === Field.Collision.Solid) return "stand";
            if (body === Field.Collision.Ladder) return "ladder";

            return "falling";
        }
        else {
            const ground = Field.getCollision(terrain, Coord.down(coord));
            const foot = Field.getCollision(terrain, coord);
            const head = Field.getCollision(terrain, Coord.up(coord));

            if (head === Field.Collision.Solid || foot === Field.Collision.Solid) return null;
            if (ground === Field.Collision.Solid) return "stand";
            if (foot === Field.Collision.Ladder || head === Field.Collision.Ladder) return "ladder";

            return "falling";
        }
    }

    //そこにプレイヤーが入るスペースがあるか判定。空中でもtrue
    export function canEnter(coord: Coord, terrain: Field.Terrain, smallCount: number): boolean {
        return checkState(coord, terrain, smallCount) !== null;
    }
    //その場に立てるか判定。上半身か下半身がはしごならtrue、足の下が空中だとfalse。スペースが無くてもfalse
    export function canStay(coord: Coord, terrain: Field.Terrain, smallCount: number): boolean {
        const state = checkState(coord, terrain, smallCount);
        return state !== null && state !== "falling";
    }

    // 各種情報から移動後のプレイヤーを生成する
    function generateMovedPlayer(coord: Coord, facingDirection: FacingDirection, smallCount: number, normalTexture: Texture, smallTexture: Texture): Player {
        return {
            coord,
            smallCount,
            texture: selectTexture(smallCount, normalTexture, smallTexture),
            facingDirection,
            animationTimestamp: tick,
            acceptInput: false,
        };
    }

    //checkState(coord)が"falling"かnullであることを確認してから呼ぶ
    export function drop(coord: Coord, terrain: Field.Terrain, smallCount: number, jumpoffState: "stand" | "ladder", direction: "left" | "right" | "down", distance: number = 1): Player {
        const state = checkState(Coord.down(coord), terrain, smallCount);
        if (state === "falling" || state === null)
            return (drop(Coord.down(coord), terrain, smallCount, jumpoffState, direction, distance + 1));

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

        return generateMovedPlayer(
            Coord.down(coord), direction === "left" ? "facing_left" : "facing_right", smallCount,
            generateDropAnimation(
                jumpOff.normal,
                resources.player_drop_left_texture,
                landing.normal,
                distance),
            generateDropAnimation(
                jumpOff.small,
                resources.player_small_drop_left_texture,
                landing.normal,
                distance)
        );

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

    export function goLeft(coord: Coord, terrain: Field.Terrain, smallCount: number): Player | null {
        const currentState = checkState(coord, terrain, smallCount);
        if (currentState == "falling" || currentState == null) return null;

        const leftState = checkState(Coord.left(coord), terrain, smallCount);
        switch (leftState) {
            //左に立てるなら
            case "stand": switch (currentState) {
                //いま立っているなら歩き
                case "stand":
                    return generateMovedPlayer(Coord.left(coord), "facing_left", smallCount,
                        resources.player_walk_left_texture,
                        resources.player_small_walk_left_texture);
                //いま梯子なら降りる
                case "ladder":
                    return generateMovedPlayer(Coord.left(coord), "facing_left", smallCount,
                        resources.player_walk_left_texture,
                        resources.player_small_walk_left_texture);
            } break;
            //左に梯子があるなら
            case "ladder": switch (currentState) {
                // いま立っているなら掴まる
                case "stand":
                    return generateMovedPlayer(Coord.left(coord), "facing_left", smallCount,
                        resources.player_walk_left_texture,
                        resources.player_small_walk_left_texture);
                // いま梯子なら梯子上移動
                case "ladder":
                    return generateMovedPlayer(Coord.left(coord), "facing_left", smallCount,
                        resources.player_walk_left_texture,
                        resources.player_small_walk_left_texture);
            } break;
            //左が空いてるなら飛び降りる
            case "falling": {
                return drop(Coord.left(coord), terrain, smallCount, currentState, "left");
            } break;
        }
        return null;
    }

    //左がふさがっていたらよじ登りを試す
    export function goLeftUp(coord: Coord, terrain: Field.Terrain, smallCount: number): Player | null {
        if (canStay(coord, terrain, smallCount)
            && checkState(Coord.left(coord), terrain, smallCount) === null
            && checkState(Coord.up(coord), terrain, smallCount) !== null
            && checkState(Coord.leftUp(coord), terrain, smallCount) === "stand")
            return generateMovedPlayer(Coord.leftUp(coord), "facing_left", smallCount,
                resources.player_climb_left_texture,
                resources.player_small_climb_left_texture);

        return null;
    }

    export function goRight(coord: Coord, terrain: Field.Terrain, smallCount: number): Player | null {
        const currentState = checkState(coord, terrain, smallCount);
        if (currentState == "falling" || currentState == null) return null;
        const rightState = checkState(Coord.right(coord), terrain, smallCount);
        switch (rightState) {
            //右に立てるなら
            case "stand": switch (currentState) {
                //いま立っているなら歩き
                case "stand":
                    return generateMovedPlayer(Coord.right(coord), "facing_right", smallCount,
                        resources.player_walk_right_texture,
                        resources.player_small_walk_right_texture);
                //いま梯子なら降りる
                case "ladder":
                    return generateMovedPlayer(Coord.right(coord), "facing_right", smallCount,
                        resources.player_walk_right_texture,
                        resources.player_small_walk_right_texture);
            } break;
            //右に梯子があるなら
            case "ladder": switch (currentState) {
                // いま立っているなら掴まる
                case "stand":
                    return generateMovedPlayer(Coord.right(coord), "facing_right", smallCount,
                        resources.player_walk_right_texture,
                        resources.player_small_walk_right_texture);
                // いま梯子なら梯子上移動
                case "ladder":
                    return generateMovedPlayer(Coord.right(coord), "facing_right", smallCount,
                        resources.player_walk_right_texture,
                        resources.player_small_walk_right_texture);
            } break;
            //右が空いてるなら飛び降りる
            case "falling": {
                return drop(Coord.right(coord), terrain, smallCount, currentState, "right");
            } break;
        }
        return null;
    }

    export function goRightUp(coord: Coord, terrain: Field.Terrain, smallCount: number): Player | null {
        if (canStay(coord, terrain, smallCount)
            && checkState(Coord.right(coord), terrain, smallCount) === null
            && checkState(Coord.up(coord), terrain, smallCount) !== null
            && checkState(Coord.rightUp(coord), terrain, smallCount) === "stand")
            return generateMovedPlayer(Coord.rightUp(coord), "facing_right", smallCount,
                resources.player_climb_right_texture,
                resources.player_small_climb_right_texture);

        return null;
    }

    export function goUp(coord: Coord, terrain: Field.Terrain, smallCount: number): Player | null {
        //真上移動は梯子に登るときのみ？
        const currentState = checkState(coord, terrain, smallCount);
        const upState = checkState(Coord.up(coord), terrain, smallCount);

        if (currentState == "falling" || currentState == null) return null;
        switch (upState) {
            case "ladder": switch (currentState) {
                //小さい時は頭の上の梯子にも掴まれる（そうしないと不便なので）
                //いま立ちなら、上半身（の後ろ）に梯子があるなら登る
                case "stand": if (0 < smallCount || Field.getCollision(terrain, Coord.up(coord)) === Field.Collision.Ladder) {
                    return generateMovedPlayer(Coord.up(coord), "facing_right", smallCount,
                        resources.player_climb_up_texture,
                        resources.player_small_climb_up_texture);
                } break;
                //いま梯子なら登る
                case "ladder":
                    return generateMovedPlayer(Coord.up(coord), "facing_right", smallCount,
                        resources.player_climb_up_texture,
                        resources.player_small_climb_up_texture);
            } break;
        }
        return null;
    }

    export function goDown(coord: Coord, terrain: Field.Terrain, smallCount: number): Player | null {
        //下移動は梯子につかまってる時のみ
        const currentState = checkState(coord, terrain, smallCount);
        if (currentState == "falling" || currentState == null) return null;

        if (currentState !== "ladder") return null;
        const downState = checkState(Coord.down(coord), terrain, smallCount);
        switch (downState) {
            //下に立てるなら降りる
            case "stand": {
                return generateMovedPlayer(Coord.down(coord), "facing_right", smallCount,
                    resources.player_climb_down_texture,
                    resources.player_small_climb_down_texture);
            } break;
            // 下でも梯子なら移動
            case "ladder": {
                return generateMovedPlayer(Coord.down(coord), "facing_right", smallCount,
                    resources.player_climb_down_texture,
                    resources.player_small_climb_down_texture);
            } break;
            //下が空いているなら飛び降りる
            case "falling": {
                return drop(Coord.down(coord), terrain, smallCount, currentState, "down");
            } break;
        }
        return null;
    }

    export function inputLeft(coord: Coord, terrain: Field.Terrain, smallCount: number): Player | null {
        return goLeft(coord, terrain, smallCount) || goLeftUp(coord, terrain, smallCount);
    }

    export function inputRight(coord: Coord, terrain: Field.Terrain, smallCount: number): Player | null {
        return goRight(coord, terrain, smallCount) || goRightUp(coord, terrain, smallCount);
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
    function selectTexture(smallCount: number, normalTexture: Texture, smallTexture: Texture): Texture {
        if (smallCount === 1) {
            return createFlashTexture(smallTexture, normalTexture);
        }
        return 0 < smallCount ? smallTexture : normalTexture;
    }

    // 遷移アニメーション再生後にプレイヤーのstateを見てsmallCountとテクスチャを更新する。
    export function transitionEnd(player: Player, field: Field): Player {
        const smallCount = Math.max(0, player.smallCount - 1);
        console.log(smallCount);
        const currentState = checkState(player.coord, field.terrain, smallCount);

        //埋まってなければテクスチャを更新するだけ
        if (currentState === "stand" || currentState === "ladder") {
            const textureSet = getStateTexture(currentState, player.facingDirection);

            return {
                coord: player.coord,
                smallCount: smallCount,
                texture: selectTexture(smallCount, textureSet.normal, textureSet.small),
                facingDirection: player.facingDirection,
                animationTimestamp: tick,
                acceptInput: true,
            };
        }
        else {
            //埋まっていたら落とさなきゃいけない
            return drop(player.coord, field.terrain, smallCount, "stand", "down");
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

    //与えられたPlayer | nullに従ってプレイヤーを動かす
    export function move(player: Player, field: Field, direction: InputDirection): [Player, Field] {
        const result = {
            input_left: inputLeft,
            input_right: inputRight,
            input_up: goUp,
            input_down: goDown,
        }[direction](player.coord, field.terrain, player.smallCount);

        if (result === null) return [player, field];

        return [result, Field.turn(field, player)];
    }
}