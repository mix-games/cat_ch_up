type Texture = EmptyTexture | RectTexture | ImageTexture | VolumeTexture | AnimationTexture;

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