/// <reference path="./coord.ts" />
/// <reference path="./player.ts" />
/// <reference path="./field.ts" />
/// <reference path="./renderer.ts" />


interface Camera {
    readonly coord: Coord;

    readonly velocityX: number;
    readonly velocityY: number;

    readonly centerX: number;
    readonly centerY: number;

    readonly offsetX: number;
    readonly offsetY: number;
}

namespace Camera {
    // ヒステリシスゆとり幅
    const clearanceX = 4;
    const clearanceY = 2;

    const initialY = 4;

    const smooth = 0.9; // 1フレームあたりの減衰比(0～1の無次元値)
    const accel = 1; // 1フレームあたりの速度変化

    export function create(): Camera {
        return {
            // カメラ中心の移動目標マス
            coord: Coord.create(clearanceX, clearanceY),

            // カメラ中心のスクリーン座標(移動アニメーション折り込み)
            centerX: clearanceX * blockSize,
            centerY: -initialY * blockSize,

            // カメラの移動速度
            velocityX: 0,
            velocityY: 0,

            // 描画用オフセット（スクリーン左上座標）
            offsetX: 0,
            offsetY: 0,
        };
    }

    export function update(camera: Camera, player: Player, field: Field, renderer: Renderer): Camera {
        const coord = Coord.create(
            Math.max(player.coord.x - clearanceX,
                Math.min(player.coord.x + clearanceX,
                    camera.coord.x)),
            Math.max(initialY,
                Math.max(player.coord.y - clearanceY,
                    Math.min(player.coord.y + clearanceY,
                        camera.coord.y))));

        const targetX = coord.x * blockSize;
        const targetY = -coord.y * blockSize;

        const velocityX =
            Math.max(camera.velocityX * smooth - accel,
                Math.min(camera.velocityX * smooth + accel, // 減衰後の速度から±accellの範囲にのみ速度を更新できる
                    ((targetX - camera.centerX) * (1 - smooth))));  //この速度にしておけば公比smoothの無限級数がtargetXに収束する
        const velocityY =
            Math.max(camera.velocityY * smooth - accel,
                Math.min(camera.velocityY * smooth + accel,
                    ((targetY - camera.centerY) * (1 - smooth))));

        const centerX = camera.centerX + velocityX;
        const centerY = camera.centerY + velocityY;

        const offsetX = Math.floor(renderer.width / 2 - centerX);
        const offsetY = Math.floor(renderer.height / 2 - centerY);

        return {
            coord,
            centerX,
            centerY,
            velocityX,
            velocityY,
            offsetX,
            offsetY,
        };
    }
}