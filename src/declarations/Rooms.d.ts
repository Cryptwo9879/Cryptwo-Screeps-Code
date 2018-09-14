type HasPos = { pos: RoomPosition }
interface RoomTask {
    name: string;
    roomOrder: any;
    priority: number;
    details: Object;
}
interface RoomCoord {
    x: number;
    y: number;
    xDir: string;
    yDir: string;
}
interface RoomPosition {
    get: any;
    print: string;
    room: Room | undefined;
    name: string;
    coordName: string;
    isEdge: boolean;
    //roomCoords: Coord;
    isPassible(ignoreCreeps?: boolean): boolean;
    isVisible: boolean;
    neighbors: RoomPosition[];
    availableNeighbors(ignoreCreeps?: boolean): RoomPosition[];
    findClosestByLimitedRange<T>(objects: T[] | RoomPosition[], rangeLimit: number,
        opts?: { filter: any | string; }): T | undefined;
}
interface Room {
    createRoomTask: any;
    filterRoomTask: any;
    print: string;
    my: boolean;
    owner: string | undefined
    // Cached structures
    tombstones: Tombstone[];
    creeps: Creep[];
    creepsByType: { [roleName: string]: Creep[] };
    drops: { [resourceType: string]: Resource[] };
    droppedEnergy: Resource[];
    droppedPower: Resource[];
    // Room structures
    _refreshStructureCache: any
    // Multiple structures
    spawns: StructureSpawn[];
    extensions: StructureExtension[];
    roads: StructureRoad[];
    walls: StructureWall[];
    constructedWalls: StructureWall[];
    ramparts: StructureRampart[];
    walkableRamparts: StructureRampart[];
    barriers: (StructureWall | StructureRampart)[];
    //storageUnits: StorageUnit[];
    keeperLairs: StructureKeeperLair[];
    portals: StructurePortal[];
    links: StructureLink[];
    towers: StructureTower[];
    labs: StructureLab[];
    containers: StructureContainer[];
    powerBanks: StructurePowerBank[];
    // Single structures
    observer: StructureObserver | undefined;
    powerSpawn: StructurePowerSpawn | undefined;
    extractor: StructureExtractor | undefined;
    nuker: StructureNuker | undefined;
    repairables: Structure[];
    //rechargeables: rechargeObjectType[];
    sources: Source[];
    mineral: Mineral | undefined;
    constructionSites: ConstructionSite[];
    initStructures: any;
    structures: any;
    initContainers: any;
    executeRoom();
    queToSpawn(spawn: StructureSpawn, spawnTask: spawnTask);
    spawnList: any[];
    roomType: string;
    isOutpost: Boolean | null;
}
interface SavedRoomObject {
    c: string; 	// coordinate name
}

interface SavedSource extends SavedRoomObject {
    contnr: string | undefined;
}

interface SavedController extends SavedRoomObject {
    level: number;
    owner: string | undefined;
    res: {
        username: string,
        ticksToEnd: number,
    } | undefined;
    SM: number | undefined;
    SMavail: number;
    SMcd: number | undefined;
    prog: number | undefined;
    progTot: number | undefined;
}

interface SavedMineral extends SavedRoomObject {
    mineralType: MineralConstant;
    density: number;
}

interface RoomMemory {
    avoid: number;
    tick: number;
    src?: SavedSource[];
    ctrl?: SavedController | undefined;
    mnrl: SavedMineral | undefined;
    SKlairs?: SavedRoomObject[];
    outposts: string[];
    importantStructs?: {
        // Positions of important structures relevant to sieges
        towers: string[];
        spawns: string[];
        storage: string | undefined;
        terminal: string | undefined;
        walls: string[];
        ramparts: string[];
    } | undefined;
    expiration?: number;
    prevPositions?: { [creepID: string]: protoPos };
    lastSeen: number;
    queue: any;
    timer: number;
    suspended: boolean;

}
interface RoomObject {
    print: string;
    StructureController: any;
    ref: string;
    targetedBy: Creep[];
    serialize: any;

}