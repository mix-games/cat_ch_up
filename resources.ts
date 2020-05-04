/// <reference path="./renderer.ts" />

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
        /*
        const lightColor = document.createElement("canvas");
        const shadowColor = document.createElement("canvas");
        const texture = {
            type: "image" as const,
            lightColor: lightColor,
            shadowColor: shadowColor,
            offsetX,
            offsetY,
            width,
            height,
            timeline,
            animationTimestamp: new Date().getTime(),
            loop,
            depth,
            depthOffset,
            animationEndCallback: () => { },
        };
        const image = loadImage(source, () => {
            const lightColorScreen = lightColor.getContext("2d");
            if (lightColorScreen === null) throw new Error("failed to get context-2d");
            const shadowColorScreen = shadowColor.getContext("2d");
            if (shadowColorScreen === null) throw new Error("failed to get context-2d");

            lightColor.width = image.width;
            lightColor.height = useShadowColor ? (image.height - height) : image.height;
            shadowColor.width = image.width;
            shadowColor.height = useShadowColor ? (image.height - height) : image.height;

            lightColorScreen.drawImage(
                image,
                0, 0,
                image.width, height,
                0, 0,
                image.width, height);
            lightColorScreen.drawImage(
                image,
                0, useShadowColor ? (height * 2) : height,
                image.width, useShadowColor ? (image.height - height * 2) : (image.height - height),
                0, height,
                image.width, useShadowColor ? (image.height - height * 2) : (image.height - height));
            lightColorScreen.globalCompositeOperation = "source-atop";
            for (var i = 0; (i + (useShadowColor ? 2 : 1)) * height < image.height; i++) {
                lightColorScreen.drawImage(
                    image,
                    0, 0,
                    image.width, height,
                    0, height * (i + 1),
                    image.width, height);
            }
            shadowColorScreen.drawImage(
                image,
                0, useShadowColor ? height : 0,
                image.width, height,
                0, 0,
                image.width, height);
            shadowColorScreen.drawImage(
                image,
                0, height * 2,
                image.width, useShadowColor ? (image.height - height * 2) : (image.height - height),
                0, height,
                image.width, useShadowColor ? (image.height - height * 2) : (image.height - height));
            shadowColorScreen.globalCompositeOperation = "source-atop";
            for (var i = 0; i < depth; i++) {
                shadowColorScreen.drawImage(
                    image,
                    0, height,
                    image.width, height,
                    0, height * (i + 1),
                    image.width, height);
            }
        });
        return texture;
        */
    }
}

type Resources = ReturnType<typeof loadResources>;

interface EmptyTexture {
    readonly type: "empty";
}
interface RectTexture {
    readonly type: "rect";
    readonly color: string;
    readonly width: number;
    readonly height: number;
    readonly offsetX: number;
    readonly offsetY: number;
}
interface ImageTexture {
    readonly type: "image";

    readonly lightColor: HTMLCanvasElement;
    readonly shadowColor: HTMLCanvasElement;

    readonly offsetX: number;
    readonly offsetY: number;
    readonly width: number;
    readonly height: number;
    readonly timeline: readonly number[];
    readonly animationTimestamp: number;
    readonly loop: boolean;
    readonly depth: number;
    readonly depthOffset: number;
    readonly animationEndCallback: () => void;
}
interface VolumeTexture {
    readonly type: "volume";

    readonly lightColor: HTMLCanvasElement;
    readonly shadowColor: HTMLCanvasElement;
    readonly lightLayers: HTMLCanvasElement[];
    readonly shadowLayers: HTMLCanvasElement[];

    readonly offsetX: number;
    readonly offsetY: number;

    readonly width: number;
    readonly height: number;

    readonly depth: number;
    readonly depthOffset: number;
}
interface AnimationTexture {
    readonly type: "animation";

    readonly textures: Texture[];
    readonly timeline: number[];
    readonly timestamp: number;
    readonly loop: boolean;
}

type Texture = EmptyTexture | RectTexture | ImageTexture | VolumeTexture | AnimationTexture;

function createEmptyTexture(): EmptyTexture {
    return {
        type: "empty"
    };
}

function createRectTexture(color: string, width: number, height: number, offsetX: number, offsetY: number): RectTexture {
    return {
        type: "rect",
        color,
        width,
        height,
        offsetX,
        offsetY,
    };
}

function createVolumeTexture(width: number, height: number, offsetX: number, offsetY: number, depth: number, depthOffset: number): VolumeTexture {
    const lightColor = document.createElement("canvas");
    const shadowColor = document.createElement("canvas");
    lightColor.width = width;
    lightColor.height = height;
    shadowColor.width = width;
    shadowColor.height = height;

    const lightLayers: HTMLCanvasElement[] = [];
    const shadowLayers: HTMLCanvasElement[] = [];
    for (var i = 0; i < depth; i++) {
        lightLayers[i] = document.createElement("canvas");
        shadowLayers[i] = document.createElement("canvas");
        lightLayers[i].width = width;
        lightLayers[i].height = height;
        shadowLayers[i].width = width;
        shadowLayers[i].height = height;
    }
    return {
        type: "volume" as const,
        lightColor,
        shadowColor,
        lightLayers,
        shadowLayers,
        width,
        height,
        offsetX,
        offsetY,
        depth,
        depthOffset,
    };
}

function createAnimationTexture(textures: Texture[], timeline: number[], timestamp: number, loop: boolean): AnimationTexture {
    return {
        type: "animation",
        textures,
        timeline,
        timestamp,
        loop,
    };
}

function cloneAndReplayTexture(texture: Texture): Texture {
    if (texture.type === "animation") {
        return {
            ...texture,
            timestamp: new Date().getTime()
        };
    }
    // いちおうコピーするけど意味なさそう
    else return { ...texture };
}

function readyVolumeTexture(texture: VolumeTexture, image: HTMLCanvasElement | HTMLImageElement, useShadowColor: boolean) {
    const lightColorScreen = texture.lightColor.getContext("2d");
    if (lightColorScreen === null) throw new Error("failed to get context-2d");
    const shadowColorScreen = texture.shadowColor.getContext("2d");
    if (shadowColorScreen === null) throw new Error("failed to get context-2d");

    lightColorScreen.drawImage(
        image,
        0, 0,
        texture.width, texture.height,
        0, 0,
        texture.width, texture.height);
    shadowColorScreen.drawImage(
        image,
        0, texture.height * (useShadowColor ? 1 : 0),
        texture.width, texture.height,
        0, 0,
        texture.width, texture.height);

    for (var i = 0; i < texture.depth; i++) {
        const currentLightScreen = texture.lightLayers[i].getContext("2d");
        if (currentLightScreen === null) throw new Error("failed to get context-2d");
        const currentShadowScreen = texture.shadowLayers[i].getContext("2d");
        if (currentShadowScreen === null) throw new Error("failed to get context-2d");

        currentLightScreen.drawImage(
            image,
            0, texture.height * (useShadowColor ? i + 2 : i + 1),
            texture.width, texture.height,
            0, 0,
            texture.width, texture.height);

        currentShadowScreen.drawImage(
            image,
            0, texture.height * (useShadowColor ? i + 2 : i + 1),
            texture.width, texture.height,
            0, 0,
            texture.width, texture.height);

        currentLightScreen.globalCompositeOperation = "source-atop";
        currentLightScreen.drawImage(
            image,
            0, 0,
            texture.width, texture.height,
            0, 0,
            texture.width, texture.height);
        currentLightScreen.globalCompositeOperation = "source-over";

        currentShadowScreen.globalCompositeOperation = "source-atop";
        currentShadowScreen.drawImage(
            image,
            0, texture.height * (useShadowColor ? 1 : 0),
            texture.width, texture.height,
            0, 0,
            texture.width, texture.height);
        currentShadowScreen.globalCompositeOperation = "source-over";
    }
}

function drawTexture(texture: Texture, x: number, y: number, renderer: Renderer): void {
    switch (texture.type) {
        case "rect": {
            renderer.lightColor.fillStyle = texture.color;
            renderer.lightColor.fillRect(
                Renderer.marginLeft + x - texture.offsetX,
                Renderer.marginTop + y - texture.offsetY,
                texture.width, texture.height);
            renderer.shadowColor.fillStyle = texture.color;
            renderer.shadowColor.fillRect(
                Renderer.marginLeft + x - texture.offsetX,
                Renderer.marginTop + y - texture.offsetY,
                texture.width, texture.height);
        } break;
        case "volume": {
            renderer.lightColor.drawImage(
                texture.lightColor,
                Renderer.marginLeft + x - texture.offsetX,
                Renderer.marginTop + y - texture.offsetY);

            renderer.shadowColor.drawImage(
                texture.shadowColor,
                Renderer.marginLeft + x - texture.offsetX,
                Renderer.marginTop + y - texture.offsetY);

            for (let i = 0; i < texture.depth; i++) {
                renderer.lightLayers[i + texture.depthOffset].drawImage(
                    texture.lightLayers[i],
                    Renderer.marginLeft + x - texture.offsetX,
                    Renderer.marginTop + y - texture.offsetY);

                renderer.shadowLayers[i + texture.depthOffset].drawImage(
                    texture.shadowLayers[i],
                    Renderer.marginLeft + x - texture.offsetX,
                    Renderer.marginTop + y - texture.offsetY);
            }
        } break;
        case "image": {
            const elapse = new Date().getTime() - texture.animationTimestamp;
            const phase = texture.loop ? elapse % texture.timeline[texture.timeline.length - 1] : elapse;

            let frame = texture.timeline.findIndex(t => phase < t);
            if (frame === -1) {
                texture.animationEndCallback();
                frame = Math.max(0, texture.timeline.length - 1);
            }

            renderer.lightColor.drawImage(
                texture.lightColor,
                texture.width * frame, // アニメーションによる横位置
                0,
                texture.width, texture.height,
                Renderer.marginLeft + x - texture.offsetX,
                Renderer.marginTop + y - texture.offsetY,
                texture.width, texture.height);

            renderer.shadowColor.drawImage(
                texture.shadowColor,
                texture.width * frame, // アニメーションによる横位置
                0,
                texture.width, texture.height,
                Renderer.marginLeft + x - texture.offsetX,
                Renderer.marginTop + y - texture.offsetY,
                texture.width, texture.height);

            for (let i = 0; i < texture.depth; i++) {
                renderer.lightLayers[i + texture.depthOffset].drawImage(
                    texture.lightColor,
                    texture.width * frame, // アニメーションによる横位置
                    (i + 1) * texture.height,　// （色を除いて）上からi枚目の画像
                    texture.width, texture.height,
                    Renderer.marginLeft + x - texture.offsetX,
                    Renderer.marginTop + y - texture.offsetY,
                    texture.width, texture.height);

                renderer.shadowLayers[i + texture.depthOffset].drawImage(
                    texture.shadowColor,
                    texture.width * frame, // アニメーションによる横位置
                    (i + 1) * texture.height,　// （色を除いて）上からi枚目の画像
                    texture.width, texture.height,
                    Renderer.marginLeft + x - texture.offsetX,
                    Renderer.marginTop + y - texture.offsetY,
                    texture.width, texture.height);
            }
        } break;
        case "animation": {
            const elapse = new Date().getTime() - texture.timestamp;
            const phase = texture.loop ? elapse % texture.timeline[texture.timeline.length - 1] : elapse;

            let frame = texture.timeline.findIndex(t => phase < t);
            if (frame === -1) {
                //texture.animationEndCallback();
                frame = Math.max(0, texture.timeline.length - 1);
            }
            drawTexture(texture.textures[frame], x, y, renderer);
        } break;
    }
}

const resources: Resources = loadResources();