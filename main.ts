let field: Field = Field.createField();
let player: Player = Player.create();
let camera: Camera = Camera.create();
let renderer; //デバッグ用に外に出した
let tick = 0;

function animationLoop(renderer: Renderer, mainScreen: CanvasRenderingContext2D, resources: Resources): void {
    if (resources._progress.isFinished()) {
        camera = Camera.update(camera, player, field, renderer);

        Field.drawField(field, camera, renderer);
        drawGameObject(player, camera, renderer);
        
        if(getAnimationLength(player.texture) < tick - player.animationTimestamp) player = Player.transitionEnd(player, field);

        drawTexture(resources.player_walk_left_texture, 0, 0, 0, renderer);
        
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

    renderer = Renderer.create(mainScreen.canvas.width / 2, mainScreen.canvas.height / 2);

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

        if (event.code === "KeyA") player = { ...player, coord: Coord.left(player.coord) };
        if (event.code === "KeyD") player = { ...player, coord: Coord.right(player.coord) };
        if (event.code === "KeyW") player = { ...player, coord: Coord.up(player.coord) };
        if (event.code === "KeyS") player = { ...player, coord: Coord.down(player.coord) };

        switch (event.code) {
            case "KeyZ": {
                player = Player.shrink(player, field);
            } break;
            case "ArrowLeft": {
                [player, field] = Player.move(player, field, "input_left");
            } break;
            case "ArrowRight": {
                [player, field] = Player.move(player, field, "input_right");
            } break;
            case "ArrowUp": {
                [player, field] = Player.move(player, field, "input_up");
            } break;
            case "ArrowDown": {
                [player, field] = Player.move(player, field, "input_down");
            } break;
        }
        console.log(player.coord);
    }, false);

    animationLoop(renderer, mainScreen, resources);
};
