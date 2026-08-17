import AsyncStorage from "@react-native-async-storage/async-storage";
import { RESEARCH_CONSENT_VERSION } from "./constants";

export { RESEARCH_CONSENT_VERSION } from "./constants";
const CONSENT_KEY = "@strix_sensor_research_consent_v1";

export interface ResearchConsent {
  enabled: boolean;
  version: typeof RESEARCH_CONSENT_VERSION;
  updatedAt: string;
}

const disabledConsent = (): ResearchConsent => ({
  enabled: false,
  version: RESEARCH_CONSENT_VERSION,
  updatedAt: new Date(0).toISOString(),
});

export async function getResearchConsent(): Promise<ResearchConsent> {
  try {
    const raw = await AsyncStorage.getItem(CONSENT_KEY);
    if (!raw) return disabledConsent();
    const parsed = JSON.parse(raw) as Partial<ResearchConsent>;
    if (
      typeof parsed.enabled !== "boolean"
      || parsed.version !== RESEARCH_CONSENT_VERSION
      || typeof parsed.updatedAt !== "string"
    ) {
      return disabledConsent();
    }
    return parsed as ResearchConsent;
  } catch {
    return disabledConsent();
  }
}

export async function setResearchConsent(enabled: boolean): Promise<ResearchConsent> {
  const consent: ResearchConsent = {
    enabled,
    version: RESEARCH_CONSENT_VERSION,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  return consent;
}

export async function isResearchCollectionEnabled(): Promise<boolean> {
  return (await getResearchConsent()).enabled;
}
