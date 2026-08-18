import { ImpactStateMachine } from "../impact/impactStateMachine";
import type { ImpactObservation } from "../impact/types";

function observation(
  atMs: number,
  magnitudeG: number,
  options: Partial<Pick<ImpactObservation, "speedKmh" | "gyroPeakDegS" | "engineReady" | "gyroValidationPassed" | "phoneMovementDetected">> & {
    axis?: "x" | "y";
  } = {},
): ImpactObservation {
  const axis = options.axis ?? "x";
  const linearAcceleration = axis === "y"
    ? { x: 0, y: magnitudeG, z: 0 }
    : { x: magnitudeG, y: 0, z: 0 };
  return {
    impact: {
      timestampMs: atMs,
      dtSec: 0.02,
      raw: { x: linearAcceleration.x, y: linearAcceleration.y - 1, z: 0 },
      gravity: { x: 0, y: -1, z: 0 },
      linearAcceleration,
      magnitudeG,
      accelerometerSaturated: false,
      minimumPeakG: null,
    },
    motion: {
      timestampMs: atMs,
      dtSec: 0.02,
      linearAcceleration: { ...linearAcceleration },
      magnitudeG,
    },
    thresholdG: 1.5,
    engineReady: options.engineReady ?? true,
    speedKmh: options.speedKmh ?? 40,
    gyroPeakDegS: options.gyroPeakDegS ?? 20,
    gyroValidationPassed: options.gyroValidationPassed ?? true,
    phoneMovementDetected: options.phoneMovementDetected ?? false,
    dataQualityScore: 90,
  };
}

describe("ImpactStateMachine transition table", () => {
  it("stays IDLE below the threshold", () => {
    const machine = new ImpactStateMachine();
    expect(machine.process(observation(0, 1))).toEqual([]);
    expect(machine.getSnapshot().state).toBe("IDLE");
  });

  it("moves IDLE → CANDIDATE → CONFIRMED for a valid pulse", () => {
    const machine = new ImpactStateMachine();
    expect(machine.process(observation(0, 2)).map((event) => event.to)).toEqual(["CANDIDATE"]);
    expect(machine.process(observation(20, 2.2)).map((event) => event.to)).toEqual(["CONFIRMED"]);
    expect(machine.getSnapshot().incidentId).toBe(1);
  });

  it("moves CANDIDATE → REJECTED when the pulse collapses too early", () => {
    const machine = new ImpactStateMachine();
    machine.process(observation(0, 2));
    const transitions = machine.process(observation(5, 0.2));
    expect(transitions).toHaveLength(1);
    expect(transitions[0]).toMatchObject({ to: "REJECTED", decision: "rejected" });
  });

  it("confirms a strong impact immediately", () => {
    const machine = new ImpactStateMachine();
    const transitions = machine.process(observation(0, 3.2));
    expect(transitions.map((event) => event.decision)).toEqual(["candidate", "confirmed"]);
  });

  it("rejects a strong peak while the phone is being repositioned", () => {
    const machine = new ImpactStateMachine();
    const transitions = machine.process(observation(0, 4, {
      speedKmh: 35,
      gyroPeakDegS: 180,
      phoneMovementDetected: true,
    }));

    expect(transitions.map((event) => event.decision)).toEqual(["candidate", "rejected"]);
    expect(transitions.at(-1)?.reason).toBe("evidence.phone-movement");
  });

  it("rejects a strong stationary phone drop before instant confirmation", () => {
    const machine = new ImpactStateMachine();
    const first = observation(0, 4, { speedKmh: 0, gyroPeakDegS: 220 });
    first.motion.magnitudeG = 0.2;
    const transitions = machine.process(first);

    expect(transitions.map((event) => event.decision)).toEqual(["candidate", "rejected"]);
    expect(transitions.at(-1)?.reason).toBe("evidence.phone-drop");
  });

  it("keeps secondary impacts inside the confirmed incident", () => {
    const machine = new ImpactStateMachine();
    machine.process(observation(0, 3.2));
    machine.process(observation(20, 0.1));
    const secondary = machine.process(observation(100, 2));
    const duplicate = machine.process(observation(120, 2.1));

    expect(secondary[0]).toMatchObject({
      to: "POST_IMPACT",
      decision: "secondary-impact",
      incidentId: 1,
    });
    expect(duplicate).toEqual([]);
    expect(machine.getSnapshot().secondaryImpactCount).toBe(1);
  });

  it("enters COOLDOWN after analysis and ignores new candidates until expiry", () => {
    const machine = new ImpactStateMachine({ cooldownMs: 1000 });
    machine.process(observation(0, 3.2));
    expect(machine.completeAnalysis(100)?.to).toBe("COOLDOWN");
    expect(machine.process(observation(500, 4))).toEqual([]);
    expect(machine.process(observation(1100, 4)).some((event) => event.decision === "confirmed")).toBe(true);
  });

  it.each([
    ["pothole", observation(0, 2, { axis: "y", speedKmh: 35, gyroPeakDegS: 5 }), observation(20, 0.2, { axis: "y", speedKmh: 35, gyroPeakDegS: 5 })],
    ["phone-drop", observation(0, 2.2, { speedKmh: 0, gyroPeakDegS: 220 }), observation(20, 0.2, { speedKmh: 0, gyroPeakDegS: 220 })],
    ["door-slam", observation(0, 2, { speedKmh: 0, gyroPeakDegS: 5 }), observation(20, 0.2, { speedKmh: 0, gyroPeakDegS: 5 })],
  ])("rejects %s evidence", (_kind, first, second) => {
    const machine = new ImpactStateMachine();
    const transitions = [...machine.process(first), ...machine.process(second)];
    const rejection = transitions.find((transition) => transition.decision === "rejected");
    expect(rejection).toMatchObject({ to: "REJECTED", decision: "rejected" });
    expect(rejection?.reason).toMatch(/^evidence\.(pothole|phone-drop|door-slam)$/);
  });
});
