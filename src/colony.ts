// Colony class - organizes all assets of an owned room into a colony

import {Overseer} from './Overseer';
import {LogisticsNetwork} from './logistics/LogisticsNetwork';
import {Energetics} from './logistics/Energetics';
import {StoreStructure} from './declarations/typeGuards';
import {maxBy, mergeSum, minBy} from './utilities/utils';
import {Mem} from './Memory';
import {log} from './console/log';
import {Cartographer, ROOMTYPE_CONTROLLER} from './utilities/Cartographer';

export enum ColonyStage {
	Larva = 0,		// No storage and no incubator
	Pupa  = 1,		// Has storage but RCL < 8
	Adult = 2,		// RCL 8 room
}

export enum DEFCON {
	safe               = 0,
	invasionNPC        = 1,
	boostedInvasionNPC = 2,
	playerInvasion     = 2,
	bigPlayerInvasion  = 3,
}

export function getAllColonies(): Colony[] {
	return _.values(Overmind.colonies);
}


export interface ColonyMemory {
	defcon: {
		level: number,
		tick: number,
	},
}

const defaultColonyMemory: ColonyMemory = {
	defcon       : {
		level: DEFCON.safe,
		tick : -Infinity
	},
};


export class Colony {
	// Colony memory
	memory: ColonyMemory;								// Memory.colonies[name]
	// Colony overseer
	overseer: Overseer;									// This runs the directives and overlords
	// Room associations
	name: string;										// Name of the primary colony room
	ref: string;
	id: number; 										// Order in which colony is instantiated from Overmind
	colony: Colony;										// Reference to itself for simple overlord instantiation
	roomNames: string[];								// The names of all rooms including the primary room
	room: Room;											// Primary (owned) room of the colony
	outposts: Room[];									// Rooms for remote resource collection
	rooms: Room[];										// All rooms including the primary room
	pos: RoomPosition;
	assets: { [resourceType: string]: number };
	// Physical colony structures and roomObjects
	controller: StructureController;					// These are all duplicated from room properties
	spawns: StructureSpawn[];							// |
	extensions: StructureExtension[];					// |
	storage: StructureStorage | undefined;				// |
	links: StructureLink[];								// |
	availableLinks: StructureLink[];
	claimedLinks: StructureLink[];						// | Links belonging to hive cluseters excluding mining groups
	dropoffLinks: StructureLink[]; 						// | Links not belonging to a hiveCluster, used as dropoff
	terminal: StructureTerminal | undefined;			// |
	towers: StructureTower[];							// |
	labs: StructureLab[];								// |
	powerSpawn: StructurePowerSpawn | undefined;		// |
	nuker: StructureNuker | undefined;					// |
	observer: StructureObserver | undefined;			// |
	tombstones: Tombstone[]; 							// | Tombstones in all colony rooms
	drops: { [resourceType: string]: Resource[] }; 		// | Dropped resources in all colony rooms
	sources: Source[];									// | Sources in all colony rooms
	extractors: StructureExtractor[];					// | All extractors in owned and remote rooms
	flags: Flag[];										// | Flags assigned to the colony
	constructionSites: ConstructionSite[];				// | Construction sites in all colony rooms
	repairables: Structure[];							// | Repairable structures, discounting barriers and roads
	rechargeables: rechargeObjectType[];				// | Things that can be recharged from
	// obstacles: RoomPosition[]; 							// | List of other obstacles, e.g. immobile creeps
	destinations: RoomPosition[];
	// Hive clusters
	hiveClusters: HiveCluster[];						// List of all hive clusters
	commandCenter: CommandCenter | undefined;			// Component with logic for non-spawning structures
	hatchery: Hatchery | undefined;						// Component to encapsulate spawner logic
	evolutionChamber: EvolutionChamber | undefined; 	// Component for mineral processing
	upgradeSite: UpgradeSite;							// Component to provide upgraders with uninterrupted energy
	miningSites: { [sourceID: string]: MiningSite };	// Component with logic for mining and hauling
	extractionSites: { [extractorID: string]: ExtractionSite };
	// Operational mode
	bootstrapping: boolean; 							// Whether colony is bootstrapping or recovering from crash
	isIncubating: boolean;								// If the colony is incubating
	level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; 				// Level of the colony's main room
	stage: number;										// The stage of the colony "lifecycle"
	defcon: number;
	terminalState: TerminalState | undefined;
	breached: boolean;
	lowPowerMode: boolean; 								// Activate if RCL8 and full energy
	// Creeps and subsets
	creeps: Creep[];										// Creeps bound to the colony
	creepsByRole: { [roleName: string]: Creep[] };		// Creeps hashed by their role name
	// Resource requests
	linkNetwork: LinkNetwork;
	logisticsNetwork: LogisticsNetwork;
	transportRequests: TransportRequestGroup;
	// Road network
    roadLogistics: RoadLogistics;
    
	static settings = {
		remoteSourcesByLevel: {
			1: 1,
			2: 2,
			3: 3,
			4: 4,
			5: 5,
			6: 6,
			7: 7,
			8: 9,
		},
		maxSourceDistance   : 100
	};

	constructor(id: number, roomName: string, outposts: string[], creeps: Creep[] | undefined) {
		// Primitive colony setup
		this.id = id;
		this.name = roomName;
		this.ref = roomName;
		this.memory = Mem.wrap(Memory.colonies, roomName, defaultColonyMemory, true);
		this.colony = this;
		// Register colony globally to allow 'W1N1' and 'w1n1' to refer to Overmind.colonies.W1N1
		global[this.name] = this;
		global[this.name.toLowerCase()] = this;
		// Build the colony
		this.build(id, roomName, outposts, creeps);
	}

	build(id: number, roomName: string, outposts: string[], creeps: Creep[] | undefined): void {
		// Register rooms
		this.roomNames = [roomName].concat(outposts);
		this.room = Game.rooms[roomName];
		this.outposts = _.compact(_.map(outposts, outpost => Game.rooms[outpost]));
		this.rooms = [this.room].concat(this.outposts);
		// Give the colony an Overseer
		this.overseer = new Overseer(this);
		// Register creeps
		this.creeps = creeps || [];
		this.creepsByRole = _.groupBy(this.creeps, creep => creep.memory.role);
		// Register the rest of the colony components; the order in which these are called is important!
		this.registerRoomObjects();			// Register real colony components
		this.registerOperationalState();	// Set the colony operational state
		this.registerUtilities(); 			// Register logistics utilities, room planners, and layout info
	
	}

	refresh(): void {
		// // TODO
		// // Register rooms
		// this.room = Game.rooms[roomName];
		// this.outposts = _.compact(_.map(outposts, outpost => Game.rooms[outpost]));
		// this.rooms = [this.room].concat(this.outposts);
		// // Give the colony an Overseer
		// this.overseer = new Overseer(this);
		// // Register creeps
		// this.creeps = creeps || [];
		// this.creepsByRole = _.groupBy(this.creeps, creep => creep.memory.role);
		// // Register the rest of the colony components; the order in which these are called is important!
		// this.registerRoomObjects();			// Register real colony components
		// this.registerOperationalState();	// Set the colony operational state
		// this.registerUtilities(); 			// Register logistics utilities, room planners, and layout info
		// this.registerHiveClusters(); 		// Build the hive clusters
		// this.spawnMoarOverlords(); 			// Register colony overlords
	}

	private registerRoomObjects(): void {
		// Create placeholder arrays for remaining properties to be filled in by the Overmind
		this.flags = []; // filled in by directives
		this.destinations = []; // filled in by various hive clusters and directives
		// Register room objects across colony rooms
		// $.set(this, 'controller', () => this.room.controller!);
		this.controller = this.room.controller!; // must be controller since colonies are based in owned rooms
		this.spawns = _.sortBy(_.filter(this.room.spawns, spawn => spawn.my && spawn.isActive()), spawn => spawn.ref);
		this.extensions = this.room.extensions;
		this.storage = this.room.storage && this.room.storage.isActive() ? this.room.storage : undefined;
		this.links = this.room.links;
		this.availableLinks = _.clone(this.room.links);
		this.terminal = this.room.terminal && this.room.terminal.isActive() ? this.room.terminal : undefined;
		this.towers = this.room.towers;
		this.labs = _.sortBy(_.filter(this.room.labs, lab => lab.my && lab.isActive()),
							 lab => 50 * lab.pos.y + lab.pos.x); // Labs are sorted in reading order of positions
		this.powerSpawn = this.room.powerSpawn;
		this.nuker = this.room.nuker;
		this.observer = this.room.observer;
		this.pos = (this.storage || this.terminal || this.spawns[0] || this.controller).pos;
		// Register physical objects across all rooms in the colony
		this.sources = _.sortBy(_.flatten(_.map(this.rooms, room => room.sources)),
								source => source.pos.getMultiRoomRangeTo(this.pos));
		this.extractors = _(this.rooms)
			.map(room => room.extractor)
			.compact()
			.filter(extractor => (extractor!.my && extractor!.room.my)
								 || Cartographer.roomType(extractor!.room.name) != ROOMTYPE_CONTROLLER)
			.sortBy(extractor => extractor!.pos.getMultiRoomRangeTo(this.pos)).value() as StructureExtractor[];
		this.constructionSites = _.flatten(_.map(this.rooms, room => room.constructionSites));
		this.tombstones = _.flatten(_.map(this.rooms, room => room.tombstones));
		this.drops = _.merge(_.map(this.rooms, room => room.drops));
		this.repairables = _.flatten(_.map(this.rooms, room => room.repairables));
		this.rechargeables = _.flatten(_.map(this.rooms, room => room.rechargeables));
		// this.obstacles = [];
	}

	private registerOperationalState(): void {
		this.level = this.controller.level as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
		this.bootstrapping = false;
		this.isIncubating = false;
		if (this.storage && this.spawns[0]) {
			// If the colony has storage and a hatchery
			if (this.controller.level == 8) {
				this.stage = ColonyStage.Adult;
			} else {
				this.stage = ColonyStage.Pupa;
			}
		} else {
			this.stage = ColonyStage.Larva;
		}
		// this.incubatingColonies = [];
		this.lowPowerMode = Energetics.lowPowerMode(this);
		// Set DEFCON level
		// TODO: finish this
		let defcon = DEFCON.safe;
		let defconDecayTime = 200;
		if (this.room.dangerousHostiles.length > 0) {
			let effectiveHostileCount = _.sum(_.map(this.room.dangerousHostiles,
													hostile => hostile.boosts.length > 0 ? 2 : 1));
			if (effectiveHostileCount >= 3) {
				defcon = DEFCON.boostedInvasionNPC;
			} else {
				defcon = DEFCON.invasionNPC;
			}
		}
		if (this.memory.defcon) {
			if (defcon < this.memory.defcon.level) { // decay defcon level over time if defcon less than memory value
				if (this.memory.defcon.tick + defconDecayTime < Game.time) {
					this.memory.defcon.level = defcon;
					this.memory.defcon.tick = Game.time;
				}
			} else if (defcon > this.memory.defcon.level) { // refresh defcon time if it increases by a level
				this.memory.defcon.level = defcon;
				this.memory.defcon.tick = Game.time;
			}
		} else {
			this.memory.defcon = {
				level: defcon,
				tick : Game.time
			};
		}
		this.defcon = this.memory.defcon.level;
		this.breached = (this.room.dangerousHostiles.length > 0 &&
						 this.creeps.length == 0 &&
						 !this.controller.safeMode);
		this.terminalState = undefined;
		// Register assets
		this.assets = this.getAllAssets();
	}

	private registerUtilities(): void {
		// Resource requests
		this.linkNetwork = new LinkNetwork(this);
		this.logisticsNetwork = new LogisticsNetwork(this);
		this.transportRequests = new TransportRequestGroup();
		// Register road network
		this.roadLogistics = new RoadLogistics(this);
		// "Organism Abathur with you."
		this.abathur = new Abathur(this);
	}

	/* Instantiate and associate virtual colony components to group similar structures together */
	private registerHiveClusters(): void {
		this.hiveClusters = [];
		// Instantiate the command center if there is storage in the room - this must be done first!
		if (this.stage > ColonyStage.Larva) {
			this.commandCenter = new CommandCenter(this, this.storage!);
		}
		// Instantiate the hatchery - the incubation directive assignes hatchery to incubator's hatchery if none exists
		if (this.spawns[0]) {
			this.hatchery = new Hatchery(this, this.spawns[0]);
		}
		// Instantiate evolution chamber once there are three labs all in range 2 of each other
		if (this.terminal && _.filter(this.labs, lab =>
			_.all(this.labs, otherLab => lab.pos.inRangeTo(otherLab, 2))).length >= 3) {
			this.evolutionChamber = new EvolutionChamber(this, this.terminal);
		}
		// Instantiate the upgradeSite
		this.upgradeSite = new UpgradeSite(this, this.controller);
		// Instantiate spore crawlers to wrap towers
		// Dropoff links are freestanding links or ones at mining sites
		this.dropoffLinks = _.clone(this.availableLinks);
		// Mining sites is an object of ID's and MiningSites
		let sourceIDs = _.map(this.sources, source => source.ref);
		let miningSites = _.map(this.sources, source => new MiningSite(this, source));
		this.miningSites = _.zipObject(sourceIDs, miningSites);
		// ExtractionSites is an object of ID's and ExtractionSites
		let extractorIDs = _.map(this.extractors, extractor => extractor.ref);
		let extractionSites = _.map(this.extractors, extractor => new ExtractionSite(this, extractor));
		this.extractionSites = _.zipObject(extractorIDs, extractionSites);
		// Reverse the hive clusters for correct order for init() and run()
		this.hiveClusters.reverse();
	}



	// /* Refreshes portions of the colony state between ticks without rebuilding the entire object */
	// rebuild(): void {
	// 	this.flags = []; 			// Reset flags list since Overmind will re-instantiate directives
	// 	this.overseer.rebuild();	// Rebuild the overseer, which rebuilds overlords
	// }
	getCreepsByRole(roleName: string): Creep[] {
		return this.creepsByRole[roleName] || [];
	}

	/* Summarizes the total of all resources in colony store structures, labs, and some creeps */
	private getAllAssets(verbose = false): { [resourceType: string]: number } {
		// if (this.name == 'E8S45') verbose = true; // 18863
		// Include storage structures and manager carry
		let stores = _.map(<StoreStructure[]>_.compact([this.storage, this.terminal]), s => s.store);
		let creepCarriesToInclude = _.map(this.creeps, creep => creep.carry) as { [resourceType: string]: number }[];
		let allAssets: { [resourceType: string]: number } = mergeSum([...stores, ...creepCarriesToInclude]);
		// Include lab amounts
		for (let lab of this.labs) {
			if (lab.mineralType) {
				if (!allAssets[lab.mineralType]) {
					allAssets[lab.mineralType] = 0;
				}
				allAssets[lab.mineralType] += lab.mineralAmount;
			}
		}
		if (verbose) log.debug(`${this.room.print} assets: ` + JSON.stringify(allAssets));
		return allAssets;
	}

	init(): void {
		this.overseer.init();												// Initialize overseer before hive clusters
		_.forEach(this.hiveClusters, hiveCluster => hiveCluster.init());	// Initialize each hive cluster
		this.roadLogistics.init();											// Initialize the road network
		this.linkNetwork.init();											// Initialize link network
	}

	run(): void {
		this.overseer.run();												// Run overseer before hive clusters
		_.forEach(this.hiveClusters, hiveCluster => hiveCluster.run());		// Run each hive cluster
		this.linkNetwork.run();												// Run the link network
		this.roadLogistics.run();											// Run the road network
	}
}