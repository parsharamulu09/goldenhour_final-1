import { Vitals, Severity } from "../types";

/**
 * Simple fallback AI analysis (NO API required)
 */
export const analyzeMedicalCase = async (
  vitals: Vitals,
  notes: string,
  severity: Severity
): Promise<string> => {

  let condition = "General trauma";
  let risk = severity;
  let preparation = "Emergency room preparation";
  let action = "Standard triage and monitoring";

  if (vitals.spo2 < 90) {
    condition = "Respiratory distress (Low oxygen)";
    preparation = "Prepare oxygen support and ICU";
    action = "Provide oxygen immediately";
  }

  if (vitals.pulse > 120) {
    condition = "Possible shock or severe trauma";
    preparation = "Trauma team standby";
    action = "Stabilize blood circulation";
  }

  if (vitals.temp > 38) {
    condition = "Possible infection or fever";
    preparation = "Isolation and diagnostics";
    action = "Administer fluids and monitor";
  }

  return `
Possible Condition: ${condition}

Risk Level: ${risk}

Hospital Preparation Needed:
${preparation}

Immediate Actions:
${action}
`;
};


/**
 * Police identity helper
 */
export const getPoliceIdentityClues = async (
  description: string
): Promise<string> => {

  return `
Possible Identification Clues:

• Estimated age from appearance
• Gender indicators
• Check clothing and belongings
• Look for tattoos or scars
• Check nearby vehicle details
`;
};