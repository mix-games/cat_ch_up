type Texture = EmptyTexture | RectTexture | VolumeTexture | AnimationTexture | OffsetTexture | FlashTexture;

interface EmptyTexture {
    readonly type: "empty";
}
interface RectTexture {
    readonly type: "rect";
    readonly color: string;
    readonly width: number;
    readonly height: number;
}
interface VolumeTexture {
    readonly type: "volume";

    readonly lightLayers: HTMLCanvasElement[];
    readonly shadowLayers: HTMLCanvasElement[];
    readonly width: number;
    readonly height: number;

    readonly depth: number;
    readonly depthOffset: number;
}
interface AnimationTexture {
    readonly type: "animation";

    readonly textures: Texture[];
    readonly timeline: number[];
    readonly loop: boolean;
}
interface OffsetTexture {
    readonly type: "offset";
    readonly offsetX: number;
    readonly offsetY: number;
    readonly texture: Texture;
}
interface FlashTexture {
    readonly type: "flash";
    readonly texture1: Texture;
    readonly texture2: Texture;
}

function createEmptyTexture(): EmptyTexture {
    return {
        type: "empty"
    };
}

function createRectTexture(color: string, width: number, height: number): RectTexture {
    return {
        type: "rect",
        color,
        width,
        height,
    };
}

function createVolumeTexture(width: number, height: number, depth: number, depthOffset: number): VolumeTexture {
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
        lightLayers,
        shadowLayers,
        width,
        height,
        depth,
        depthOffset,
    };
}

function createAnimationTexture(textures: Texture[], timeline: number[], loop: boolean): AnimationTexture {
    return {
        type: "animation",
        textures,
        timeline,
        loop,
    };
}
function createOffsetTexture(texture: Texture, offsetX: number, offsetY: number): OffsetTexture{
    return {
        type: "offset",
        texture,
        offsetX,
        offsetY,
    }
}

function createFlashTexture(texture1: Texture, texture2: Texture): FlashTexture {
    return {
        type: "flash",
        texture1, 
        texture2,
    }
}

function readyVolumeTexture(texture: VolumeTexture, image: HTMLCanvasElement | HTMLImageElement, useShadowColor: boolean) {
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

function getAnimationLength(texture: Texture): number{
    switch (texture.type) {
        case "empty": return Infinity;
        case "rect": return Infinity;
        case "volume": return Infinity;
        case "animation": return texture.loop ? Infinity : texture.timeline[texture.timeline.length - 1];
        case "offset": return getAnimationLength(texture.texture);
        case "flash": return Math.max(getAnimationLength(texture.texture1), getAnimationLength(texture.texture1));
        //網羅チェック
        default: return texture;
    }
}

function joinAnimation(textures: Texture[], loop: boolean): AnimationTexture {
    const timeline = textures
    .map(t=>getAnimationLength(t))
    .reduce((acc, cur)=>[...acc, cur + acc[acc.length-1]], [0]).slice(1);
    return createAnimationTexture(textures, timeline, loop);
}

function drawTexture(texture: Texture, x: number, y: number, elapse:number, renderer: Renderer): void {
    switch (texture.type) {
        case "empty": {
        } break;
        case "rect": {
            renderer.lightColor.fillStyle = texture.color;
            renderer.lightColor.fillRect(
                Renderer.marginLeft + x,
                Renderer.marginTop + y,
                texture.width, texture.height);
            renderer.shadowColor.fillStyle = texture.color;
            renderer.shadowColor.fillRect(
                Renderer.marginLeft + x,
                Renderer.marginTop + y,
                texture.width, texture.height);
        } break;
        case "volume": {
            for (let i = 0; i < texture.depth; i++) {
                renderer.lightLayers[i + texture.depthOffset].drawImage(
                    texture.lightLayers[i],
                    Renderer.marginLeft + x,
                    Renderer.marginTop + y);

                renderer.shadowLayers[i + texture.depthOffset].drawImage(
                    texture.shadowLayers[i],
                    Renderer.marginLeft + x,
                    Renderer.marginTop + y);
            }
        } break;
        case "animation": {
            const phase = texture.loop ? elapse % texture.timeline[texture.timeline.length - 1] : elapse;

            let frame = texture.timeline.findIndex(t => phase < t);
            if (frame === -1) {
                //texture.animationEndCallback();
                frame = Math.max(0, texture.timeline.length - 1);
            }
            drawTexture(texture.textures[frame], x, y, frame === 0 ? elapse : elapse - texture.timeline[frame - 1], renderer);
        } break;
        case "offset": {
            drawTexture(texture.texture, x - texture.offsetX, y - texture.offsetY, elapse, renderer);
        } break;
        case "flash": {
            drawTexture(elapse % 2 === 0 ? texture.texture1 : texture.texture2, x, y, elapse, renderer);
        } break;
        default: const never: never = texture;
    }
}

const resources: Resources = loadResources();