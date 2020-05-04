interface DigraphVertex {
    coord: Coord;
    inflow: DigraphVertex[];
    outflow: DigraphVertex[];
}
type Digraph = Map<string, DigraphVertex>;

let trafficDigraphForTest: Digraph = new Map();//テスト

function createTrafficDigraph(lowerBound: number, upperBound: number, terrain: Terrain): Digraph {
    const digraph: Digraph = new Map();

    // とりあえず虚無の頂点リストを作る（埋まってないマスのみで構成）
    for (let y = lowerBound; y < upperBound; y++) {
        for (let x = 0; x < fieldWidth; x++) {
            const coord: Coord = { x, y };

            if (Player.canEnter(coord, terrain, false))
                digraph.set(JSON.stringify(coord), { coord, inflow: [], outflow: [] });
        }
    }

    for (let y = lowerBound; y < upperBound; y++) {
        for (let x = 0; x < fieldWidth; x++) {
            const coord: Coord = { x, y };

            if (!Player.canEnter(coord, terrain, false))
                continue;
            //空中のマスは落ちるだけできる
            if (!Player.canStand(coord, terrain, false)) {
                addArrow(digraph, coord, Player.drop(coord, "drop", terrain, false).coord);
                continue;
            }

            const left = Player.checkLeft(coord, terrain, false);
            if (left !== null) addArrow(digraph, coord, left.coord);
            const right = Player.checkRight(coord, terrain, false);
            if (right !== null) addArrow(digraph, coord, right.coord);
            const down = Player.checkDown(coord, terrain, false);
            if (down !== null) addArrow(digraph, coord, down.coord);
            const up = Player.checkUp(coord, terrain, false);
            if (up !== null) addArrow(digraph, coord, up.coord);
        }
    }
    return digraph;

    function addArrow(digraph: Digraph, from: Coord, to: Coord) {
        const fromVertex = digraph.get(JSON.stringify(from));
        const toVertex = digraph.get(JSON.stringify(to));

        // どちらかの頂点が範囲外なら無視
        if (fromVertex === undefined || toVertex === undefined)
            return;

        fromVertex.outflow.push(toVertex);
        toVertex.inflow.push(fromVertex);
    }
}

let sccs: SCCDecomposition = new Map(); //テスト

interface SCComponent {
    vertexes: DigraphVertex[];
    inflow: Set<SCComponent>;
    outflow: Set<SCComponent>;
}
type SCCDecomposition = Map<DigraphVertex, SCComponent>;

// 強連結成分(stronglyConnectedComponent) 分解
function sccDecomposition(vertexes: DigraphVertex[]): SCCDecomposition {
    const seen: Map<DigraphVertex, undefined | 1 | 2> = new Map();
    const decomposition: SCCDecomposition = new Map();

    let root: DigraphVertex | undefined = vertexes[0];
    // 全部巡回できてなかったら、次の根を選ぶ
    while (root !== undefined) {
        const stack: DigraphVertex[] = [];
        outflowRecursion(root, seen, stack);

        // 全部巡回出来てなかったらstackの先頭から次の根を選ぶ
        let root2: DigraphVertex | undefined = stack[0];
        while (root2 !== undefined) {
            const component: SCComponent = { vertexes: [], inflow: new Set(), outflow: new Set() };
            inflowRecursion(root2, seen, component, decomposition);
            root2 = stack.find(v => seen.get(v) === 1);
        }

        // 適当な未探索ノードを選ぶ
        root = vertexes.find(v => seen.get(v) === undefined);
    }

    vertexes.forEach((vertex) => {
        const component = decomposition.get(vertex);
        if (component === undefined) throw new Error("んなはずない");
        component.vertexes.push(vertex);
        vertex.outflow.forEach(to => {
            const toComponent = decomposition.get(to);
            if (toComponent === undefined) throw new Error("んなはずない2");
            component.outflow.add(toComponent);
        });
        vertex.inflow.forEach(from => {
            const fromComponent = decomposition.get(from);
            if (fromComponent === undefined) throw new Error("んなはずない3");
            component.outflow.add(fromComponent);
        });
    });

    return decomposition;

    //一つ目の再帰
    function outflowRecursion(currentVertex: DigraphVertex, seen: Map<DigraphVertex, undefined | 1 | 2>, stack: DigraphVertex[]): void {
        // 巡回済みなら何もせず帰る
        if (seen.get(currentVertex) !== undefined) return;
        // 巡回済みフラグを残す（coordがIDのようにふるまうはず）
        seen.set(currentVertex, 1);
        // 行きがけ順でstackに記録
        stack.push(currentVertex);
        // 深さ優先探索
        currentVertex.outflow.forEach(to => outflowRecursion(to, seen, stack));
    }

    //二つ目の再帰
    function inflowRecursion(currentVertex: DigraphVertex, seen: Map<DigraphVertex, undefined | 1 | 2>, component: SCComponent, decomposition: SCCDecomposition): void {
        // 巡回済みまたは一つ目の再帰で未巡回なら何もせず帰る
        if (seen.get(currentVertex) !== 1) return;
        // 巡回済みフラグを残す
        seen.set(currentVertex, 2);
        // componentに追加
        decomposition.set(currentVertex, component);
        // 深さ優先探索
        currentVertex.inflow.forEach(from => inflowRecursion(from, seen, component, decomposition));
    }
}

//テスト
function drawDigraphForTest(camera: Camera, field: Field, player:Player, screen: CanvasRenderingContext2D): void {
    field.terrain.forEach((row, y)=>
        row.forEach((block, x)=>{
            drawCollision(createCoord(x, y), block);
        }
    ));
    drawPlayer(player);

    screen.fillStyle = "lightgray";
    trafficDigraphForTest.forEach((vertex: DigraphVertex): void => {
        vertex.outflow.forEach((to: DigraphVertex): void => {
            drawArrow(
                camera.offsetX + (vertex.coord.x) * blockSize,
                camera.offsetY - (vertex.coord.y) * blockSize,
                camera.offsetX + (to.coord.x) * blockSize,
                camera.offsetY - (to.coord.y) * blockSize);
        });
    });
    screen.fillStyle = "black";
    Array.from(new Set(sccs.values())).forEach((component, componentIndex) => component.vertexes.forEach(vertex => {
        screen.fillText(componentIndex.toString(),
            camera.offsetX + (vertex.coord.x - 0.5) * blockSize,
            camera.offsetY - (vertex.coord.y - 0.5) * blockSize);
    }));

    function drawCollision(coord: Coord, block: Block) {
        switch (block.collision) {
            case "air":
                screen.fillStyle = "white";
                break;
            case "ladder":
                screen.fillStyle = "red";
                break;
            case "solid":
                screen.fillStyle = "black";
                break;
        }
        screen.fillRect(
            camera.offsetX + (coord.x - 0.5) * blockSize,
            camera.offsetY - coord.y * blockSize,
            blockSize, blockSize);
    }
    function drawPlayer(player: Player) {
        screen.fillStyle = "yellow";
        if(0 < player.smallCount)
        screen.fillRect(
            camera.offsetX + player.coord.x * blockSize - 10,
            camera.offsetY - player.coord.y * blockSize + 2,
            20, 22);
        else 
        screen.fillRect(
            camera.offsetX + player.coord.x * blockSize - 10,
            camera.offsetY - player.coord.y * blockSize - 22,
            20, 46);
    }
    //alert("こんにちは")
    //camera.offsetX + coord.x * blockSize, camera.offsetY - coord.y * blockSize
    function drawArrow(fromX: number, fromY: number, toX: number, toY: number): void {
        const arrowX = toX - fromX;
        const arrowY = toY - fromY;
        const arrowL = Math.sqrt(arrowX * arrowX + arrowY * arrowY);
        const thicknessX = 3 * -arrowY / arrowL;
        const thicknessY = 3 * arrowX / arrowL;
        screen.beginPath();
        screen.moveTo(fromX, fromY);
        screen.lineTo(fromX + thicknessX, fromY + thicknessY);
        screen.lineTo(toX + thicknessX, toY + thicknessY);
        screen.fill();
    }
}