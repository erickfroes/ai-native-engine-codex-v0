import { getSystemRegistryV1 } from './system-registry.mjs';

const SYSTEM_PHASE_REGISTRY_V1 = Object.freeze({
  phaseRegistryVersion: 1,
  phases: Object.freeze([
    Object.freeze({
      name: 'core',
      order: 0,
      description: 'Core loop/tick bookkeeping systems'
    }),
    Object.freeze({
      name: 'input',
      order: 10,
      description: 'Input ingestion and input state systems'
    }),
    Object.freeze({
      name: 'networking',
      order: 20,
      description: 'Networking and replication systems'
    })
  ]),
  systemPhases: Object.freeze([
    Object.freeze({
      system: 'core.loop',
      phase: 'core'
    }),
    Object.freeze({
      system: 'input.keyboard',
      phase: 'input'
    }),
    Object.freeze({
      system: 'networking.replication',
      phase: 'networking'
    })
  ])
});

const SYSTEM_PHASE_BY_NAME = Object.freeze(
  Object.fromEntries(SYSTEM_PHASE_REGISTRY_V1.systemPhases.map((entry) => [entry.system, entry.phase]))
);

export function getSystemPhaseRegistryV1() {
  return SYSTEM_PHASE_REGISTRY_V1;
}

export function getSystemPhase(systemName) {
  return SYSTEM_PHASE_BY_NAME[systemName];
}

export function getKnownSystemPhase(systemName) {
  return SYSTEM_PHASE_BY_NAME[systemName];
}

export function listSystemPhases() {
  return SYSTEM_PHASE_REGISTRY_V1.systemPhases;
}

export function assertSystemHasPhase(systemName) {
  const phase = getKnownSystemPhase(systemName);
  if (phase === undefined) {
    throw new Error(`missing phase for known system: ${systemName}`);
  }
  return phase;
}

export function assertPhaseRegistryIntegrity() {
  const knownSystems = new Set(getSystemRegistryV1().systems.map((system) => system.name));
  for (const systemName of knownSystems) {
    assertSystemHasPhase(systemName);
  }
}

