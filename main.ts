let field: Field = createField();
let player: Player = Player.create();
let camera: Camera = Camera.create();

function animationLoop(renderer: Renderer, mainScreen: CanvasRenderingContext2D, resources: Resources): void {
    if (resources._progress.isFinished()) {
        camera = Camera.update(camera, player, field, renderer);

        drawField(field, camera, renderer);
        drawGameObject(player, camera, renderer);

        drawTexture(resources.player_walk_left_texture, 0, 0, renderer);

        Renderer.composit(renderer, mainScreen);
        requestAnimationFrame(() => animationLoop(renderer, mainScreen, resources));
    }
    else {
        console.log("loading " + (resources._progress.rate() * 100) + "%");
        mainScreen.fillText("loading", 0, 50);
        requestAnimationFrame(() => animationLoop(renderer, mainScreen, resources));
    }
}

window.onload = () => {
    const canvas = document.getElementById("canvas");
    if (canvas === null || !(canvas instanceof HTMLCanvasElement))
        throw new Error("canvas not found");

    const mainScreen = canvas.getContext("2d");
    if (mainScreen === null)
        throw new Error("context2d not found");

    const renderer = Renderer.create(mainScreen.canvas.width / 2, mainScreen.canvas.height / 2);

    /*
    canvas.addEventListener("click", (ev: MouseEvent) => {
        //const x = ev.clientX - canvas.offsetLeft;
        //const y = ev.clientY - canvas.offsetTop;
        player.coord.x += 1;
    }, false);
    */

    document.addEventListener("keydown", (event: KeyboardEvent) => {
        // リピート（長押し時に繰り返し発火する）は無視
        if (event.repeat) return;

        if (event.code === "KeyA") player = { ...player, coord: leftCoord(player.coord) };
        if (event.code === "KeyD") player = { ...player, coord: rightCoord(player.coord) };
        if (event.code === "KeyW") player = { ...player, coord: upCoord(player.coord) };
        if (event.code === "KeyS") player = { ...player, coord: downCoord(player.coord) };
        if (event.code === "KeyZ") Player.shrink(player);

        if (event.code === "ArrowLeft") {
            const result = Player.move(player, field, "left");
            if (result.success) {
                player = result.player;
                turn(field, player);
            }
        }
        if (event.code === "ArrowRight") {
            const result = Player.move(player, field, "right");
            if (result.success) {
                player = result.player;
                turn(field, player);
            }
        } if (event.code === "ArrowUp") {
            const result = Player.move(player, field, "up");
            if (result.success) {
                player = result.player;
                turn(field, player);
            }
        }
        if (event.code === "ArrowDown") {
            const result = Player.move(player, field, "down");
            if (result.success) {
                player = result.player;
                turn(field, player);
            }

        }

        console.log(player.coord);
    }, false);

    animationLoop(renderer, mainScreen, resources);
};
