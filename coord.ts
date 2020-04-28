interface Coord {
    readonly x: number;
    readonly y: number;
}
function createCoord(x:number, y:number){
    return {x, y};
}

function upCoord(coord: Coord): Coord {
    return createCoord(coord.x, coord.y + 1);
}
function downCoord(coord: Coord): Coord {
    return createCoord(coord.x, coord.y - 1);
}
function leftCoord(coord: Coord): Coord {
    return createCoord(coord.x - 1, coord.y);
}
function rightCoord(coord: Coord): Coord {
    return createCoord(coord.x + 1, coord.y);
}

const blockSize = 24;