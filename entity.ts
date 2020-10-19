/// <reference path="./resources.ts" />
/// <reference path="./gameobject.ts" />
/// <reference path="./field.ts" />

/// <reference path="./neko.ts" />
/// <reference path="./enemy.ts" />

type Entity = Neko;

function controlEntity(entity: Entity, field: Field, player: Player): Entity {
    if (entity.type === "neko") {
        return Neko.control(entity, field, player);
    }
    // 網羅チェック
    return entity.type;
}