import { CORE_LIABILITY_RULES, type LiabilityRule } from "./rules/coreRules";

export function findLiabilityRule(scenarioCode: string): LiabilityRule {
  return CORE_LIABILITY_RULES.find((rule) => rule.scenarioPatterns.some((pattern) => pattern.test(scenarioCode)))
    ?? CORE_LIABILITY_RULES[CORE_LIABILITY_RULES.length - 1];
}

export { CORE_LIABILITY_RULES };
export type { LiabilityRule };
