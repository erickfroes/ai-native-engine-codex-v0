import { createLoopSchedule } from './loop-scheduler.mjs';
import { getSystemPhase, getSystemPhaseRegistryV1 } from '../systems/system-phase-registry.mjs';

export function createPhasedLoopSchedulePreview(sceneData, options = {}) {
  const schedule = createLoopSchedule(sceneData, options);
  const phaseRegistry = getSystemPhaseRegistryV1();

  return {
    phasedSchedulerPreviewVersion: 1,
    scene: schedule.scene,
    ticks: schedule.ticks,
    seed: schedule.seed,
    phases: phaseRegistry.phases,
    systemsPerTick: schedule.systemsPerTick.map((tickPlan) => ({
      tick: tickPlan.tick,
      systems: tickPlan.systems.map((system) => ({
        ...system,
        ...(getSystemPhase(system.name) === undefined ? {} : { phase: getSystemPhase(system.name) })
      }))
    }))
  };
}

