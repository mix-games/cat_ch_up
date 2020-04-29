function loadResources() {
    const progress = {
        registeredCount: 0,
        finishedCount: 0,
        errorCount: 0,
        isFinished: function(): boolean {
            return this.registeredCount === this.finishedCount + this.errorCount;
        },
        rate: function(): number {
            return (this.finishedCount + this.errorCount) / this.registeredCount;
        }
    }

    return {
        _progress : progress,
        testAnimation: loadAnimationTexture("test.png", 32, 32, 0, 0, false, [30, 60, 90, 120, 150, 180, 210, 240], true, 0),
        background_texture: loadStaticTexture("image/background.png", 400, 400, 200, 200, false, 0),
        terrain_wall_texture: loadStaticTexture("image/terrain/wall.png", 24, 24, 10, 0, true, 0),
        terrain_ladder_texture: loadStaticTexture("image/terrain/ladder.png", 24, 24, 11, 0, true, 0),
        terrain_condenser_texture: loadAnimationTexture("image/terrain/condenser.png", 36, 24, 13, 0, true, [30, 60, 90], true, 0),
        player_stand_right_texture: loadStaticTexture("image/player/stand_right.png", 24, 48, 12, 24, true, 3),
        player_stand_left_texture: loadStaticTexture("image/player/stand_left.png", 24, 48, 12, 24, true, 3),
        player_hold_texture: loadStaticTexture("image/player/hold.png", 24, 48, 12, 24, true, 3),
        player_walk_right_texture: loadAnimationTexture("image/player/walk_right.png", 48, 48, 36, 24, true, [30, 60, 90, 120], false, 3),
        player_walk_left_texture: loadAnimationTexture("image/player/walk_left.png", 48, 48, 12, 24, true, [30, 60, 90, 120], false, 3),
        player_climb_right_texture: loadAnimationTexture("image/player/climb_right.png", 48, 72, 36, 24, true, [30, 60, 90, 120], false, 3),
        player_climb_left_texture: loadAnimationTexture("image/player/climb_left.png", 48, 72, 12, 24, true, [30, 60, 90, 120], false, 3),
        player_climb_up_texture: loadAnimationTexture("image/player/climb_up.png", 24, 72, 12, 24, true, [30, 60, 90, 120], false, 3),
        player_climb_down_texture: loadAnimationTexture("image/player/climb_down.png", 24, 72, 12, 48, true, [30, 60, 90, 120], false, 3),
    } as const;

    function loadImage(source: string, onload: ()=>void = () => {}): HTMLImageElement {
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
    function loadAudio(source: string, onload: ()=>void = () => {}): HTMLAudioElement {
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


    function loadStaticTexture(source: string, width: number, height: number, offsetX: number, offsetY: number, useShadowColor: boolean, depthOffset: number): ImageTexture {
        return loadAnimationTexture(source, width, height, offsetX, offsetY, useShadowColor, [], false, depthOffset);
    }

    function loadAnimationTexture(source: string, width: number, height: number, offsetX: number, offsetY: number, useShadowColor: boolean, timeline: number[], loop: boolean, depthOffset: number): ImageTexture {
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
            depth: 0,
            timeline,
            animationTimestamp: new Date().getTime(),
            loop,
            depthOffset,
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

            texture.depth = Math.floor(image.height / height - (useShadowColor ? 2 : 1))

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
            for (var i = 0; i < texture.depth; i++) {
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
            for (var i = 0; i < texture.depth; i++) {
                shadowColorScreen.drawImage(
                    image,
                    0, height,
                    image.width, height,
                    0, height * (i + 1),
                    image.width, height);    
            }
        });
        return texture;
    }
}

type Resources = ReturnType<typeof loadResources>;

interface EmptyTexture {
    type: "empty";
}
interface RectTexture {
    type: "rect";
    color: string;
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
}
interface ImageTexture {
    type: "image";

    lightColor: HTMLCanvasElement;
    shadowColor: HTMLCanvasElement;

    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
    depth: number;
    timeline: number[];
    animationTimestamp: number;
    loop: boolean;
    depthOffset: number;
}

type Texture = EmptyTexture | RectTexture | ImageTexture;

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

function cloneAndReplayTexture(texture: Texture): Texture {
    if (texture.type === "image") {
        return {
            ...texture,
            animationTimestamp: new Date().getTime()
        }
    }
    // いちおうコピーするけど意味なさそう
    else return {...texture};
}

function drawTexture(texture:Texture, x: number, y: number, renderer: Renderer): void {
    if(texture.type === "rect") {
        renderer.lightColor.fillStyle = texture.color;
        renderer.lightColor.fillRect(
            renderer.marginLeft + x - texture.offsetX,
            renderer.marginTop + y - texture.offsetY,
            texture.width, texture.height);
        renderer.shadowColor.fillStyle = texture.color;
        renderer.shadowColor.fillRect(
            renderer.marginLeft + x - texture.offsetX,
            renderer.marginTop + y - texture.offsetY,
            texture.width, texture.height);
    }
    if(texture.type === "image") {
        const elapse = new Date().getTime() - texture.animationTimestamp;
        const phase = texture.loop ? elapse % texture.timeline[texture.timeline.length - 1] : elapse;

        let frame = texture.timeline.findIndex(t => phase < t);
        if (frame === -1) frame = Math.max(0, texture.timeline.length - 1);

        renderer.lightColor.drawImage(
            texture.lightColor,
            texture.width * frame, // アニメーションによる横位置
            0,
            texture.width, texture.height,
            renderer.marginLeft + x - texture.offsetX,
            renderer.marginTop + y - texture.offsetY,
            texture.width, texture.height);

        renderer.shadowColor.drawImage(
            texture.shadowColor,
            texture.width * frame, // アニメーションによる横位置
            0,
            texture.width, texture.height,
            renderer.marginLeft + x - texture.offsetX,
            renderer.marginTop + y - texture.offsetY,
            texture.width, texture.height);
        
        for(let i = 0; i < texture.depth; i++) {
            renderer.lightLayers[i + texture.depthOffset].drawImage(
                texture.lightColor,
                texture.width * frame, // アニメーションによる横位置
                (i + 1) * texture.height,　// （色を除いて）上からi枚目の画像
                texture.width, texture.height,
                renderer.marginLeft + x - texture.offsetX,
                renderer.marginTop + y - texture.offsetY,
                texture.width, texture.height);
            
            renderer.shadowLayers[i + texture.depthOffset].drawImage(
                texture.shadowColor,
                texture.width * frame, // アニメーションによる横位置
                (i + 1) * texture.height,　// （色を除いて）上からi枚目の画像
                texture.width, texture.height,
                renderer.marginLeft + x - texture.offsetX,
                renderer.marginTop + y - texture.offsetY,
                texture.width, texture.height);
        }
    }
}

const resources: Resources = loadResources();