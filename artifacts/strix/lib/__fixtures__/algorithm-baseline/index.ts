import type { AlgorithmEvaluationFixture } from "../../evaluation/types";
import { hardBrakingFixture } from "./negative/hardBraking";
import { doorSlamFixture } from "./negative/doorSlam";
import { phoneDropFixture } from "./negative/phoneDrop";
import { singlePotholeFixture } from "./negative/singlePothole";
import { smoothDriveFixture } from "./negative/smoothDrive";
import { frontCrashFixture } from "./positive/frontCrash";
import { rearCrashFixture } from "./positive/rearCrash";
import { sideCrashFixture } from "./positive/sideCrash";

export const algorithmBaselineFixtures: readonly AlgorithmEvaluationFixture[] = [
  frontCrashFixture,
  rearCrashFixture,
  sideCrashFixture,
  smoothDriveFixture,
  hardBrakingFixture,
  singlePotholeFixture,
  phoneDropFixture,
  doorSlamFixture,
];
