interface Coord {
    readonly x: number;
    readonly y: number;
}

namespace Coord {
    export function create(x: number, y: number) {
        return { x, y };
    }
    export function up(coord: Coord): Coord {
        return create(coord.x, coord.y + 1);
    }
    export function down(coord: Coord): Coord {
        return create(coord.x, coord.y - 1);
    }
    export function left(coord: Coord): Coord {
        return create(coord.x - 1, coord.y);
    }
    export function right(coord: Coord): Coord {
        return create(coord.x + 1, coord.y);
    }
    export function rightUp(coord: Coord): Coord {
        return right(up(coord));
    }
    export function leftUp(coord: Coord): Coord {
        return left(up(coord));
    }
    export function equals(a: Coord, b: Coord) {
        return a.x == b.x && a.y == b.y;
    }
}
const blockSize = 24;