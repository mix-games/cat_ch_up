/// <reference path="./resources.ts" />
/// <reference path="./coord.ts" />
/// <reference path="./player.ts" />
/// <reference path="./entity.ts" />

interface Field {
    readonly terrain: readonly (readonly Field.Collision[])[];
    readonly pendingTerrain: readonly (readonly number[])[];
    readonly textures: readonly (readonly Field.BlockTexture[])[];
    readonly entities: readonly Entity[];
    readonly backgroundTexture: Texture;
    readonly trafficGraph: Field.Graph;
}

namespace Field {
    //隣接リスト表現のグラフ
    export type Graph = number[][];

    export const Collision = { Air: 1 as const, Block: 2 as const, Ladder: 4 as const };

    export type Collision = typeof Collision[keyof typeof Collision];

    const anyCollision = Collision.Air | Collision.Block | Collision.Ladder;

    export interface BlockTexture {
        readonly texture0: Texture;
        readonly texture1: Texture;
    }
    export type Terrain = readonly (readonly Collision[])[];

    interface MutableField {
        terrain: Field.Collision[][];
        pendingTerrain: number[][];
        textures: (Field.BlockTexture[])[];
        entities: Entity[];
        backgroundTexture: Texture;
        trafficGraph: Field.Graph;
    }

    export function createField(): Field {
        const x = Math.floor(Math.random() * fieldWidth);
        return annexRow({
            terrain: [
                new Array(fieldWidth).fill(0).map(_ => Collision.Air),
            ],
            pendingTerrain: [
                new Array(fieldWidth).fill(0).map((_, i) => i == x ? Collision.Ladder : ~Collision.Block),
                new Array(fieldWidth).fill(0).map(_ => anyCollision),
            ],
            trafficGraph: new Array(fieldWidth).fill(0).map(_ => []),
            textures: [],
            entities: [createNeko()],
            backgroundTexture: resources.background_texture,
        }, 10);
    }

    const fieldWidth = 10;

    //Y座標は下から数える
    export function annexRow(field: Field, targetHeight: number): Field {
        if (targetHeight <= field.textures.length) return field;

        return annexRow(generate(field), targetHeight);
    }
    function assignTexture(row: readonly Collision[]): BlockTexture[] {
        return row.map((collision: Collision): BlockTexture => {
            switch (collision) {
                case Collision.Ladder:
                    return {
                        texture0: resources.terrain_wall_texture,
                        texture1: resources.terrain_ladder_texture,
                    };
                case Collision.Block:
                    return {
                        texture0: resources.terrain_wall_texture,
                        texture1: resources.terrain_condenser_texture,
                    };
                case Collision.Air:
                    return {
                        texture0: resources.terrain_wall_texture,
                        texture1: createEmptyTexture()
                    };
            }
        });
    }

    export function getCollision(terrain: Terrain, coord: Coord): Collision {
        if (terrain.length <= coord.y)
            throw new Error("The accessed row has not been generated. coord:" + JSON.stringify(coord));
        if (coord.y < 0 || coord.x < 0 || fieldWidth <= coord.x)
            return Collision.Block;
        return terrain[coord.y][coord.x];
    }

    export function getBlockTexture(field: Field, coord: Coord): BlockTexture {
        if (field.textures.length <= coord.y)
            throw new Error("The accessed row has not been generated. coord:" + JSON.stringify(coord));
        if (coord.y < 0 || coord.x < 0 || fieldWidth <= coord.x)
            return {
                texture0: createEmptyTexture(),
                texture1: createEmptyTexture()
            };
        return field.textures[coord.y][coord.x];

    }

    export function drawField(field: Field, camera: Camera, renderer: Renderer): void {
        drawTexture(
            field.backgroundTexture,
            renderer.width / 2,
            renderer.height / 2,
            tick,
            renderer
        );

        const xRange = Math.ceil(renderer.width / blockSize / 2);
        const yRange = Math.ceil(renderer.height / blockSize / 2);
        const x1 = Math.floor(camera.centerX / blockSize) - xRange;
        const x2 = Math.ceil(camera.centerX / blockSize) + xRange;
        const y1 = Math.floor(-camera.centerY / blockSize) - yRange;
        const y2 = Math.ceil(-camera.centerY / blockSize) + yRange;

        for (var x = x1; x <= x2; x++) {
            for (var y = y1; y <= y2; y++) {
                if (field.terrain.length <= y) continue;
                const coord = createCoord(x, y);
                drawTexture(
                    getBlockTexture(field, coord).texture0,
                    camera.offsetX + coord.x * blockSize,
                    camera.offsetY - coord.y * blockSize,
                    tick,
                    renderer
                );
            }
        }

        for (var x = x1; x <= x2; x++) {
            for (var y = y1; y <= y2; y++) {
                if (field.terrain.length <= y) continue;
                const coord = createCoord(x, y);
                drawTexture(
                    getBlockTexture(field, coord).texture1,
                    camera.offsetX + coord.x * blockSize,
                    camera.offsetY - coord.y * blockSize,
                    tick,
                    renderer
                );
            }
        }

        // デバッグ用の赤い点
        //*
        for (var x = x1; x <= x2; x++) {
            for (var y = y1; y <= y2; y++) {
                if (field.terrain.length <= y) continue;
                const coord = createCoord(x, y);
                drawTexture(
                    createRectTexture("red", 1, 1),
                    camera.offsetX + coord.x * blockSize,
                    camera.offsetY - coord.y * blockSize,
                    tick,
                    renderer
                );
            }
        }//*/

        field.entities.forEach(e => drawGameObject(e, camera, renderer));
    }

    // プレイヤー行動後の敵などの処理はここ
    export function turn(field: Field, player: Player): Field {
        return annexRow({
            ...field,
            entities: field.entities.map(e => controlEntity(e, field, player))
        }, Math.max(player.coord.y + 5, ...field.entities.map(e => e.coord.y + 5)));
    }

    // 配列をシャッフルした配列を返す
    function shuffle<T>(array: T[]): T[] {
        const array2 = [...array];
        for (let i = 0; i < array2.length; i++) {
            const j = i + Math.floor(Math.random() * (array2.length - i));

            const t = array2[i];
            array2[i] = array2[j];
            array2[j] = t;
        }
        return array2;
    }

    // 二つのグラフを合わせたグラフを作る
    function concatGraph(a: Graph, b: Graph) {
        const newGraph: Graph = new Array(a.length + b.length).fill(0).map(_ => []);
        a.forEach((v, from) => v.forEach(to => newGraph[from].push(to)));
        b.forEach((v, from) => v.forEach(to => newGraph[from + a.length].push(to + a.length)));
        return newGraph;
    }

    // n 以降の頂点とそれにつながる辺を削除する
    function dropGraph(graph: Graph, n: number) {
        return graph.slice(0, n).map(v => v.filter(to => to < n));
    }

    // 推移閉包を作成
    function transclosure(graph: Graph) {
        const newGraph: Graph = new Array(graph.length).fill(0).map(_ => []);
        function dfs(now: number, root: number, visited: boolean[]) {
            if (visited[now]) return;
            visited[now] = true;
            newGraph[root].push(now);
            graph[now].forEach(x => dfs(x, root, visited));
        }
        graph.forEach((v, i) => v.forEach(j => dfs(j, i, new Array(graph.length).fill(false))));
        return newGraph.map(x => Array.from(new Set(x)));
    }

    // 辺の向きをすべて逆転したグラフを得る
    function reverse(graph: number[][]) {
        const reversed: number[][] = [];
        graph.forEach((vertex) => {
            reversed.push([]);
        });
        graph.forEach((vertex, i) => {
            vertex.forEach(j => reversed[j].push(i));
        });

        return reversed;
    }

    // 強連結成分分解
    function strongComponents(graph: number[][]): [number[], number] {

        const reversed = reverse(graph);
        // dfs1で到達したら1、dfs2も到達したら2、いずれも未到達なら0
        const visited: (0 | 1 | 2)[] = new Array(graph.length).fill(0);
        // component[i] = i番目の頂点が属する強連結成分の番号
        const component: number[] = new Array(graph.length);
        let componentCount = 0;

        // 連結でないグラフに対応するためにはたぶんここをループする必要がある
        for (var i = 0; i < graph.length; i++) {
            if (visited[i] !== 0) continue;
            // 深さ優先探索 i<j⇒log[i] log[j]間に辺がある
            const order: number[] = [];
            function dfs1(now: number) {
                if (visited[now] !== 0) return;
                visited[now] = 1;
                graph[now].forEach(x => dfs1(x));
                order.unshift(now);
            }
            dfs1(i);

            function dfs2(now: number) {
                if (visited[now] !== 1) return;
                visited[now] = 2;
                component[now] = componentCount;
                reversed[now].forEach(x => dfs2(x));
            }
            for (var j = 0; j < order.length; j++) {
                if (visited[order[j]] !== 1) continue;
                dfs2(order[j]);
                componentCount++;
            }
        }
        return [component, componentCount];
    }

    function generate(field: Field): Field {
        const terrain2: Collision[][] = field.terrain.map(row => [...row]);
        let graph2: Graph = field.trafficGraph;
        const pendingTerrain2: number[][] = field.pendingTerrain.map(row => [...row]);

        const newRow: Collision[] = new Array(fieldWidth);

        // とりあえず確定してるところを置く
        pendingTerrain2[0].forEach((pending, x) => {
            if (pending == Collision.Air) newRow[x] = Collision.Air;
            if (pending == Collision.Block) newRow[x] = Collision.Block;
            if (pending == Collision.Ladder) newRow[x] = Collision.Ladder;
        });

        // 自由にしていいブロックを勝手に決める。
        // 左右の対称性を保つために決定順をシャッフルする。
        shuffle(new Array(fieldWidth).fill(0).map((_, i) => i)).forEach(x => {
            const pending = pendingTerrain2[0][x];
            if (pending == Collision.Air ||
                pending == Collision.Block ||
                pending == Collision.Ladder) return;
            const candidate: Collision[] = [];

            if ((pending & Collision.Block) !== 0) { newRow[x] = Collision.Block; return; }

            if ((pending & Collision.Air) !== 0) {
                // 梯子を相対的に少なくしたい
                candidate.push(Collision.Air, Collision.Air, Collision.Air);
            }
            if ((pending & Collision.Block) !== 0) {
                // 梯子を相対的に少なくしたい
                candidate.push(Collision.Block, Collision.Block);
                // ブロックの左右隣接を好む
                if (newRow[x - 1] === Collision.Block || newRow[x + 1] === Collision.Block) candidate.push(Collision.Block, Collision.Block);
            }
            // 梯子、特に左右隣り合わせを嫌う
            if ((pending & Collision.Ladder) !== 0) {
                if (newRow[x - 1] !== Collision.Ladder && newRow[x + 1] !== Collision.Ladder)
                    candidate.push(Collision.Ladder);
            }

            newRow[x] = candidate[Math.floor(Math.random() * candidate.length)];
        });

        // 新しい行を追加
        terrain2.push(newRow);
        pendingTerrain2.shift();
        pendingTerrain2.push(new Array(fieldWidth).fill(0).map((_, i) => anyCollision));

        // ここからは追加した行に合わせて graphを更新したりpendingTerrainに条件を追加したり

        for (let x = 0; x < fieldWidth; x++) {
            // ブロックの上にブロックでないマスがあったらその上は高確率でブロックでない
            if (terrain2[terrain2.length - 2][x] === Collision.Block &&
                terrain2[terrain2.length - 1][x] !== Collision.Block &&
                Math.random() < 0.9)
                pendingTerrain2[0][x] &= ~Collision.Block;

            // 梯子があったらその上は必ずブロックでない
            if (terrain2[terrain2.length - 1][x] === Collision.Ladder)
                pendingTerrain2[0][x] &= ~Collision.Block;

            // 長さ1の梯子を生成しない
            if (terrain2[terrain2.length - 1][x] === Collision.Ladder &&
                terrain2[terrain2.length - 2][x] !== Collision.Ladder)
                pendingTerrain2[0][x] &= Collision.Ladder;
        }

        // 生成されたterrainに合わせてgraphを更新
        // 後ろに下の段の頂点を追加しておく
        graph2 = concatGraph(new Array(fieldWidth).fill(0).map(_ => []), graph2);
        const tempTerrain = [...terrain2, ...pendingTerrain2.map(row => row.map(x => x & Collision.Block ? Collision.Block : (x & Collision.Air) ? Collision.Air : Collision.Ladder))];
        // 上下移動を繋ぐ
        for (let x = 0; x < fieldWidth; x++) {
            if (Player.checkUp({ x, y: terrain2.length - 2 }, tempTerrain, false) !== null)
                graph2[x + fieldWidth].push(x);
            if (Player.checkDown({ x, y: terrain2.length - 1 }, tempTerrain, false) !== null
                || Player.checkState({ x, y: terrain2.length - 1 }, tempTerrain, false) === "drop")
                graph2[x].push(x + fieldWidth);

            if (Player.checkRight({ x, y: terrain2.length - 1 }, tempTerrain, false) !== null)
                graph2[x].push(x + 1);
            if (Player.checkLeft({ x, y: terrain2.length - 1 }, tempTerrain, false) !== null)
                graph2[x].push(x - 1);

            //　前の行では未確定だった左右移動があるかもしれないので追加
            if (Player.checkRight({ x, y: terrain2.length - 2 }, tempTerrain, false) !== null)
                graph2[x + fieldWidth].push(x + 1 + fieldWidth);
            if (Player.checkLeft({ x, y: terrain2.length - 2 }, tempTerrain, false) !== null)
                graph2[x + fieldWidth].push(x - 1 + fieldWidth);

            if (Player.checkRightUp({ x, y: terrain2.length - 2 }, tempTerrain, false) !== null)
                graph2[x + fieldWidth].push(x + 1);
            if (Player.checkLeftUp({ x, y: terrain2.length - 2 }, tempTerrain, false) !== null)
                graph2[x + fieldWidth].push(x - 1);
        }

        // 推移閉包を取った上で、後ろに入れておいた古い頂点を落とす
        graph2 = dropGraph(transclosure(graph2), fieldWidth);

        // graphにあわせてpendingを更新
        // 強連結成分分解
        const [component, componentCount] = strongComponents(graph2);

        //各辺を見て、各強連結成分にいくつの入り口と出口があるか数える
        const entranceCount: number[] = new Array(componentCount).fill(0);
        const exitCount: number[] = new Array(componentCount).fill(0);
        graph2.forEach((v, from) => {
            v.forEach(to => {
                if (component[from] !== component[to]) {
                    exitCount[component[from]]++;
                    entranceCount[component[to]]++;
                }
            });
        });

        const componentsWithoutEntrance: number[][] = [];
        const componentsWithoutExit: number[][] = [];
        //入り口のない強連結成分、出口のない成分のメンバーを成分ごとに分けてリストアップする
        for (let i = 0; i < componentCount; i++) {
            if (exitCount[i] !== 0 && entranceCount[i] !== 0) continue;

            const members = [];
            for (let j = 0; j < field.trafficGraph.length; j++)
                if (component[j] === i) members.push(j);

            if (exitCount[i] === 0)
                componentsWithoutExit.push([...members]);
            if (entranceCount[i] === 0)
                componentsWithoutEntrance.push([...members]);
        }

        // 制約パターンの組み合わせを列挙（二次元配列の各行から一つずつ選べればOK）
        const patternList = [
            ...componentsWithoutEntrance.map(points => {
                const list: { pattern: number[][], offsetX: number; }[] = [];
                points.forEach(x => {
                    // 立ち入れない点は孤立点だが出口を作る必要はない
                    if (!Player.canEnter({ x: x, y: terrain2.length - 1 }, tempTerrain, false)) return;
                    //上2個がブロックでなければ入り口になる
                    list.push({ pattern: [[~Collision.Block], [~Collision.Block]], offsetX: x });
                });
                return list;
            }),
            ...componentsWithoutExit.map(points => {
                const list: { pattern: number[][], offsetX: number; }[] = [];
                points.forEach(x => {
                    // 立ち入れない点は孤立点だが出口を作る必要はない
                    if (!Player.canEnter({ x: x, y: terrain2.length - 1 }, tempTerrain, false)) return;
                    // 立てない点に出口を作っても手遅れ
                    if (!Player.canStay({ x: x, y: terrain2.length - 1 }, tempTerrain, false)) return;

                    //上に梯子を作れば出口になる
                    list.push({ pattern: [[Collision.Ladder]], offsetX: x });

                    //隣がブロックなら斜め上に立ち位置を作れば出口になる
                    if (1 <= x && terrain2[terrain2.length - 1][x - 1] == Collision.Block)
                        list.push({ pattern: [[~Collision.Block, ~Collision.Block], [~Collision.Block, ~Collision.Block]], offsetX: x - 1 });
                    if (x < fieldWidth - 1 && terrain2[terrain2.length - 1][x + 1] == Collision.Block)
                        list.push({ pattern: [[~Collision.Block, ~Collision.Block], [~Collision.Block, ~Collision.Block, ~Collision.Block]], offsetX: x });
                });
                return list;
            }),
        ].filter(x => 0 < x.length).map(x => shuffle(x));

        function putCollisionPattern(pendingTerrain: readonly (readonly number[])[], pattern: number[][], offsetX: number): readonly (readonly number[])[] | null {
            const pendingTerrain2 = pendingTerrain.map((row, y) => row.map((a, x) => {
                return a & (pattern[y] !== undefined && pattern[y][x - offsetX] !== undefined ? pattern[y][x - offsetX] : anyCollision);
            }));
            if (pendingTerrain2.some(row => row.some(p => p == 0))) return null;

            return pendingTerrain2;
        }
        // 制約パターンが矛盾しないような組み合わせを探して設置する（多分どう選んでも矛盾しないけど）
        function rec(pendingTerrain: readonly (readonly number[])[], patternList: { pattern: number[][], offsetX: number; }[][]): readonly (readonly number[])[] | null {
            if (patternList.length === 0) return pendingTerrain;
            const head = patternList[0];
            const tail = patternList.slice(1);

            for (let i = 0; i < head.length; i++) {
                const pendingTerrain2 = putCollisionPattern(pendingTerrain, head[i].pattern, head[i].offsetX);
                if (pendingTerrain2 == null) return null;
                const result = rec(pendingTerrain2, tail);
                if (result !== null) return result;
            }

            return null;
        }

        const pendingTerrain3 = rec(pendingTerrain2, patternList);
        if (pendingTerrain3 === null) throw new Error();

        const field2 = {
            ...field,
            textures: terrain2.map(row => assignTexture(row)),
            terrain: terrain2,
            pendingTerrain: pendingTerrain3,
            trafficGraph: graph2,
        };

        // 以下デバッグ表示

        console.log(graph2);
        const entranceId1 = new Array(fieldWidth).fill("  ");
        const entranceId2 = new Array(fieldWidth).fill("  ");
        componentsWithoutEntrance.forEach((a, i) => a.forEach(x => { entranceId2[x] = i < 10 ? " " + i : "" + i; if (Player.canEnter({ x, y: terrain2.length - 1 }, tempTerrain, false)) entranceId1[x] = i < 10 ? " " + i : "" + i; }));
        console.log("entrance↓");
        //console.log(entranceList);
        console.log(" " + entranceId1.join(""));
        console.log("(" + entranceId2.join("") + ")");

        const exitId1 = new Array(fieldWidth).fill("  ");
        const exitId2 = new Array(fieldWidth).fill("  ");
        componentsWithoutExit.forEach((a, i) => a.forEach(x => { exitId2[x] = i < 10 ? " " + i : "" + i; if (Player.canEnter({ x, y: terrain2.length - 1 }, tempTerrain, false)) exitId1[x] = i < 10 ? " " + i : "" + i; }));
        console.log("exit↑");
        //console.log(exitList);
        console.log(" " + exitId1.join(""));
        console.log("(" + exitId2.join("") + ")");

        show(field2);
        function show(field: Field) {
            function collisionToString(coll: Collision) {
                switch (coll) {
                    case Collision.Air: return "  ";
                    case Collision.Block: return "[]";
                    case Collision.Ladder: return "|=";
                }
            }
            console.log("terrain:");
            [...field.terrain].reverse().forEach(line => console.log(":" + line.map(collisionToString).join("") + ":"));
        }

        if (exitId1.join("").trim() == "" || entranceId1.join("").trim() == "") throw new Error("no Exit or Entrance");

        return field2;
    }
}