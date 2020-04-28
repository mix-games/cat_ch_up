/// <reference path="./coord.ts" />
/// <reference path="./gameobject.ts" />
/// <reference path="./field.ts" />
/// <reference path="./renderer.ts" />

interface Camera {
    readonly clearanceX: number;
    readonly clearanceY: number;

    readonly initialY: number;

    coord: Coord;

    velocityX: number;
    velocityY: number;

    centerX: number;
    centerY: number;

    offsetX: number;
    offsetY: number;
}

function createCamera(): Camera {
    const clearanceX = 4;
    const clearanceY = 2;
    const initialY = 4;
    return {
        // ヒステリシスゆとり幅
        clearanceX,
        clearanceY,

        initialY,
        
        // カメラ中心の移動目標マス
        coord: createCoord(clearanceX, clearanceY),

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

function updateCamera(camera: Camera, player: Player, field: Field, renderer: Renderer): void {
    camera.coord = createCoord(
        Math.max(player.coord.x - camera.clearanceX, 
        Math.min(player.coord.x + camera.clearanceX,
            camera.coord.x)),
        Math.max(camera.initialY,
        Math.max(player.coord.y - camera.clearanceY, 
        Math.min(player.coord.y + camera.clearanceY,
            camera.coord.y))));
    
    const targetX = camera.coord.x * blockSize;
    const targetY = -camera.coord.y * blockSize;
    const smooth = 0.9; // 1フレームあたりの減衰比(0～1の無次元値)
    const accel = 1; // 1フレームあたりの速度変化

    camera.velocityX = 
        Math.max(camera.velocityX * smooth - accel,
        Math.min(camera.velocityX * smooth + accel, // 減衰後の速度から±accellの範囲にのみ速度を更新できる
            ((targetX - camera.centerX) * (1 - smooth))));  //この速度にしておけば公比smoothの無限級数がtargetXに収束する
    camera.velocityY = 
        Math.max(camera.velocityY * smooth - accel,
        Math.min(camera.velocityY * smooth + accel,
            ((targetY - camera.centerY) * (1 - smooth))));
    
    camera.centerX += camera.velocityX;
    camera.centerY += camera.velocityY;
    
    camera.offsetX = Math.floor(renderer.width / 2 - camera.centerX);
    camera.offsetY = Math.floor(renderer.height / 2 - camera.centerY);
}