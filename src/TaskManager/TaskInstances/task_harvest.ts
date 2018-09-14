import {Task} from '../Task';
import {isSource} from '../../declarations/typeGuards'

export type harvestTargetType = Source | Mineral;
export const harvestTaskName = 'harvest';

export class TaskHarvest extends Task {

	static taskName = 'harvest';
	target!: harvestTargetType;

	constructor(target: harvestTargetType, options = {} as TaskOptions) {
		super(harvestTaskName, target, options);
	}

	isValidTask() {
		return _.sum(this.creep.carry) < this.creep.carryCapacity;
	}

	isValidTarget() {
		if (isSource(this.target)) {
			return this.target.energy > 0;
		} else {
			return this.target.mineralAmount > 0;
		}
	}

	work() {
		return this.creep.harvest(this.target);
	}
}