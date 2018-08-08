require('nameGen')

var minRoles = {
  Harvester: "2",
  Upgrader: "1",
  Builder: "1"
}

StructureSpawn.prototype.bodyBuilder = function(role, energy) {
  let outputArray = [];
  let numberOfParts = Math.floor(energy / 200);
  var body = [];

  for (let i = 0; i < numberOfParts; i++) {
    outputArray.push(WORK);
  }
  for (let i = 0; i < numberOfParts; i++) {
    outputArray.push(CARRY);
  }
  for (let i = 0; i < numberOfParts; i++) {
    outputArray.push(MOVE);
  }
  return outputArray
}

StructureSpawn.prototype.newCreepDebug = function (creepRole) {



  if (this.spawning != null) {
    let name = this.spawning.name;
    let timeLeft = this.spawning.remainingTime;
    //let creepRole = name.memory.role;

    console.log(name + " only has " + timeLeft);
    console.log("Role" + creepRole)
  }
  else if (this.spawning == null) {

    //spawning logic to be implimented here. Well reference to it to clean it out of main.


    if (Game.time % 5 === 0){
    console.log("============")
    console.log("Not Spawning")
    }
  }
};


StructureSpawn.prototype.spawnNewCreep = function(bodyParts, role) {
  var name = this.nameGen();

  return this.spawnCreep(bodyParts, name, {
    memory: {
      role: role,
      working: false
    }
  });
};

StructureSpawn.prototype.findRoleNeeded = function(energy) {
  // Find amount of different roles alive currently
  var numberOfHarvesters = _.sum(Game.creeps, (c) => c.memory.role == 'harvester');
  var numberOfUpgraders = _.sum(Game.creeps, (c) => c.memory.role == 'upgrader');
  var numberOfBuilders = _.sum(Game.creeps, (c) => c.memory.role == 'builder');
    // Spawn top to bottom what roles need to meet minimum requirements
var canSpawn = false;
  if (numberOfHarvesters <= minRoles.Harvester) {
    bodyParts = this.bodyBuilder("harvester", energy);
    role = "harvester"
    canSpawn = true;
  } else if (numberOfUpgraders <= minRoles.Upgrader) {
    bodyParts = this.bodyBuilder("upgrader", energy);
    role = "upgrader"
      canSpawn = true;
  } else if (numberOfBuilders <= minRoles.Builder) {
    bodyParts = this.bodyBuilder("builder", energy);
    role = "builder"
      canSpawn = true;
  }
  if(canSpawn == true){
    this.spawnNewCreep(bodyParts, role);
  }
};
