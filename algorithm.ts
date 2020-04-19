interface DigraphVertex {
    coord: Coord;
    inflow: DigraphVertex[];
    outflow: DigraphVertex[];
}
type Digraph = Map<string, DigraphVertex>;

let trafficDigraphForTest: Digraph = new Map();//for test

function createTrafficDigraph(lowerBound: number, upperBound: number, field: Field): Digraph {
    const digraph: Digraph = new Map();

    // とりあえず虚無の頂点リストを作る（埋まってないマスのみで構成）
    for (let y = lowerBound; y < upperBound; y++) {
        for (let x = 0; x < fieldWidth; x++) {
            const coord: Coord = { x, y };

            if (canEnter(coord, field, false))
                digraph.set(JSON.stringify(coord), { coord, inflow: [], outflow: [] });
        }
    }

    for (let y = lowerBound; y < upperBound; y++) {
        for (let x = 0; x < fieldWidth; x++) {
            const coord: Coord = { x, y };

            if (!canEnter(coord, field, false))
                continue;
            //空中のマスは落ちるだけできる
            if (!canStand(coord, field, false)) {
                addArrow(digraph, coord, downCoord(coord));
                continue;
            }

            const left = checkLeft(coord, field, false);
            if (left !== null) addArrow(digraph, coord, left.coord);
            const right = checkRight(coord, field, false);
            if (right !== null) addArrow(digraph, coord, right.coord);
            const down = checkDown(coord, field, false);
            if (down !== null) addArrow(digraph, coord, down.coord);
            const up = checkUp(coord, field, false);
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

let sccs: scComponent[] = []; //テスト

interface scComponent {
    vertexes: DigraphVertex[];
}

// 強連結成分(stronglyConnectedComponent) 分解
function sccDecomposition(vertexes: DigraphVertex[]): scComponent[] {
    const seen: Map<DigraphVertex, undefined | 1 | 2> = new Map();
    let components: scComponent[] = [];

    let root: DigraphVertex | undefined = vertexes[0];
    // 全部巡回できてなかったら、次の根を選ぶ
    while (root !== undefined) {
        const stack = outflowRecursion(root, seen, []);

        // 全部巡回出来てなかったらstackの先頭から次の根を選ぶ
        let root2: DigraphVertex | undefined = stack[0];
        while (root2 !== undefined) {
            components.push(inflowRecursion(root2, seen, {vertexes: []}));
            root2 = stack.find(v => seen.get(v) === 1);
        }
        
        // 適当な未探索ノードを選ぶ
        root = vertexes.find(v => seen.get(v) === undefined);
    }

    return components;

    //一つ目の再帰
    function outflowRecursion(currentVertex: DigraphVertex, seen: Map<DigraphVertex, undefined | 1 | 2>, stack: DigraphVertex[]): DigraphVertex[] {
        // 巡回済みなら何もせず帰る
        if (seen.get(currentVertex) !== undefined) return stack;
        // 巡回済みフラグを残す（coordがIDのようにふるまうはず）
        seen.set(currentVertex, 1);
        // 行きがけ順でstackに記録
        stack.push(currentVertex);
        // 深さ優先探索
        currentVertex.outflow.forEach(to => outflowRecursion(to, seen, stack));

        return stack;
    }

    //二つ目の再帰
    function inflowRecursion(currentVertex: DigraphVertex, seen: Map<DigraphVertex, undefined | 1 | 2>, component: scComponent): scComponent {
        // 巡回済みまたは一つ目の再帰で未巡回なら何もせず帰る
        if (seen.get(currentVertex) !== 1) return component;
        // 巡回済みフラグを残す
        seen.set(currentVertex, 2);
        // componentに追加
        component.vertexes.push(currentVertex);
        // 深さ優先探索
        currentVertex.inflow.forEach(from => inflowRecursion(from, seen, component));

        return component;
    }
}

function drawDigraphForTest(camera: Camera, screen: CanvasRenderingContext2D): void {//for test
    screen.fillStyle = "lightgray";
    trafficDigraphForTest.forEach((vertex: DigraphVertex): void => {
        vertex.outflow.forEach((to: DigraphVertex): void => {
            drawArrow(
                camera.offsetX + (vertex.coord.x + 0.5) * blockSize,
                camera.offsetY - (vertex.coord.y - 0.5) * blockSize,
                camera.offsetX + (to.coord.x + 0.5) * blockSize,
                camera.offsetY - (to.coord.y - 0.5) * blockSize);
        });
    });
    screen.fillStyle = "black";
    sccs.forEach((component, componentIndex) => component.vertexes.forEach(vertex => {
        screen.fillText(componentIndex.toString(),
            camera.offsetX + (vertex.coord.x) * blockSize,
            camera.offsetY - (vertex.coord.y - 1) * blockSize);
    }));

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