/// <reference path="./renderer.ts" />
/// <reference path="./texture.ts" />

function loadResources() {
    const progress = {
        registeredCount: 0,
        finishedCount: 0,
        errorCount: 0,
        isFinished: function (): boolean {
            return this.registeredCount === this.finishedCount + this.errorCount;
        },
        rate: function (): number {
            return (this.finishedCount + this.errorCount) / this.registeredCount;
        }
    };

    return {
        _progress: progress,
        testAnimation: loadAnimationTexture("test.png", 32, 32, 0, 0, false, [30, 60, 90, 120, 150, 180, 210, 240], true, 1, 0),
        background_texture: loadStaticTexture("image/background.png", 400, 400, 200, 200, false, 0, 0),
        terrain_wall_texture: loadStaticTexture("image/terrain/wall.png", 24, 24, 10, 0, true, 0, 0),
        terrain_ladder_texture: loadStaticTexture("image/terrain/ladder.png", 24, 24, 11, 0, true, 2, 0),
        terrain_condenser_texture: loadAnimationTexture("image/terrain/condenser.png", 36, 24, 13, 0, true, [30, 60, 90], true, 6, 0),

        player_stand_right_texture: loadStaticTexture("image/player/stand_right.png", 24, 48, 12, 24, true, 1, 3),
        player_stand_left_texture: loadStaticTexture("image/player/stand_left.png", 24, 48, 12, 24, true, 1, 3),
        player_hold_texture: loadStaticTexture("image/player/hold.png", 24, 48, 12, 24, true, 1, 3),
        player_walk_right_texture: loadAnimationTexture("image/player/walk_right.png", 48, 48, 36, 24, true, [30, 60, 90, 120], false, 1, 3),
        player_walk_left_texture: loadAnimationTexture("image/player/walk_left.png", 48, 48, 12, 24, true, [30, 60, 90, 120], false, 1, 3),
        player_climb_right_texture: loadAnimationTexture("image/player/climb_right.png", 48, 72, 36, 24, true, [30, 60, 90, 120], false, 1, 3),
        player_climb_left_texture: loadAnimationTexture("image/player/climb_left.png", 48, 72, 12, 24, true, [30, 60, 90, 120], false, 1, 3),
        player_climb_up_texture: loadAnimationTexture("image/player/climb_up.png", 24, 72, 12, 24, true, [30, 60, 90, 120], false, 1, 3),
        player_climb_down_texture: loadAnimationTexture("image/player/climb_down.png", 24, 72, 12, 48, true, [30, 60, 90, 120], false, 1, 3),

        player_drop_left_texture: loadAnimationTexture("image/player/climb_down.png", 24, 72, 12, 48, true, [30, 60, 90, 120], false, 1, 3),
        player_drop_right_texture: loadAnimationTexture("image/player/climb_down.png", 24, 72, 12, 48, true, [30, 60, 90, 120], false, 1, 3),

        player_small_stand_right_texture: loadStaticTexture("image/player_small/stand_right.png", 24, 24, 12, 0, true, 1, 3),
        player_small_stand_left_texture: loadStaticTexture("image/player_small/stand_left.png", 24, 24, 12, 0, true, 1, 3),
        player_small_hold_texture: loadStaticTexture("image/player_small/hold.png", 24, 24, 12, 0, true, 1, 3),
        player_small_walk_right_texture: loadAnimationTexture("image/player_small/walk_right.png", 48, 24, 36, 0, true, [30, 60, 90, 120], false, 1, 3),
        player_small_walk_left_texture: loadAnimationTexture("image/player_small/walk_left.png", 48, 24, 12, 0, true, [30, 60, 90, 120], false, 1, 3),
        player_small_climb_right_texture: loadAnimationTexture("image/player_small/climb_right.png", 48, 48, 36, 0, true, [30, 60, 90, 120], false, 1, 3),
        player_small_climb_left_texture: loadAnimationTexture("image/player_small/climb_left.png", 48, 48, 12, 0, true, [30, 60, 90, 120], false, 1, 3),
        player_small_climb_up_texture: loadAnimationTexture("image/player_small/climb_up.png", 24, 48, 12, 0, true, [30, 60, 90, 120], false, 1, 3),
        player_small_climb_down_texture: loadAnimationTexture("image/player_small/climb_down.png", 24, 48, 12, 24, true, [30, 60, 90, 120], false, 1, 3),

        player_small_drop_left_texture: loadAnimationTexture("image/player_small/climb_down.png", 24, 48, 12, 24, true, [30, 60, 90, 120], false, 1, 3),
        player_small_drop_right_texture: loadAnimationTexture("image/player_small/climb_down.png", 24, 48, 12, 24, true, [30, 60, 90, 120], false, 1, 3),
    } as const;

    function loadImage(source: string, onload: () => void = () => { }): HTMLImageElement {
        const image = new Image();
        progress.registeredCount++;
        image.addEventListener('load', () => {
            progress.finishedCount++;
            onload();
        }, false);
        image.addEventListener("error", () => {
            progress.errorCount++;
        });
        image.src = source;
        return image;
    }
    function loadAudio(source: string, onload: () => void = () => { }): HTMLAudioElement {
        const audio = new Audio();
        audio.addEventListener('canplaythrough', () => {
            progress.finishedCount++;
            onload();
        }, false);
        audio.addEventListener("error", () => {
            progress.errorCount++;
        });
        audio.src = source;
        return audio;
    }


    function loadStaticTexture(source: string, width: number, height: number, offsetX: number, offsetY: number, useShadowColor: boolean, depth: number, depthOffset: number): VolumeTexture {
        const texture = createVolumeTexture(width, height, offsetX, offsetY, depth, depthOffset);
        const image = loadImage(source, () => readyVolumeTexture(texture, image, useShadowColor));
        return texture;
    }

    function loadAnimationTexture(source: string, width: number, height: number, offsetX: number, offsetY: number, useShadowColor: boolean, timeline: number[], loop: boolean, depth: number, depthOffset: number): AnimationTexture {
        const textures = timeline.map(() => createVolumeTexture(width, height, offsetX, offsetY, depth, depthOffset));
        const texture = createAnimationTexture(textures, timeline, new Date().getTime(), loop);

        const image = loadImage(source, () => {
            textures.forEach((texture, i) => {
                const source = document.createElement("canvas");
                source.width = width;
                source.height = image.height;
                const context = source.getContext("2d");
                if (context === null) throw new Error("failed to get context-2d");
                context.drawImage(image, width * i, 0, width, image.height, 0, 0, width, image.height);
                readyVolumeTexture(texture, source, useShadowColor);
            });
        });

        return texture;
    }
}

type Resources = ReturnType<typeof loadResources>;
