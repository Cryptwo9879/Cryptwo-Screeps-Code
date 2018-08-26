import { ErrorMapper } from "utils/ErrorMapper";
import { Traveler } from "utils/Traveler";
const profiler = require('screeps-profiler');
// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
profiler.enable();
export const loop = ErrorMapper.wrapLoop(() => {
    profiler.wrap(function() {
    console.log(`Current game tick is ${Game.time}`);

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }
    });
});
