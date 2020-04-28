

function animationLoop(field: Field, player: Player, camera: Camera, renderer: Renderer, mainScreen: CanvasRenderingContext2D, resources: Resources): void {
    if (resources._progress.isFinished()) {
        updateCamera(camera, player, field, renderer);

        drawField(field, camera, renderer);
        drawGameObject(player, camera, renderer);

        drawTexture(resources.player_walk_left_texture, 0, 0, renderer);

        composit(renderer, mainScreen);
    }
    else {
        console.log("loading " + (resources._progress.rate() * 100) + "%");
        mainScreen.fillText("loading", 0, 50);
    }

    requestAnimationFrame(() => animationLoop(field, player, camera, renderer, mainScreen, resources));
}

window.onload = () => {
    const canvas = document.getElementById("canvas");
    if (canvas === null || !(canvas instanceof HTMLCanvasElement))
        throw new Error("canvas not found");

    const mainScreen = canvas.getContext("2d");
    if (mainScreen === null)
        throw new Error("context2d not found");
    
    const field: Field = createField();
    const player: Player = createPlayer();
    const camera: Camera = createCamera();
    const renderer = createRenderer(mainScreen.canvas.width / 2, mainScreen.canvas.height / 2);

    const loadingProgress = loadResources();

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

        if (event.code === "KeyA") player.coord = leftCoord(player.coord);
        if (event.code === "KeyD") player.coord = rightCoord(player.coord);
        if (event.code === "KeyW") player.coord = upCoord(player.coord);
        if (event.code === "KeyS") player.coord = downCoord(player.coord);

        if (event.code === "ArrowLeft") movePlayer(player, field, "left");
        if (event.code === "ArrowRight") movePlayer(player, field, "right");
        if (event.code === "ArrowUp") movePlayer(player, field, "up");
        if (event.code === "ArrowDown") movePlayer(player, field, "down");

        console.log(player.coord);
    }, false);

    animationLoop(field, player, camera, renderer, mainScreen, loadingProgress);
};
