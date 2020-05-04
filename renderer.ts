interface Renderer {
    readonly lightColor: CanvasRenderingContext2D;
    readonly shadowColor: CanvasRenderingContext2D;
    readonly lightLayers: readonly CanvasRenderingContext2D[];
    readonly shadowLayers: readonly CanvasRenderingContext2D[];
    readonly compositScreen: CanvasRenderingContext2D;
    
    readonly uiScreen: CanvasRenderingContext2D;

    readonly width: number,
    readonly height: number,
}

namespace Renderer {
    export const layerNum = 10;
    
    export const marginTop = 28;
    export const marginLeft = 28;
    const marginRignt = 0;
    const marginBottom = 0;
    
    const shadowDirectionX = 2;
    const shadowDirectionY = 3;

    export function create(width: number, height: number): Renderer {

        const lightColor = create2dScreen(marginLeft + width + marginRignt, marginTop + height + marginBottom);
        const shadowColor = create2dScreen(marginLeft + width + marginRignt, marginTop + height + marginBottom);
        const lightLayers: CanvasRenderingContext2D[] = [];
        for (let i = 0; i < layerNum; i++)
            lightLayers.push(create2dScreen(marginLeft + width + marginRignt, marginTop + height + marginBottom));

        const shadowLayers: CanvasRenderingContext2D[] = [];
        for (let i = 0; i < layerNum; i++)
            shadowLayers.push(create2dScreen(marginLeft + width + marginRignt, marginTop + height + marginBottom));

            
        const uiScreen = create2dScreen(width, height);
        const compositScreen = create2dScreen(width, height);

        return {
            lightColor,
            shadowColor,
            lightLayers,
            shadowLayers,

            uiScreen,
            compositScreen,

            width,
            height,
        };

        function create2dScreen(width: number, height: number): CanvasRenderingContext2D {
            let canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            let context = canvas.getContext("2d");
            if (context === null) throw new Error("failed to get 2D context");
            return context;
        }
    }

    export function composit(renderer: Renderer, mainScreen: CanvasRenderingContext2D): void {
        for (let i = 0; i < layerNum; i++)
            renderer.lightColor.drawImage(renderer.lightLayers[i].canvas, 0, 0);

        for (let i = 0; i < layerNum; i++)
            renderer.shadowColor.drawImage(renderer.shadowLayers[i].canvas, 0, 0);
        
            // shadowLayersを斜め累積
        for (let i = layerNum - 2; 0 <= i; i--) {
            renderer.shadowLayers[i].drawImage(renderer.shadowLayers[i + 1].canvas, shadowDirectionX, shadowDirectionY);
        }

        for (let i = 0; i < layerNum; i++) {
            //i-1層目の形で打ち抜く
            if (i !== 0) {
                renderer.shadowLayers[i].globalCompositeOperation = "source-in";
                renderer.shadowLayers[i].drawImage(renderer.lightLayers[i - 1].canvas, -shadowDirectionX, -shadowDirectionY);
            }
            //compositに累積
            renderer.compositScreen.globalCompositeOperation = "source-over";
            renderer.compositScreen.drawImage(renderer.shadowLayers[i].canvas,
                -marginLeft + shadowDirectionX,
                -marginTop + shadowDirectionY);
            //見えなくなる部分を隠す
            renderer.compositScreen.globalCompositeOperation = "destination-out";
            renderer.compositScreen.drawImage(
                renderer.lightLayers[i].canvas, -marginLeft, -marginTop);
        }
        // 影部分が不透明な状態になっているはずなので、影色で上書きする
        renderer.compositScreen.globalCompositeOperation = "source-atop";
        renderer.compositScreen.drawImage(renderer.shadowColor.canvas, -marginLeft, -marginTop);
        // 残りの部分に光色
        renderer.compositScreen.globalCompositeOperation = "destination-over";
        renderer.compositScreen.drawImage(renderer.lightColor.canvas, -marginLeft, -marginTop);

        renderer.compositScreen.globalCompositeOperation = "source-over";
        renderer.compositScreen.drawImage(renderer.uiScreen.canvas, 0, 0);

        // メインスクリーン（本番のcanvas）にスムージングなしで拡大
        mainScreen.imageSmoothingEnabled = false;
        mainScreen.clearRect(0, 0, mainScreen.canvas.width, mainScreen.canvas.height);
        mainScreen.drawImage(renderer.compositScreen.canvas, 0, 0, mainScreen.canvas.width, mainScreen.canvas.height);

        //次フレームの描画に備えてレイヤーを消去
        clearScreen(renderer.lightColor);
        clearScreen(renderer.shadowColor);
        for (var i = 0; i < layerNum; i++) {
            clearScreen(renderer.lightLayers[i]);
            clearScreen(renderer.shadowLayers[i]);
        }
        clearScreen(renderer.uiScreen);
        clearScreen(renderer.compositScreen);

        function clearScreen(screen: CanvasRenderingContext2D): void {
            screen.clearRect(0, 0, screen.canvas.width, screen.canvas.height);
            screen.globalCompositeOperation = "source-over";
        }

        tick++;
    }
}