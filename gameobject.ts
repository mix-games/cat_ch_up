/// <reference path="./resources.ts" />
/// <reference path="./coord.ts" />
/// <reference path="./camera.ts" />

interface GameObject {
    readonly texture: Texture;
    readonly coord: Coord;
    readonly animationTimestamp: number;
}

function drawGameObject(gameObject: GameObject, camera: Camera, renderer: Renderer) {
    drawTexture(
        gameObject.texture,
        camera.offsetX + gameObject.coord.x * blockSize,
        camera.offsetY - gameObject.coord.y * blockSize,
        tick - gameObject.animationTimestamp,
        renderer
    );
}