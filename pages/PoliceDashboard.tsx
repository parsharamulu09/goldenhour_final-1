import React, { useState, useEffect } from "react";
import { EmergencyCase, Severity, PatientIdentity } from "../types";
// Fixed: Added missing 'Phone' icon to imports
import {
  Shield,
  Camera,
  UserX,
  UserCheck,
  AlertTriangle,
  Loader2,
  Info,
  MapPin,
  Hospital,
  User,
  Zap,
  CheckCircle,
  Database,
  Maximize2,
  ExternalLink,
  Scale,
  FileBadge,
  UserCheck2,
  FileText,
  ArrowRight,
  Clock,
  Phone,
  Download,
} from "lucide-react";
import { getPoliceIdentityClues } from "../services/gemini";
import ImageModal from "../components/ImageModal";
import { jsPDF } from "jspdf";

interface Props {
  activeCase: EmergencyCase;
  updateCase: (updates: Partial<EmergencyCase>, targetId?: string) => void;
}

const PoliceDashboard: React.FC<Props> = ({ activeCase, updateCase }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [clues, setClues] = useState<string | null>(null);
  const [authorizing, setAuthorizing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{
    src: string;
    title: string;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: "success" | "info";
  } | null>(null);

  // Local state for verification form
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
    address: "",
    govIdType: "Aadhar",
    bloodGroup: "",
    phoneNumber: "",
    vehicleNumber: "",
    caseReference: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });

  const [policeNotes, setPoliceNotes] = useState("");

  // Sync / Reset local state when active context UID changes
  useEffect(() => {
    setFormData({
      name: activeCase.identity.name || "",
      age: activeCase.identity.age || "",
      gender: activeCase.identity.gender || "",
      address: activeCase.identity.address || "",
      govIdType: activeCase.identity.govIdType || "Aadhar",
      bloodGroup: activeCase.identity.bloodGroup || "",
      phoneNumber: activeCase.identity.emergencyContactPhone || "",
      vehicleNumber: activeCase.identity.vehicleNumber || "",
      caseReference: activeCase.identity.caseReference || "",
      emergencyContactName: activeCase.identity.emergencyContactName || "",
      emergencyContactPhone: activeCase.identity.emergencyContactPhone || "",
    });
    setPoliceNotes("");
    setClues(null);
    setStatusMessage(null);
  }, [activeCase.id]);

  const handleInputChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const triggerClueSearch = async () => {
    setAnalyzing(true);
    const searchContext = `Origin: ${activeCase.accidentDetails.accidentLocation}. Physical Notes: ${activeCase.description || "N/A"}. Known Data: ${JSON.stringify(formData)}`;
    const result = await getPoliceIdentityClues(searchContext);
    setClues(result);
    setAnalyzing(false);
  };

  const handleVerifyIdentity = () => {
    if (!formData.name) {
      alert("Authorization Protocol Failure: Legal Full Name is mandatory.");
      return;
    }
    setAuthorizing(true);

    // Simulate realtime sync
    setTimeout(() => {
      updateCase({
        identity: {
          ...activeCase.identity,
          ...formData,
          emergencyContactPhone:
            formData.phoneNumber || activeCase.identity.emergencyContactPhone,
          bloodGroup: formData.bloodGroup || activeCase.identity.bloodGroup,
        },
        isUnknown: false,
        description: policeNotes
          ? `${activeCase.description || ""}\n[AUTH_LOG]: ${policeNotes}`
          : activeCase.description,
      });
      setAuthorizing(false);
      setStatusMessage({
        text: "Identity Authorized & Hospital Matrix Synced",
        type: "success",
      });
      // Reset verification specific fields
      setFormData((prev) => ({ ...prev, caseReference: "" }));
      setPoliceNotes("");
      setTimeout(() => setStatusMessage(null), 4000);
    }, 1500);
  };

  const handleDownloadAuthorizationReport = () => {
    const doc = new jsPDF();
    const lineHeight = 8;
    let y = 20;

    doc.setFontSize(18);
    doc.text("Official Authorization Matrix", 14, y);
    y += lineHeight + 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, 196, y);
    y += lineHeight + 6;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Patient Name", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(
      formData.name || activeCase.identity.name || "—",
      14,
      y + lineHeight,
    );
    y += lineHeight * 2 + 4;

    doc.setFont("helvetica", "bold");
    doc.text("Age", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(
      formData.age || activeCase.identity.age || "—",
      14,
      y + lineHeight,
    );
    y += lineHeight * 2 + 2;

    doc.setFont("helvetica", "bold");
    doc.text("Gender", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(
      formData.gender || activeCase.identity.gender || "—",
      14,
      y + lineHeight,
    );
    y += lineHeight * 2 + 2;

    doc.setFont("helvetica", "bold");
    doc.text("Address", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(
      formData.address || activeCase.identity.address || "—",
      14,
      y + lineHeight,
    );
    y += lineHeight * 2 + 4;

    doc.setFont("helvetica", "bold");
    doc.text("Blood Group", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(
      formData.bloodGroup || activeCase.identity.bloodGroup || "—",
      14,
      y + lineHeight,
    );
    y += lineHeight * 2 + 2;

    doc.setFont("helvetica", "bold");
    doc.text("Phone Number", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(
      formData.phoneNumber || activeCase.identity.emergencyContactPhone || "—",
      14,
      y + lineHeight,
    );
    y += lineHeight * 2 + 4;

    doc.setFont("helvetica", "bold");
    doc.text("Government ID Type", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(
      formData.govIdType || activeCase.identity.govIdType || "—",
      14,
      y + lineHeight,
    );
    y += lineHeight * 2 + 2;

    doc.setFont("helvetica", "bold");
    doc.text("Vehicle Number", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(
      formData.vehicleNumber || activeCase.identity.vehicleNumber || "—",
      14,
      y + lineHeight,
    );
    y += lineHeight * 2 + 2;

    doc.setFont("helvetica", "bold");
    doc.text("Case Reference", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(
      formData.caseReference || activeCase.identity.caseReference || "—",
      14,
      y + lineHeight,
    );
    y += lineHeight * 2 + 6;

    doc.setFont("helvetica", "bold");
    doc.text("Police Verification Status", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(
      activeCase.identity.isPoliceVerified ? "Verified" : "Pending",
      14,
      y + lineHeight,
    );
    y += lineHeight * 2 + 2;

    doc.setFont("helvetica", "bold");
    doc.text("Timestamp", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(new Date().toLocaleString(), 14, y + lineHeight);

    doc.save(`authorization_report_${activeCase.id}.pdf`);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-10 animate-in fade-in duration-700 pb-24 relative z-10">
      {statusMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-10 py-6 rounded-[2.5rem] shadow-2xl flex items-center gap-5 border animate-in slide-in-from-bottom-8 bg-emerald-600 border-emerald-500 text-white">
          <div className="p-3 bg-white/10 rounded-2xl">
            <CheckCircle size={28} />
          </div>
          <div>
            <span className="font-black uppercase tracking-widest text-xs block">
              {statusMessage.text}
            </span>
            <span className="text-[10px] font-bold opacity-70 uppercase italic tracking-tight">
              Authority handshake confirmed
            </span>
          </div>
        </div>
      )}

      {selectedPhoto && (
        <ImageModal
          src={selectedPhoto.src}
          title={selectedPhoto.title}
          onClose={() => setSelectedPhoto(null)}
        />
      )}

      {/* Police Command Header */}
      <div className="bg-slate-950 rounded-[3.5rem] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-10 border border-slate-800">
        <div className="absolute top-0 right-0 p-20 opacity-[0.02] pointer-events-none scale-150">
          <Shield size={400} />
        </div>
        <div className="flex items-center gap-8 z-10">
          <div className="p-8 bg-amber-600 rounded-[2.5rem] shadow-2xl shadow-amber-900/40">
            <Shield size={48} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic leading-none mb-4 italic">
              Forensic <span className="text-amber-500">Terminal</span>
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-slate-500 font-black text-[10px] uppercase tracking-widest italic">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />{" "}
                Secure Node Registry
              </span>
              <span className="w-1 h-1 bg-slate-800 rounded-full" />
              <span className="flex items-center gap-2 text-slate-300 italic underline underline-offset-4 decoration-slate-700">
                Protocol: {activeCase.id}
              </span>
            </div>
          </div>
        </div>
        <div className="z-10 text-right bg-white/5 p-10 rounded-[2.5rem] border border-white/5 backdrop-blur-xl min-w-[280px]">
          <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3 px-1 italic">
            Authority Authorization
          </div>
          <div
            className={`text-4xl font-black uppercase tracking-tighter italic ${activeCase.isUnknown ? "text-amber-500" : "text-emerald-500"}`}
          >
            {activeCase.isUnknown ? "Registry Search" : "Authorized"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        <div className="lg:col-span-2 space-y-12">
          {/* 1. Incident Details Section */}
          <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:scale-125 transition-transform duration-1000">
              <MapPin size={120} />
            </div>
            <div className="flex items-center justify-between mb-10 relative z-10 border-b border-white/5 pb-6">
              <h2 className="text-xl font-black uppercase italic tracking-widest flex items-center gap-4">
                <Info className="text-amber-500" size={24} /> Incident Details
              </h2>
              <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest italic bg-white/5 px-4 py-1.5 rounded-full">
                <Clock size={12} /> Received:{" "}
                {new Date(activeCase.createdAt).toLocaleTimeString()}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
              <div className="space-y-2">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 underline underline-offset-8 decoration-red-600/30">
                  Accident Scene Node
                </span>
                <div className="flex items-center gap-4 text-2xl font-black italic tracking-tighter text-white">
                  <MapPin className="text-red-600" size={26} />
                  {activeCase.accidentDetails.accidentLocation ||
                    "Awaiting EMS Location Log..."}
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 underline underline-offset-8 decoration-blue-600/30">
                  Registry Destination Node
                </span>
                <div className="flex items-center gap-4 text-2xl font-black italic tracking-tighter text-white">
                  <Hospital className="text-blue-600" size={26} />
                  {activeCase.hospitalLocation}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Identity Log (Known Patient) */}
          <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-10 border-b border-slate-100 pb-8">
              <h2 className="text-2xl font-black text-slate-950 uppercase italic tracking-tight flex items-center gap-4">
                <UserCheck className="text-emerald-600" size={28} /> Identity
                Log (Known)
              </h2>
              {!activeCase.isUnknown && (
                <div className="px-5 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest italic border border-emerald-100 shadow-sm">
                  Verified by Nurse
                </div>
              )}
            </div>

            {activeCase.identity.name ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner group">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1 italic">
                        Patient Full Name
                      </span>
                      <p className="text-2xl font-black text-slate-900 tracking-tighter italic">
                        {activeCase.identity.name}
                      </p>
                    </div>
                    <User
                      className="text-slate-200 group-hover:text-emerald-500 transition-colors"
                      size={32}
                    />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1 italic">
                      Registry Blood Node
                    </span>
                    <p className="text-xl font-black text-emerald-600 italic tracking-tighter">
                      {activeCase.identity.bloodGroup || "Awaiting..."}
                    </p>
                  </div>
                </div>
                <div className="p-8 bg-blue-50/50 rounded-[2rem] border border-blue-100 shadow-inner group">
                  <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-4 italic underline underline-offset-4 decoration-blue-200">
                    Emergency POC Stream
                  </span>
                  <div className="space-y-4">
                    <div>
                      <p className="text-lg font-black text-blue-900 italic tracking-tighter">
                        {activeCase.identity.emergencyContactName}
                      </p>
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest italic">
                        ({activeCase.identity.relationship})
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-900/20">
                        <Phone size={14} />
                      </div>
                      <p className="font-mono text-blue-700 font-bold tracking-widest">
                        {activeCase.identity.emergencyContactPhone}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-20 border-4 border-dashed border-slate-100 rounded-[3rem] text-center bg-slate-50/30">
                <UserX
                  className="mx-auto text-slate-200 mb-6"
                  size={48}
                  strokeWidth={1}
                />
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest italic opacity-60">
                  No known identity details synchronized by ambulance node.
                </p>
              </div>
            )}
          </div>

          {/* 3. Forensic Assets (Unknown Patient) */}
          <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-10 border-b border-slate-100 pb-8">
              <h2 className="text-2xl font-black text-slate-950 uppercase italic tracking-tight flex items-center gap-4">
                <Camera className="text-amber-600" size={28} /> Forensic Assets
                (Unknown)
              </h2>
              {activeCase.isUnknown && (
                <div className="px-5 py-2 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest italic border border-amber-100 shadow-sm animate-pulse">
                  Analyzing Asset Stream
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  key: "patientPhoto",
                  label: "Biometric Reference",
                  icon: User,
                },
                { key: "vehiclePhoto", label: "Property Evidence", icon: Info },
                {
                  key: "scenePhoto",
                  label: "Incident Forensics",
                  icon: Camera,
                },
              ].map((ev) => (
                <div
                  key={ev.key}
                  onClick={() =>
                    activeCase.evidence[
                      ev.key as keyof typeof activeCase.evidence
                    ] &&
                    setSelectedPhoto({
                      src: activeCase.evidence[
                        ev.key as keyof typeof activeCase.evidence
                      ]!,
                      title: ev.label,
                    })
                  }
                  className={`aspect-square bg-slate-100 rounded-[2.5rem] border border-slate-200 overflow-hidden relative group cursor-pointer transition-all hover:ring-[16px] hover:ring-amber-500/5 ${!activeCase.evidence[ev.key as keyof typeof activeCase.evidence] && "cursor-default opacity-40 shadow-inner bg-slate-50"}`}
                >
                  {activeCase.evidence[
                    ev.key as keyof typeof activeCase.evidence
                  ] ? (
                    <>
                      <img
                        src={
                          activeCase.evidence[
                            ev.key as keyof typeof activeCase.evidence
                          ]
                        }
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                        alt={ev.label}
                      />
                      <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-md">
                        <Maximize2
                          className="text-white"
                          size={48}
                          strokeWidth={3}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                      <ev.icon size={36} strokeWidth={1} />
                      <span className="text-[10px] font-black uppercase tracking-widest mt-4 italic opacity-60">
                        Standby...
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-5 left-5 right-5 flex justify-between items-center z-20">
                    <div className="bg-slate-950/90 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/5 italic">
                      {ev.label}
                    </div>
                    {activeCase.evidence[
                      ev.key as keyof typeof activeCase.evidence
                    ] && (
                      <ExternalLink
                        size={14}
                        className="text-white opacity-50"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* AI Integration inside Forensic section */}
            <div className="mt-12 bg-slate-50 p-10 rounded-[3rem] border border-slate-200 group relative overflow-hidden shadow-inner border-2">
              <div className="absolute -bottom-24 -right-24 opacity-[0.03] group-hover:scale-125 transition-transform duration-1000 text-slate-900">
                <Zap size={450} />
              </div>
              <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-10 relative z-10">
                <h3 className="text-2xl font-black text-slate-950 uppercase italic tracking-tight flex items-center gap-4 underline underline-offset-8 decoration-amber-500/30">
                  <Zap
                    className="text-amber-500 group-hover:scale-110 transition-transform shadow-xl"
                    size={36}
                    fill="currentColor"
                  />{" "}
                  National Registry AI Matching
                </h3>
                <button
                  onClick={triggerClueSearch}
                  disabled={analyzing}
                  className="w-full md:w-auto bg-slate-950 text-white px-12 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-5 hover:bg-black transition-all shadow-2xl shadow-slate-900/40 active:scale-95 border border-white/5"
                >
                  {analyzing ? (
                    <Loader2 className="animate-spin" size={24} />
                  ) : (
                    <Database size={24} />
                  )}
                  Synthesize Registry Query
                </button>
              </div>
              {clues ? (
                <div className="bg-white p-12 rounded-[3rem] border border-slate-200 animate-in zoom-in-95 shadow-2xl border-l-[20px] border-l-amber-500 relative z-10 shadow-amber-900/5">
                  <p className="text-xl font-black text-slate-800 italic leading-relaxed tracking-tight">
                    "{clues}"
                  </p>
                  <div className="mt-12 pt-10 border-t border-slate-100 flex items-center gap-6 text-slate-400 text-[10px] font-black uppercase tracking-widest italic leading-none">
                    <Shield size={20} className="text-slate-300" /> Intelligence
                    generated by Gemini Decision Support Matrix (Police Core)
                  </div>
                </div>
              ) : (
                <div className="p-20 border-4 border-dashed border-slate-200 rounded-[3.5rem] text-center relative z-10 bg-white/50 backdrop-blur-sm shadow-inner">
                  <Database className="mx-auto text-slate-200 mb-8" size={64} />
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest leading-relaxed italic opacity-80 max-w-sm mx-auto">
                    Awaiting authority forensic trigger to query metropolitan
                    records node.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Auth Verification Form Section */}
        <div className="space-y-12">
          <div className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-2xl relative z-10 pointer-events-auto border-2 shadow-slate-900/5">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-12 px-1 border-l-4 border-amber-500 pl-6 italic underline underline-offset-8 decoration-slate-100 italic">
              Official Authorization Matrix
            </h3>
            <div className="space-y-7">
              <div className="space-y-1 group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic group-focus-within:text-amber-600 transition-colors italic">
                  Verified Legal Identity
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] p-5 font-black outline-none cursor-text select-text focus:ring-8 focus:ring-amber-500/5 transition-all text-slate-950 placeholder:text-slate-300 focus:bg-white relative z-20 border-2 italic"
                  placeholder="Official ID Node Name..."
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1 group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic">
                    Registry Age
                  </label>
                  <input
                    type="text"
                    value={formData.age}
                    onChange={(e) => handleInputChange("age", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black outline-none focus:bg-white relative z-20 border-2 italic"
                    placeholder="Age"
                  />
                </div>
                <div className="space-y-1 group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic">
                    Node Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      handleInputChange("gender", e.target.value)
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black outline-none focus:bg-white appearance-none relative z-20 border-2 italic"
                  >
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Complex</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic">
                  Residential Address Node
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black outline-none focus:bg-white relative z-20 border-2 italic"
                  placeholder="City / Street Matrix..."
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1 group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic">
                    Blood Group
                  </label>
                  <input
                    type="text"
                    value={formData.bloodGroup}
                    onChange={(e) =>
                      handleInputChange("bloodGroup", e.target.value)
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black outline-none focus:bg-white relative z-20 border-2 italic"
                    placeholder="A+ / O- / etc"
                  />
                </div>
                <div className="space-y-1 group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      handleInputChange("phoneNumber", e.target.value)
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black outline-none focus:bg-white relative z-20 border-2 italic"
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
              </div>

              <div className="space-y-1 group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic">
                  Registry ID Type
                </label>
                <select
                  value={formData.govIdType}
                  onChange={(e) =>
                    handleInputChange("govIdType", e.target.value)
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black outline-none focus:bg-white appearance-none relative z-20 border-2 italic"
                >
                  <option value="Aadhar">National Registry</option>
                  <option value="Passport">Global ID</option>
                  <option value="Voter ID">Regional ID</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1 group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    value={formData.vehicleNumber}
                    onChange={(e) =>
                      handleInputChange("vehicleNumber", e.target.value)
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black outline-none focus:bg-white relative z-20 border-2 italic"
                    placeholder="Vehicle..."
                  />
                </div>
                <div className="space-y-1 group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic">
                    Case Reference
                  </label>
                  <input
                    type="text"
                    value={formData.caseReference}
                    onChange={(e) =>
                      handleInputChange("caseReference", e.target.value)
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black outline-none focus:bg-white relative z-20 border-2 italic"
                    placeholder="Case Reference..."
                  />
                </div>
              </div>

              <div className="space-y-1 pt-6 group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic group-focus-within:text-amber-600 transition-colors italic">
                  Authorized Authority Notes
                </label>
                <textarea
                  value={policeNotes}
                  onChange={(e) => setPoliceNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-[2.5rem] p-7 font-black outline-none cursor-text select-text h-36 text-xs focus:ring-8 focus:ring-amber-500/5 focus:bg-white resize-none tracking-tight leading-relaxed relative z-20 border-2 italic"
                  placeholder="Official verification handshake credentials..."
                />
              </div>

              <button
                onClick={handleVerifyIdentity}
                disabled={!formData.name || authorizing}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 text-white font-black py-8 rounded-[2.5rem] shadow-2xl shadow-emerald-900/50 transition-all flex items-center justify-center gap-6 uppercase text-[12px] tracking-widest active:scale-[0.98] pointer-events-auto border-2 border-emerald-500/30 shadow-inner"
              >
                {authorizing ? (
                  <Loader2 className="animate-spin" size={28} />
                ) : (
                  <UserCheck2 size={28} />
                )}
                Authorize & Sync Identity Node
              </button>

              <button
                type="button"
                onClick={handleDownloadAuthorizationReport}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black py-6 rounded-[2.5rem] shadow-xl border border-slate-700 transition-all flex items-center justify-center gap-3 uppercase text-[11px] tracking-widest active:scale-[0.98]"
              >
                <Download size={20} />
                Download Authorization Report (PDF)
              </button>
            </div>
          </div>

          <div className="bg-slate-950 p-12 rounded-[3.5rem] text-white border border-slate-800 shadow-2xl relative overflow-hidden shadow-slate-900/80">
            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-1000">
              <Scale size={200} />
            </div>
            <div className="flex items-center gap-4 mb-10 relative z-10 italic">
              <Scale className="text-emerald-500" size={24} />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600">
                Administrative Admin Chain
              </h3>
            </div>
            <div className="space-y-5 relative z-10">
              <div className="flex items-center justify-between p-7 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-all cursor-default group shadow-inner">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 bg-blue-500/20 text-blue-500 rounded-2xl shadow-lg shadow-blue-500/10 group-hover:scale-110 transition-transform shadow-xl">
                    <FileBadge size={20} />
                  </div>
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic tracking-tighter">
                    Hospital Sync Link
                  </span>
                </div>
                <span className="text-emerald-500 font-black text-[10px] bg-emerald-500/10 px-4 py-2 rounded-full uppercase italic border border-emerald-500/10 tracking-widest italic underline underline-offset-4 decoration-emerald-500/10">
                  ACTIVE NODE
                </span>
              </div>
              <div className="flex items-center justify-between p-7 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-all cursor-default group shadow-inner">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 bg-amber-500/20 text-amber-500 rounded-2xl shadow-lg shadow-amber-500/10 group-hover:scale-110 transition-transform shadow-xl">
                    <Shield size={20} />
                  </div>
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic tracking-tighter">
                    Forensic Mesh Sync
                  </span>
                </div>
                <span className="text-amber-500 font-black text-[10px] bg-amber-500/10 px-4 py-2 rounded-full uppercase italic border border-emerald-500/10 tracking-widest italic underline underline-offset-4 decoration-emerald-500/10">
                  SYNCED
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoliceDashboard;
