
type Graph = boolean[][];

namespace Graph {
    export function create(length: number): Graph {
        return new Array(length).fill(0).map(_ => new Array(length).fill(false));
    }

    // グラフを複製
    export function clone(graph: Graph) {
        return graph.map(row => row.map(f => f));
    }

    // 辺の向きをすべて逆転したグラフを得る
    export function reverse(graph: Graph) {
        return graph.map((row, from) => row.map((f, to) => graph[to][from]));
    }

    // 二つのグラフを合わせたグラフを作る
    export function concat(a: Graph, b: Graph) {
        const newGraph = create(a.length + b.length);
        a.forEach((row, from) => row.forEach((f, to) => newGraph[from][to] = f));
        b.forEach((row, from) => row.forEach((f, to) => newGraph[from + a.length][to + a.length] = f));
        return newGraph;
    }

    // n 以降の頂点とそれにつながる辺を削除する
    export function drop(graph: Graph, n: number) {
        return graph.slice(0, n).map(row => row.slice(0, n));
    }

    // 推移閉包を作成
    export function transclosure(graph: Graph) {
        const newGraph: Graph = clone(graph);
        for (let k = 0; k < graph.length; k++)
            for (let i = 0; i < graph.length; i++)
                for (let j = 0; j < graph.length; j++)
                    if (newGraph[i][k] && newGraph[k][j])
                        newGraph[i][j] = true;
        return newGraph;
    }

    // 強連結成分分解
    export function strongComponents(graph: Graph): [number[], number] {
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
                graph[now].forEach((f, to) => { if (f) dfs1(to); });
                order.unshift(now);
            }
            dfs1(i);

            function dfs2(now: number) {
                if (visited[now] !== 1) return;
                visited[now] = 2;
                component[now] = componentCount;
                reversed[now].forEach((f, to) => { if (f) dfs2(to); });
            }
            for (var j = 0; j < order.length; j++) {
                if (visited[order[j]] !== 1) continue;
                dfs2(order[j]);
                componentCount++;
            }
        }
        return [component, componentCount];
    }
}