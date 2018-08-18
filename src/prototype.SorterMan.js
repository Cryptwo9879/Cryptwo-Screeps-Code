if (!(SorterMan)) {
  var SorterMan = Object.create(Object);
}

SorterMan.prototype.sortComplete = function() {
  if (!this.memory.sortComplete || this.memory.sortComplete == false) {
    return false
  }
  else {
    return true;
  }
}
SorterMan.prototype.reCheckRooms = function() {

}
SorterMan.prototype.sortRoom = function() {
  if (!this.memory.sortComplete) {
    this.memory.sortComplete = false;
  }
  if(!(this.isMine())) {
    console.log("Not my room!" + this.name)
    this.memory.sortComplete = true;

    //where s its home room? Saved into memory when flagplaced? or when creeps come? <---
  }
  else if (this.isMine() && !(this.sortComplete())) {
    if (this.controller.level <= 7) {
      if (!(this.memory.isOutpost) || this.memory.isOutpost == false) {
      this.memory.isOutpost = true;
      Memory.Colonies.outpost.spawnRoom = {
        room: this.name
      };
      }
      this.memory.sortComplete = true;
    }
    else if (this.controller.level == 8) {
      if (!(this.memory.isCastle) || this.memory.isCastle == false){
        this.memory.isCastle = true;
        this.memory.isOutpost = false
        Memory.Colonies.Castles.spawnRoom = this.name;
      }
      this.memory.sortComplete = true;
    }
  }
}

SorterMan.prototype.checkRoadToSource = function(){
  for(let i in this.memory.sourceNodes){
    if(!this.memory.sourceNodes[i].toBuild.Road) {
      return
    }
    else if (this.memory.sourceNodes[i].toBuild.Road) {
      let spawn = this.find(FIND_MY_SPAWNS);
      let ObjectIDA = spawn[0].id;
      let ObjectIDB = this.memory.sourceNodes[i].id
      this.createRoadway(ObjectIDA, ObjectIDB)
    }
    else {
    console.log("Hit else in SorterMan checkRoadToSource")
    }
  }
}

SorterMan.prototype.createRoadToController = function() {
  if (!this.memory.structureIDs.controller.toBuild.Road) {

  } else {
    let spawn = this.find(FIND_MY_SPAWNS);
    let ObjectIDA = spawn[0].id;
    let ObjectIDB = this.controller.id
    if (this.memory.structureIDs.controller.toBuild.Road == true) {
    this.createRoadway(ObjectIDA, ObjectIDB)
    }
  }
}

/** @function ConvertsToLocation
    @param {string} RoomName
    @return {X:"", Y:""}
*/
Room.prototype.getRoomLocation = function (roomName) {
      let temp1 = [];
      let thisString = roomName.split("");
      for (let i = 0; i < thisString.length; i++) {
        let result = thisString[i];
        if(result == "W" || result == "S") {
          temp1.push("-")
        }
        else if (result == "E" || result == "N") {
          temp1.push("+")
        }
        else {
          temp1.push(result)
        }
      }
      let temp2 = temp1.join("");
      let outX = temp2.slice(0,3);
      let outY = temp2.slice(3,6)
      var output = {
        x: outX,
        y: outY
      }
      return output;
}