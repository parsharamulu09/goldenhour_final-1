import type { ConditionState } from "../types";

/** Structured fields from spoken clinical text (keyword + regex). */
export interface ParsedMedicalFields {
  patientName?: string;
  bloodGroup?: string;
  symptoms?: string;
  injuries?: string;
  treatment?: string;
  pulse?: number;
  bp_sys?: number;
  bp_dia?: number;
  spo2?: number;
  temp?: number;
  conditionState?: ConditionState;
}

const BLOOD_ABBR = /\b(A|B|O|AB)\s*[+-]\b/gi;

/** "O positive", "a negative", "AB plus" → standard form */
function normalizeBloodGroupSpoken(raw: string): string {
  const t = raw.trim().toLowerCase().replace(/\s+/g, " ");
  const map: Record<string, string> = {
    "o positive": "O+",
    "o negative": "O-",
    "a positive": "A+",
    "a negative": "A-",
    "b positive": "B+",
    "b negative": "B-",
    "ab positive": "AB+",
    "ab negative": "AB-",
    "o pos": "O+",
    "a pos": "A+",
    "b pos": "B+",
    "ab pos": "AB+",
  };
  if (map[t]) return map[t];

  const abbr = raw.match(BLOOD_ABBR);
  if (abbr?.length) return abbr[0].replace(/\s+/g, "").toUpperCase();

  return raw.trim().toUpperCase();
}

function countFilledFields(out: ParsedMedicalFields): number {
  let n = 0;
  if (out.patientName !== undefined) n++;
  if (out.bloodGroup !== undefined) n++;
  if (out.symptoms !== undefined) n++;
  if (out.injuries !== undefined) n++;
  if (out.treatment !== undefined) n++;
  if (out.pulse !== undefined) n++;
  if (out.bp_sys !== undefined) n++;
  if (out.spo2 !== undefined) n++;
  if (out.temp !== undefined) n++;
  if (out.conditionState !== undefined) n++;
  return n;
}

/**
 * Extract patient name: "patient name Kavya", "name is Kavya", "called John Smith"
 */
function extractPatientName(text: string): string | undefined {
  const t = text.trim();
  const pn = t.match(/\bpatient\s+name\s+([^,;]+)/i);
  if (pn) {
    const name = pn[1].trim().replace(/\s+/g, " ");
    if (name.length > 0) return name;
  }
  const nameIs = t.match(/\bname\s+is\s+([^,;]+)/i);
  if (nameIs) {
    const name = nameIs[1].trim().replace(/\s+/g, " ");
    if (name.length > 0) return name;
  }
  const called = t.match(/\bcalled\s+([^,;]+)/i);
  if (called) {
    const name = called[1].trim().replace(/\s+/g, " ");
    if (name.length > 0) return name;
  }
  return undefined;
}

function extractBloodGroup(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (
    !lower.includes("blood group") &&
    !lower.includes("blood type") &&
    !lower.match(BLOOD_ABBR)
  ) {
    return undefined;
  }
  const m = text.match(/\b(?:blood\s+group|blood\s+type)\s+([^,;.]+)/i);
  if (m) return normalizeBloodGroupSpoken(m[1]);
  const abbr = text.match(BLOOD_ABBR);
  if (abbr?.length) return abbr[0].replace(/\s+/g, "").toUpperCase();
  return undefined;
}

/**
 * Maps natural speech into structured EMS fields. Handles multiple clauses in one sentence.
 */
function parseMedicalSpeechStrict(
  input: string,
): Partial<
  Record<
    "patient_name" | "blood_group" | "injuries" | "symptoms" | "treatment",
    string
  >
> {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return {};

  const fields = [
    { key: "patient name", field: "patient_name" as const },
    { key: "blood group", field: "blood_group" as const },
    { key: "visible field injuries", field: "injuries" as const },
    { key: "clinical symptom log", field: "symptoms" as const },
    { key: "immediate field interventions", field: "treatment" as const },
  ];

  const found = fields
    .map((f) => ({ ...f, index: normalized.indexOf(f.key) }))
    .filter((f) => f.index >= 0)
    .sort((a, b) => a.index - b.index);

  if (found.length === 0) return {};

  const out: Partial<
    Record<
      "patient_name" | "blood_group" | "injuries" | "symptoms" | "treatment",
      string
    >
  > = {};
  for (let i = 0; i < found.length; i++) {
    const current = found[i];
    const start = current.index + current.key.length;
    const end = i + 1 < found.length ? found[i + 1].index : normalized.length;
    const slice = input.slice(start, end).trim();
    const value = slice
      .replace(/^[\s:\-]+/, "")
      .replace(/[\s\.,;]+$/, "")
      .trim();

    if (!value) continue;

    if (current.field === "blood_group") {
      out.blood_group = normalizeBloodGroupSpoken(value);
    } else {
      out[current.field] = value;
    }
  }

  return out;
}

export function parseMedicalSpeech(input: string): ParsedMedicalFields {
  const text = input.trim();
  if (!text) return {};

  const lower = text.toLowerCase();
  const out: ParsedMedicalFields = {};

  const strict = parseMedicalSpeechStrict(text);
  if (strict.patient_name) out.patientName = strict.patient_name;
  if (strict.blood_group) out.bloodGroup = strict.blood_group;
  if (strict.injuries) out.injuries = strict.injuries;
  if (strict.symptoms) out.symptoms = strict.symptoms;
  if (strict.treatment) out.treatment = strict.treatment;

  // --- Patient name (fallback if strict didn't capture) ---
  if (out.patientName === undefined) {
    const patientName = extractPatientName(text);
    if (patientName) out.patientName = patientName;
  }

  // --- Blood group (fallback if strict didn't capture) ---
  if (
    out.bloodGroup === undefined &&
    (lower.includes("blood group") ||
      lower.includes("blood type") ||
      text.match(BLOOD_ABBR))
  ) {
    const bg = extractBloodGroup(text);
    if (bg) out.bloodGroup = bg;
  }

  // --- Blood pressure (before pulse, to avoid stealing numbers) ---
  const bpSlash = lower.match(
    /\b(?:bp|blood\s*pressure)\s*(\d+)\s*[/]\s*(\d+)/,
  );
  const bpOver = lower.match(
    /\b(?:bp|blood\s*pressure)\s*(\d+)\s*(?:over)\s*(\d+)/,
  );
  const bpPlain = lower.match(/\b(\d+)\s*(?:over|\/)\s*(\d+)\b/);
  const bpPick = bpSlash || bpOver || bpPlain;
  if (bpPick) {
    const sys = parseInt(bpPick[1], 10);
    const dia = parseInt(bpPick[2], 10);
    if (sys > 40 && sys < 300 && dia > 20 && dia < 200) {
      out.bp_sys = sys;
      out.bp_dia = dia;
    }
  }

  // --- Pulse ---
  const pulseMatch =
    lower.match(/\b(?:pulse|heart\s*rate|hr)\s*(?:is|at|of|=)?\s*(\d+)/) ||
    lower.match(/\bpulse\s+(\d+)/) ||
    lower.match(/(\d+)\s*(?:bpm|beats\s*per\s*minute)/);
  if (pulseMatch) {
    const p = parseInt(pulseMatch[1], 10);
    if (p <= 250) out.pulse = p;
  }

  // --- SpO2 ---
  const spo2Match =
    lower.match(
      /\b(?:spo2|s\s*p\s*o\s*2|oxygen\s*sat(?:uration)?)\s*(?:is|at|of)?\s*(\d+)\s*%?/,
    ) || lower.match(/\bspo2\s*(\d+)/);
  if (spo2Match) out.spo2 = Math.min(100, parseInt(spo2Match[1], 10));

  // --- Temperature (avoid grabbing random numbers) ---
  if (
    lower.includes("temperature") ||
    lower.includes("temp") ||
    lower.includes("degrees")
  ) {
    const tempMatch =
      lower.match(/\b(?:temperature|temp)\s*(?:is|at)?\s*([\d.]+)\s*°?\s*c?/) ||
      lower.match(/\b([\d.]+)\s*degrees?\s*(?:celsius|fahrenheit)?/i);
    if (tempMatch) out.temp = parseFloat(tempMatch[1]);
  }

  // --- Condition ---
  if (lower.includes("unconscious") && !lower.includes("semi"))
    out.conditionState = "UNCONSCIOUS";
  else if (lower.includes("semi") && lower.includes("conscious"))
    out.conditionState = "SEMI-CONSCIOUS";
  else if (lower.includes("stable") && !lower.includes("unstable"))
    out.conditionState = "STABLE";
  else if (lower.includes("critical")) out.conditionState = "CRITICAL";

  // --- Injuries (explicit + common phrases) ---
  if (out.injuries === undefined) {
    const injExplicit = text.match(
      /\b(?:injur(?:y|ies))\s*[:\-]?\s*([^.;,]+)/i,
    );
    if (injExplicit) out.injuries = injExplicit[1].trim();
    if (!out.injuries && /\bhead\s*injury\b/i.test(text))
      out.injuries = "Head injury";
    if (!out.injuries && /\bfracture/i.test(text)) {
      const fr = text.match(/\b(fracture[^,;.]*)/i);
      if (fr) out.injuries = fr[1].trim();
    }
  }

  // --- Symptoms ---
  if (out.symptoms === undefined) {
    const symExplicit = text.match(/\b(?:symptom(?:s)?)\s*[:\-]?\s*([^.;,]+)/i);
    if (symExplicit) out.symptoms = symExplicit[1].trim();
    if (!out.symptoms && /\bheavy\s*bleeding\b/i.test(text))
      out.symptoms = "Heavy bleeding";
    if (
      !out.symptoms &&
      /bleed|bleeding/i.test(text) &&
      !lower.includes("given")
    ) {
      const bleed = lower.match(
        /(heavy\s*bleeding|internal\s*bleeding|bleeding)/,
      );
      if (bleed)
        out.symptoms = bleed[1].replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }

  // --- Treatment: "given oxygen" ---
  if (out.treatment === undefined) {
    let trMatch = text.match(
      /\b(?:treatment|intervention)\s*[:\-]?\s*([^.;,]+)/i,
    );
    if (trMatch) out.treatment = trMatch[1].trim();
    if (
      !out.treatment &&
      (lower.includes("given") || lower.includes("administered"))
    ) {
      const given = lower.match(/(?:given|administered)\s+([^.,;]+)/);
      if (given) {
        const g = given[1].trim();
        if (/oxygen|o2/.test(g)) out.treatment = "Oxygen";
        else out.treatment = g.replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }
  }

  // --- Fallback: no structured keywords → default to symptoms ---
  if (countFilledFields(out) === 0) {
    out.symptoms = text;
  }

  return out;
}

export function summarizeParsedFields(
  p: ParsedMedicalFields,
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (p.patientName !== undefined)
    rows.push({ label: "Patient Name", value: p.patientName });
  if (p.bloodGroup !== undefined)
    rows.push({ label: "Blood Group", value: p.bloodGroup });
  if (p.conditionState !== undefined)
    rows.push({
      label: "Condition",
      value: p.conditionState.replace(/-/g, " "),
    });
  if (p.pulse !== undefined)
    rows.push({ label: "Pulse", value: `${p.pulse} BPM` });
  if (p.bp_sys !== undefined) {
    rows.push({
      label: "Blood Pressure",
      value:
        p.bp_dia !== undefined ? `${p.bp_sys}/${p.bp_dia} mmHg` : `${p.bp_sys}`,
    });
  }
  if (p.spo2 !== undefined) rows.push({ label: "SpO2", value: `${p.spo2}%` });
  if (p.temp !== undefined)
    rows.push({ label: "Temperature", value: `${p.temp} °C` });
  if (p.symptoms !== undefined)
    rows.push({ label: "Symptoms", value: p.symptoms });
  if (p.injuries !== undefined)
    rows.push({ label: "Injuries", value: p.injuries });
  if (p.treatment !== undefined)
    rows.push({ label: "Treatment", value: p.treatment });
  return rows;
}
