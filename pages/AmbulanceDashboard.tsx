import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  EmergencyCase,
  Severity,
  Vitals,
  PatientIdentity,
  Evidence,
  MedicalCondition,
  ConditionState,
  ReadinessStatus,
} from "../types";
import { analyzeMedicalCase } from "../services/gemini";
import { mockStorage } from "../services/supabase";
import { persistEmergencyCase } from "../services/emergencyCaseSync";
import {
  parseMedicalSpeech,
  summarizeParsedFields,
  type ParsedMedicalFields,
} from "../services/parseMedicalSpeech";
import { useVoiceInput } from "../hooks/useVoiceInput";
import GlobalVoiceAssistantBar from "../components/GlobalVoiceAssistantBar";
import {
  Heart,
  Thermometer,
  Wind,
  Activity,
  Zap,
  Loader2,
  Hospital,
  MapPin,
  Camera,
  Upload,
  CheckCircle,
  Shield,
  UserX,
  Info,
  Send,
  FileText,
  ArrowRight,
  AlertCircle,
  RefreshCcw,
} from "lucide-react";

interface Props {
  activeCase: EmergencyCase;
  updateCase: (updates: Partial<EmergencyCase>, targetId?: string) => void;
}

const AmbulanceDashboard: React.FC<Props> = ({ activeCase, updateCase }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<"medical" | "identity">("medical");
  const [uploading, setUploading] = useState<keyof Evidence | null>(null);

  // Isolated Local Form States for state reset behavior
  const [medicalForm, setMedicalForm] = useState<MedicalCondition>({
    state: "",
    injuries: "",
    symptoms: "",
    treatment: "",
    medicalSentToHospital: false,
  });

  const [identityForm, setIdentityForm] = useState<PatientIdentity>({
    name: "",
    bloodGroup: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    relationship: "",
    idSource: "ID Card",
  });

  const [accidentLoc, setAccidentLoc] = useState("");
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: "success" | "info";
  } | null>(null);

  /** Global voice: draft fills local forms; parent state updates only on Confirm */
  const [pendingVoice, setPendingVoice] = useState<{
    raw: string;
    parsed: ParsedMedicalFields;
  } | null>(null);
  /** Local overlay for vitals after voice parse (not synced until Confirm) */
  const [vitalsVoiceDraft, setVitalsVoiceDraft] = useState<Vitals | null>(null);

  const displayVitals = vitalsVoiceDraft ?? activeCase.vitals;

  const applyParsedToDraft = useCallback(
    (parsed: ParsedMedicalFields) => {
      setMedicalForm((prev) => ({
        ...prev,
        ...(parsed.symptoms !== undefined && { symptoms: parsed.symptoms }),
        ...(parsed.injuries !== undefined && { injuries: parsed.injuries }),
        ...(parsed.treatment !== undefined && { treatment: parsed.treatment }),
        ...(parsed.conditionState !== undefined && {
          state: parsed.conditionState,
        }),
      }));
      setIdentityForm((prev) => ({
        ...prev,
        ...(parsed.patientName !== undefined && { name: parsed.patientName }),
        ...(parsed.bloodGroup !== undefined && {
          bloodGroup: parsed.bloodGroup,
        }),
      }));
      setVitalsVoiceDraft((prev) => {
        const base = { ...(prev ?? activeCase.vitals) };
        let changed = false;
        if (parsed.pulse !== undefined) {
          base.pulse = parsed.pulse;
          changed = true;
        }
        if (parsed.bp_sys !== undefined) {
          base.bp_sys = parsed.bp_sys;
          changed = true;
        }
        if (parsed.bp_dia !== undefined) {
          base.bp_dia = parsed.bp_dia;
          changed = true;
        }
        if (parsed.spo2 !== undefined) {
          base.spo2 = parsed.spo2;
          changed = true;
        }
        if (parsed.temp !== undefined) {
          base.temp = parsed.temp;
          changed = true;
        }
        if (!changed) return prev;
        base.lastUpdated = new Date().toISOString();
        return base;
      });
    },
    [activeCase.vitals],
  );

  const onSpeechFinal = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      console.log("Transcript:", trimmed);
      const parsed = parseMedicalSpeech(trimmed);
      console.log("Parsed:", parsed);
      applyParsedToDraft(parsed);
      setPendingVoice({ raw: trimmed, parsed });
    },
    [applyParsedToDraft],
  );

  const voice = useVoiceInput(onSpeechFinal);

  const applyVoiceConfirmation = () => {
    if (!pendingVoice) return;

    const nextIdentity: PatientIdentity = {
      ...activeCase.identity,
      ...identityForm,
    };
    const nextMedical: MedicalCondition = {
      ...activeCase.medicalCondition,
      ...medicalForm,
    };
    const nextVitals: Vitals = {
      ...(vitalsVoiceDraft ?? activeCase.vitals),
      lastUpdated: new Date().toISOString(),
    };

    const mergedCase: EmergencyCase = {
      ...activeCase,
      identity: nextIdentity,
      medicalCondition: { ...nextMedical },
      vitals: nextVitals,
      cardiacArrestAlert: nextVitals.pulse === 0,
    };

    updateCase({
      identity: nextIdentity,
      medicalCondition: { ...nextMedical },
      vitals: nextVitals,
      cardiacArrestAlert: mergedCase.cardiacArrestAlert,
    });

    void persistEmergencyCase(mergedCase);
    setPendingVoice(null);
    setVitalsVoiceDraft(null);
  };

  const cancelVoiceConfirmation = () => {
    setPendingVoice(null);
  };

  // Isolation & Reset logic when active context changes (New Patient button support)
  useEffect(() => {
    setMedicalForm({
      state: "",
      injuries: "",
      symptoms: "",
      treatment: "",
      medicalSentToHospital: false,
    });
    setIdentityForm({
      name: "",
      bloodGroup: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      relationship: "",
      idSource: "ID Card",
    });
    setAccidentLoc("");
    setStatusMessage(null);
    setActiveTab("medical");
    setPendingVoice(null);
    setVitalsVoiceDraft(null);
  }, [activeCase.id]);

  const fileInputs = {
    patientPhoto: useRef<HTMLInputElement>(null),
    vehiclePhoto: useRef<HTMLInputElement>(null),
    scenePhoto: useRef<HTMLInputElement>(null),
  };

  const handleEtaChange = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      updateCase({ eta: numValue });
    }
  };

  const handleVitalChange = (key: keyof Vitals, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    const lastUpdated = new Date().toISOString();
    if (vitalsVoiceDraft !== null) {
      setVitalsVoiceDraft({
        ...vitalsVoiceDraft,
        [key]: numValue,
        lastUpdated,
      });
    } else {
      const vitals: Vitals = {
        ...activeCase.vitals,
        [key]: numValue,
        lastUpdated,
      };
      const patch: Partial<EmergencyCase> = { vitals };
      if (key === "pulse") {
        patch.cardiacArrestAlert = numValue === 0;
      }
      updateCase(patch);
    }
  };

  const sendMedicalToHospital = () => {
    if (!activeCase.eta || activeCase.eta <= 0) {
      alert("ETA must be provided before dispatching to hospital.");
      return;
    }

    const mergedClinical: EmergencyCase = {
      ...activeCase,
      identity: { ...activeCase.identity, ...identityForm },
      medicalCondition: {
        ...medicalForm,
        lastUpdatedByEMS: new Date().toISOString(),
        medicalSentToHospital: true,
      },
      severity: activeCase.severity,
      eta: activeCase.eta,
    };

    updateCase({
      identity: mergedClinical.identity,
      medicalCondition: mergedClinical.medicalCondition,
      severity: mergedClinical.severity,
      eta: mergedClinical.eta,
    });

    void persistEmergencyCase(mergedClinical);

    // 🚑 TWILIO SMS ALERT
    fetch("http://localhost:5000/send-alert", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: "+917993711408",
        message: `
  🚑 GOLDEN HOUR ALERT
  
  Case ID: ${activeCase.id}
  Severity: ${activeCase.severity}
  
  Pulse: ${activeCase.vitals.pulse}
  SpO2: ${activeCase.vitals.spo2}
  
  ETA: ${activeCase.eta} minutes
  `,
      }),
    });

    setStatusMessage({
      text: "Clinical Data Sent to Hospital",
      type: "success",
    });

    setTimeout(() => setStatusMessage(null), 3000);
  };

  const sendToPolice = () => {
    if (!accidentLoc) {
      alert(
        "Verification Protocol: Accident Location is mandatory for Police sync.",
      );
      return;
    }
    // Sync Identity + Accident to Police Node
    updateCase({
      identity: { ...activeCase.identity, ...identityForm },
      accidentDetails: {
        ...activeCase.accidentDetails,
        accidentLocation: accidentLoc,
        identitySentToPolice: true,
      },
      isUnknown: !identityForm.name,
    });
    setStatusMessage({
      text: "Identity & Accident Node Synced",
      type: "success",
    });

    // RESET Identity Form State
    setIdentityForm({
      name: "",
      bloodGroup: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      relationship: "",
      idSource: "ID Card",
    });
    setAccidentLoc("");

    setTimeout(() => setStatusMessage(null), 3000);
  };

  const onFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: keyof Evidence,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(type);
      try {
        const url = await mockStorage.uploadFile(file);
        updateCase({ evidence: { ...activeCase.evidence, [type]: url } });
      } catch (err) {
        console.error("Asset Sync Error", err);
      } finally {
        setUploading(null);
      }
    }
  };

  const triggerGeminiAnalysis = async () => {
    setAnalyzing(true);
    const summary = await analyzeMedicalCase(
      displayVitals,
      medicalForm.injuries || "Trauma",
      activeCase.severity,
    );
    updateCase({ geminiSummary: summary });
    setAnalyzing(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-8 animate-in fade-in duration-500 pb-24 relative z-10">
      {statusMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-4 border animate-in slide-in-from-bottom-8 bg-emerald-600 border-emerald-500 text-white">
          <CheckCircle size={24} />
          <div>
            <span className="font-black uppercase tracking-widest text-[11px] block">
              {statusMessage.text}
            </span>
            <span className="text-[9px] font-bold opacity-70 uppercase tracking-tighter">
              Real-time Node Synchronized
            </span>
          </div>
        </div>
      )}

      {(activeCase.cardiacArrestAlert || vitalsVoiceDraft?.pulse === 0) && (
        <div
          role="alert"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[110] px-6 py-4 rounded-2xl bg-red-600 text-white shadow-2xl border border-red-400 animate-pulse max-w-[95vw] text-center"
        >
          <span className="font-black uppercase tracking-widest text-sm md:text-base">
            CARDIAC ARREST DETECTED
          </span>
          {pendingVoice && (
            <span className="block text-[10px] font-bold opacity-90 mt-1">
              Confirm voice to sync to hospital
            </span>
          )}
        </div>
      )}

      {pendingVoice && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full p-8 border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-slate-950 uppercase italic tracking-tight">
              Confirm clinical update
            </h3>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Raw transcript
            </p>
            <p className="text-sm text-slate-800 font-medium italic border border-slate-100 rounded-xl p-4 bg-slate-50">
              &ldquo;{pendingVoice.raw}&rdquo;
            </p>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                Detected values
              </p>
              <ul className="space-y-2 text-sm">
                {summarizeParsedFields(pendingVoice.parsed).length === 0 ? (
                  <li className="text-slate-500 italic">
                    No structured fields detected. Review the transcript, edit
                    the form manually, then Confirm to save.
                  </li>
                ) : (
                  summarizeParsedFields(pendingVoice.parsed).map((row) => (
                    <li
                      key={row.label}
                      className="flex justify-between gap-4 border-b border-slate-100 pb-2"
                    >
                      <span className="font-black text-slate-400 uppercase text-[10px] tracking-widest">
                        {row.label}
                      </span>
                      <span className="font-bold text-slate-900 text-right">
                        {row.value}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={applyVoiceConfirmation}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl uppercase text-[11px] tracking-widest shadow-lg"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={cancelVoiceConfirmation}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black py-4 rounded-2xl uppercase text-[11px] tracking-widest"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        type="file"
        className="hidden"
        ref={fileInputs.patientPhoto}
        onChange={(e) => onFileUpload(e, "patientPhoto")}
      />
      <input
        type="file"
        className="hidden"
        ref={fileInputs.vehiclePhoto}
        onChange={(e) => onFileUpload(e, "vehiclePhoto")}
      />
      <input
        type="file"
        className="hidden"
        ref={fileInputs.scenePhoto}
        onChange={(e) => onFileUpload(e, "scenePhoto")}
      />

      {/* Triage Status Bar */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="flex items-center gap-6 z-10">
          <div
            className={`w-20 h-20 rounded-3xl flex flex-col items-center justify-center shadow-2xl transition-colors duration-500 ${activeCase.severity === Severity.CRITICAL ? "bg-red-600 animate-pulse shadow-red-500/20" : activeCase.severity === Severity.MEDIUM ? "bg-amber-600" : "bg-emerald-600"}`}
          >
            <span className="text-[10px] font-black uppercase opacity-70 tracking-tighter">
              ETA
            </span>
            <span className="text-3xl font-black italic">{activeCase.eta}</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black tracking-tighter uppercase italic">
                {activeCase.id}
              </h1>
              <div className="px-2 py-0.5 bg-emerald-500/10 rounded-md text-[8px] font-black uppercase tracking-widest text-emerald-500 border border-emerald-500/20">
                Protocol Active
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold text-slate-400 italic">
              <span className="flex items-center gap-1.5">
                <MapPin size={12} className="text-red-500" /> Inbound Context
              </span>
              <ArrowRight size={12} className="text-slate-700" />
              <span className="flex items-center gap-1.5 text-blue-400 underline underline-offset-4 decoration-blue-400/20">
                {activeCase.hospitalLocation}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 p-1.5 bg-white/5 rounded-2xl z-10 border border-white/10 backdrop-blur-md">
          {[
            { id: "medical", label: "Hospital Node", icon: FileText },
            { id: "identity", label: "Police Node", icon: Shield },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-white text-slate-900 shadow-xl"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {activeTab === "medical" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
              {/* Telemetry Stream */}
              <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-10">
                  <h2 className="text-xl font-black text-slate-950 uppercase italic tracking-tight flex items-center gap-3">
                    <Activity className="text-red-600" size={24} /> Biometric
                    Matrix
                  </h2>
                  <div className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-red-100 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />{" "}
                    Live Telemetry Linked
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
                  {[
                    { label: "Pulse Rate", key: "pulse" as const, unit: "BPM" },
                    { label: "Systolic", key: "bp_sys" as const, unit: "mmHg" },
                    {
                      label: "Diastolic",
                      key: "bp_dia" as const,
                      unit: "mmHg",
                    },
                    { label: "SpO2 Sat", key: "spo2" as const, unit: "%" },
                    { label: "Body Temp", key: "temp" as const, unit: "°C" },
                  ].map((v) => (
                    <div key={v.key} className="space-y-2 group">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 transition-colors group-focus-within:text-red-600 flex items-center gap-1.5">
                        {v.key === "pulse" && (
                          <Heart size={12} className="text-red-500" />
                        )}
                        {v.key === "bp_sys" || v.key === "bp_dia" ? (
                          <Activity size={12} className="text-purple-500" />
                        ) : null}
                        {v.key === "spo2" && (
                          <Wind size={12} className="text-blue-500" />
                        )}
                        {v.key === "temp" && (
                          <Thermometer size={12} className="text-orange-500" />
                        )}
                        {v.label}
                      </label>
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 group-focus-within:bg-white group-focus-within:border-red-400 group-focus-within:shadow-xl transition-all">
                        <input
                          type="number"
                          value={
                            (displayVitals as Record<string, number>)[v.key] ??
                            ""
                          }
                          onChange={(e) =>
                            handleVitalChange(v.key, e.target.value)
                          }
                          className="bg-transparent text-2xl md:text-3xl font-black text-slate-900 w-full outline-none cursor-text select-text"
                          placeholder="0"
                        />
                        <span className="text-[9px] font-black text-slate-400 uppercase">
                          {v.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8">
                  <div className="space-y-2 group max-w-xs">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 italic group-focus-within:text-red-600 transition-colors">
                      ETA to Hospital (minutes)
                    </label>
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 group-focus-within:bg-white group-focus-within:border-red-400 group-focus-within:shadow-xl transition-all">
                      <input
                        type="number"
                        min={0}
                        value={
                          Number.isFinite(activeCase.eta) && activeCase.eta > 0
                            ? activeCase.eta
                            : ""
                        }
                        onChange={(e) => handleEtaChange(e.target.value)}
                        className="bg-transparent text-3xl font-black text-slate-900 w-full outline-none cursor-text select-text"
                        placeholder="0"
                      />
                      <span className="text-[9px] font-black text-slate-400 uppercase">
                        Minutes to arrival
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clinical Condition (EMS to Hospital) */}
              <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-8">
                <h2 className="text-xl font-black text-slate-950 uppercase italic tracking-tight flex items-center gap-3">
                  <FileText className="text-blue-600" size={24} /> Hospital
                  Clinical Update
                </h2>

                <GlobalVoiceAssistantBar
                  supported={voice.supported}
                  isListening={voice.isListening}
                  interimTranscript={voice.interimTranscript}
                  error={voice.error}
                  onStart={() => {
                    voice.stopListening();
                    voice.startListening();
                  }}
                />
                {!voice.supported && (
                  <p className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2">
                    Voice input requires a Chromium-based browser (Chrome or
                    Edge) with microphone access.
                  </p>
                )}

                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      Initial Assessment
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        "STABLE",
                        "CRITICAL",
                        "UNCONSCIOUS",
                        "SEMI-CONSCIOUS",
                      ].map((s) => (
                        <button
                          key={s}
                          onClick={() =>
                            setMedicalForm((prev) => ({
                              ...prev,
                              state: s as ConditionState,
                            }))
                          }
                          className={`py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all border-2 ${medicalForm.state === s ? "bg-blue-600 border-blue-600 text-white shadow-xl scale-[1.02]" : "bg-slate-50 border-slate-50 text-slate-400 hover:border-slate-200"}`}
                        >
                          {s.replace("-", " ")}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 italic">
                        Patient Name (hospital handoff)
                      </label>
                      <input
                        type="text"
                        value={identityForm.name || ""}
                        onChange={(e) =>
                          setIdentityForm((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-bold outline-none cursor-text select-text focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-slate-900"
                        placeholder="Legal name if known..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                        Blood Group
                      </label>
                      <input
                        type="text"
                        value={identityForm.bloodGroup || ""}
                        onChange={(e) =>
                          setIdentityForm((prev) => ({
                            ...prev,
                            bloodGroup: e.target.value,
                          }))
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-bold outline-none uppercase cursor-text select-text focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-slate-900"
                        placeholder="A+ / O- / etc."
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 italic underline underline-offset-4 decoration-blue-500/20">
                        Visible Field Injuries
                      </label>
                      <input
                        type="text"
                        value={medicalForm.injuries}
                        onChange={(e) =>
                          setMedicalForm((prev) => ({
                            ...prev,
                            injuries: e.target.value,
                          }))
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-bold outline-none cursor-text select-text focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-slate-900"
                        placeholder="Trauma signatures, fractures..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 italic underline underline-offset-4 decoration-blue-500/20">
                        Clinical Symptom Log
                      </label>
                      <textarea
                        value={medicalForm.symptoms}
                        onChange={(e) =>
                          setMedicalForm((prev) => ({
                            ...prev,
                            symptoms: e.target.value,
                          }))
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-6 font-bold outline-none h-32 cursor-text select-text focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-slate-900 resize-none"
                        placeholder="Breathing pattern, pain levels, pupil state..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 italic underline underline-offset-4 decoration-blue-500/20">
                        Immediate Field Interventions
                      </label>
                      <textarea
                        value={medicalForm.treatment}
                        onChange={(e) =>
                          setMedicalForm((prev) => ({
                            ...prev,
                            treatment: e.target.value,
                          }))
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-6 font-bold outline-none h-32 cursor-text select-text focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-slate-900 resize-none"
                        placeholder="Oxygen, tourniquet, splinting, IV line..."
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex flex-col gap-4">
                    <button
                      onClick={sendMedicalToHospital}
                      disabled={!medicalForm.state}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white font-black py-6 rounded-3xl flex items-center justify-center gap-4 uppercase text-[11px] tracking-widest shadow-2xl shadow-blue-500/30 transition-all hover:scale-[1.01] active:scale-[0.98]"
                    >
                      <Send size={18} />
                      Send Clinical Condition to Hospital Node
                    </button>

                    <button
                      onClick={triggerGeminiAnalysis}
                      disabled={analyzing}
                      className="w-full bg-slate-950 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest shadow-xl border border-white/5 hover:bg-black active:scale-[0.98]"
                    >
                      {analyzing ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Zap
                          className="text-yellow-400"
                          size={16}
                          fill="currentColor"
                        />
                      )}
                      Sync Gemini Decision Support
                    </button>
                  </div>

                  {activeCase.geminiSummary && (
                    <div className="p-8 bg-slate-50 border border-slate-200 rounded-[2.5rem] italic font-medium text-slate-700 leading-relaxed border-l-[10px] border-l-red-600 animate-in fade-in slide-in-from-left-4 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-6 opacity-[0.03] text-slate-900">
                        <Activity size={80} />
                      </div>
                      <div className="text-[9px] font-black uppercase text-slate-400 mb-3 flex items-center gap-2 not-italic underline underline-offset-4 decoration-red-600/20">
                        <Shield size={12} className="text-red-500" /> AI
                        Clinical Synthesis
                      </div>
                      "{activeCase.geminiSummary}"
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "identity" && (
            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h2 className="text-xl font-black text-slate-950 uppercase italic tracking-tight flex items-center gap-3">
                  <Shield className="text-amber-600" size={24} /> Police
                  Authority Node
                </h2>
                <div className="p-3 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between shadow-sm min-w-[220px]">
                  <div>
                    <span className="text-[8px] font-black text-red-400 uppercase tracking-widest block mb-0.5 italic">
                      Session UID
                    </span>
                    <span className="text-lg font-black text-red-600 font-mono tracking-tighter">
                      {activeCase.identity.temporaryId}
                    </span>
                  </div>
                  <UserX className="text-red-500" size={20} />
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-1 group">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 italic group-focus-within:text-amber-600 transition-colors">
                    Incident Scene Location (Mandatory for Police)
                  </label>
                  <input
                    type="text"
                    required
                    value={accidentLoc}
                    onChange={(e) => setAccidentLoc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black outline-none cursor-text select-text focus:ring-4 focus:ring-amber-500/10 focus:bg-white transition-all text-slate-950"
                    placeholder="Intersection or physical registry node..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-slate-950 uppercase tracking-widest border-b border-slate-200 pb-2 italic underline underline-offset-8">
                      Identity Log (Known)
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 italic">
                          Legal Full Name
                        </label>
                        <input
                          type="text"
                          value={identityForm.name}
                          onChange={(e) =>
                            setIdentityForm((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none cursor-text select-text focus:bg-white transition-all text-slate-950"
                          placeholder="Verified registry name..."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                          Registry Blood Group
                        </label>
                        <input
                          type="text"
                          value={identityForm.bloodGroup}
                          onChange={(e) =>
                            setIdentityForm((prev) => ({
                              ...prev,
                              bloodGroup: e.target.value,
                            }))
                          }
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none uppercase text-slate-950"
                          placeholder="A+ / O- / etc..."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                          POC Secure line
                        </label>
                        <input
                          type="tel"
                          value={identityForm.emergencyContactPhone}
                          onChange={(e) =>
                            setIdentityForm((prev) => ({
                              ...prev,
                              emergencyContactPhone: e.target.value,
                            }))
                          }
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none text-slate-950"
                          placeholder="+1 ..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-slate-950 uppercase tracking-widest border-b border-slate-200 pb-2 italic underline underline-offset-8">
                      Forensic Assets (Unknown)
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        {
                          key: "patientPhoto",
                          label: "Face Scan",
                          icon: Camera,
                        },
                        {
                          key: "vehiclePhoto",
                          label: "Asset Check",
                          icon: Info,
                        },
                        {
                          key: "scenePhoto",
                          label: "Incident Scene",
                          icon: Upload,
                        },
                      ].map((btn) => (
                        <button
                          key={btn.key}
                          onClick={() =>
                            (fileInputs as any)[btn.key].current?.click()
                          }
                          disabled={uploading === btn.key}
                          className={`aspect-square rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all relative group ${activeCase.evidence[btn.key as keyof Evidence] ? "bg-emerald-50 border-emerald-400 text-emerald-600" : "bg-slate-50 border-slate-200 text-slate-400 hover:border-amber-400 hover:bg-white"}`}
                        >
                          {uploading === btn.key ? (
                            <Loader2 className="animate-spin" />
                          ) : activeCase.evidence[btn.key as keyof Evidence] ? (
                            <CheckCircle size={24} />
                          ) : (
                            <btn.icon size={24} strokeWidth={1.5} />
                          )}
                          <span className="text-[9px] font-black uppercase tracking-widest">
                            {btn.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={sendToPolice}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-6 rounded-3xl flex items-center justify-center gap-4 uppercase text-[11px] tracking-widest shadow-2xl shadow-amber-500/30 transition-all active:scale-[0.98]"
                >
                  <Shield size={18} />
                  Authorize Forensic Transmission to Police
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Real-time Monitoring Sidebar */}
        <div className="space-y-8">
          {/* Hospital Readiness Stream (FIX) */}
          <div className="bg-slate-950 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group border border-white/5">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-1000">
              <Hospital size={120} />
            </div>
            <div className="flex items-center gap-3 mb-10 relative z-10">
              <RefreshCcw
                className="text-blue-400 animate-spin-slow"
                size={18}
              />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic underline underline-offset-8">
                Hospital Prep Feed
              </h3>
            </div>
            <div className="space-y-5 relative z-10">
              {[
                { label: "ICU Recovery Unit", key: "icu" },
                { label: "Blood Node Reserve", key: "blood" },
                { label: "Triage Specialists", key: "specialist" },
                { label: "Trauma Bay Active", key: "equipment" },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest"
                >
                  <span className="text-slate-500 italic">{item.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded italic font-bold ${activeCase.readiness[item.key as keyof ReadinessStatus] ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/10" : "bg-red-500/10 text-red-500/60"}`}
                  >
                    {activeCase.readiness[item.key as keyof ReadinessStatus]
                      ? "READY"
                      : "STANDBY"}
                  </span>
                </div>
              ))}
              <div className="pt-6 border-t border-white/5 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50" />
                  <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest leading-none">
                    Matrix Pulse Sync OK
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm pointer-events-auto">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 px-1 flex items-center gap-2 underline underline-offset-8 decoration-red-600/30">
              <Shield size={12} className="text-red-600" /> Triage Selection
            </h3>
            <div className="space-y-4">
              {[Severity.LOW, Severity.MEDIUM, Severity.CRITICAL].map((s) => (
                <button
                  key={s}
                  onClick={() => updateCase({ severity: s })}
                  className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border-2 pointer-events-auto ${activeCase.severity === s ? (s === Severity.CRITICAL ? "bg-red-600 border-red-600 text-white shadow-xl scale-[1.05]" : s === Severity.MEDIUM ? "bg-amber-500 border-amber-500 text-white shadow-xl scale-[1.05]" : "bg-emerald-600 border-emerald-600 text-white shadow-xl scale-[1.05]") : "bg-slate-50 border-slate-50 text-slate-400 hover:border-slate-200"}`}
                >
                  {s} Priority Level
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmbulanceDashboard;
