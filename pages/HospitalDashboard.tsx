import React, { useState, useEffect } from "react";
import EmergencyMap from "../components/maps/EmergencyMap";
import { EmergencyCase, Severity, ReadinessStatus } from "../types";
import {
  Activity,
  CheckCircle,
  Info,
  FileText,
  ShieldCheck,
  User,
  AlertCircle
} from "lucide-react";

interface Props {
  activeCase: EmergencyCase;
  updateCase: (updates: Partial<EmergencyCase>, targetId?: string) => void;
}

const HospitalDashboard: React.FC<Props> = ({ activeCase, updateCase }) => {

  const [activeTab, setActiveTab] =
    useState<"info" | "medical" | "telemetry">("info");

  const [ambulancePosition, setAmbulancePosition] = useState({
    lat: 17.389,
    lng: 78.491
  });

  const accidentLocation = { lat: 17.385, lng: 78.486 };

  const hospitals = [
    {
      name: "City Trauma Center",
      lat: 17.392,
      lng: 78.482,
      icuAvailable: true,
      recommended: true
    },
    {
      name: "Apollo Hospital",
      lat: 17.401,
      lng: 78.475,
      icuAvailable: false
    }
  ];

  const destination = hospitals[0];

  /* ---------------- AMBULANCE MOVEMENT ---------------- */

  useEffect(() => {

    if (activeTab !== "telemetry") return;

    const interval = setInterval(() => {

      setAmbulancePosition(prev => {

        const newLat = prev.lat + (destination.lat - prev.lat) * 0.02;
        const newLng = prev.lng + (destination.lng - prev.lng) * 0.02;

        return { lat: newLat, lng: newLng };

      });

    }, 800);

    return () => clearInterval(interval);

  }, [activeTab]);

  /* ---------------- READINESS ---------------- */

  const toggleReadiness = (key: keyof ReadinessStatus) => {

    updateCase({
      readiness: {
        ...activeCase.readiness,
        [key]: !activeCase.readiness[key]
      }
    });

  };

  const statusColor =
    activeCase.severity === Severity.CRITICAL
      ? "bg-red-500"
      : activeCase.severity === Severity.MEDIUM
      ? "bg-yellow-500"
      : "bg-emerald-500";

  return (

    <div className="p-6 max-w-7xl mx-auto space-y-8">

      {activeCase.cardiacArrestAlert && (
        <div
          role="alert"
          className="rounded-2xl border-2 border-red-600 bg-red-600 text-white px-6 py-4 text-center font-black uppercase tracking-widest shadow-lg animate-pulse"
        >
          CARDIAC ARREST DETECTED — Pulse {activeCase.vitals.pulse} BPM
        </div>
      )}

      {/* HEADER */}

      <div className="bg-white border rounded-3xl p-6 flex justify-between items-center">

        <div className="flex items-center gap-6">

          <div className={`w-24 h-24 ${statusColor} text-white rounded-xl flex flex-col justify-center items-center`}>
            <span className="text-4xl font-black">{activeCase.eta}</span>
            <span className="text-xs">MINS</span>
          </div>

          <div>

            <h1 className="text-2xl font-black">
              INBOUND NODE: {activeCase.ambulanceId}
            </h1>

            <div className="flex gap-4 mt-2">

              <span className="flex items-center gap-2 text-sm">
                <User size={14}/>
                {activeCase.identity.name}
              </span>

              <span className="flex items-center gap-2 text-sm">
                <AlertCircle size={14}/>
                {activeCase.severity} PRIORITY NODE
              </span>

              {activeCase.identity.isPoliceVerified && (
                <span className="flex items-center gap-1 text-green-600 text-xs">
                  <ShieldCheck size={14}/>
                  AUTHORITY SYNC OK
                </span>
              )}

            </div>

          </div>

        </div>

        {/* TABS */}

        <div className="flex gap-3">

          <button
            onClick={()=>setActiveTab("info")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              activeTab==="info" ? "bg-black text-white":"bg-slate-100"
            }`}
          >
            <Info size={14}/> Admission
          </button>

          <button
            onClick={()=>setActiveTab("medical")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              activeTab==="medical" ? "bg-black text-white":"bg-slate-100"
            }`}
          >
            <FileText size={14}/> Nurse Feedback
          </button>

          <button
            onClick={()=>setActiveTab("telemetry")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              activeTab==="telemetry" ? "bg-black text-white":"bg-slate-100"
            }`}
          >
            <Activity size={14}/> Live Mesh
          </button>

        </div>

      </div>

      {/* MAIN GRID */}

      <div className="grid grid-cols-3 gap-8">

        {/* LEFT PANEL */}

        <div className="col-span-2 space-y-8">

          {/* ADMISSION */}

          {activeTab==="info" && (

            <div className="bg-white p-8 rounded-2xl border">

              <h2 className="text-xl font-black mb-6">
                Clinical Intelligence Node
              </h2>

              <div className="grid grid-cols-2 gap-6 text-sm">

                <div>
                  <p className="text-slate-400">Patient Name</p>
                  <p className="font-bold">{activeCase.identity.name}</p>
                </div>

                <div>
                  <p className="text-slate-400">Age</p>
                  <p className="font-bold">{activeCase.identity.age}</p>
                </div>

                <div>
                  <p className="text-slate-400">Gender</p>
                  <p className="font-bold">{activeCase.identity.gender}</p>
                </div>

                <div>
                  <p className="text-slate-400">Blood Group</p>
                  <p className="font-bold">{activeCase.identity.bloodGroup}</p>
                </div>

              </div>

            </div>

          )}

          {/* NURSE FEEDBACK */}

          {activeTab==="medical" && (

            <div className="bg-white p-8 rounded-2xl border">

              <h2 className="text-xl font-black mb-6">
                Nurse Clinical Feedback
              </h2>

              <div className="space-y-6">

                <div>
                  <p className="text-xs text-slate-400">Trauma Presentation Log</p>
                  <p className="text-xl font-bold italic">
                    {activeCase.medicalCondition.injuries}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Field Symptom Matrix</p>
                  <p className="text-xl font-bold italic">
                    {activeCase.medicalCondition.symptoms}
                  </p>
                </div>

                <div className="bg-blue-800 text-white p-6 rounded-xl">
                  <p className="text-xs">EMS Administered Matrix</p>
                  <p className="text-xl font-bold italic">
                    "{activeCase.medicalCondition.treatment}"
                  </p>
                </div>

              </div>

            </div>

          )}

          {/* LIVE MESH */}

          {activeTab==="telemetry" && (

            <div className="bg-white p-8 rounded-2xl border">

              <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                <Activity size={20}/> Live Telemetry
              </h2>

              <EmergencyMap
                accident={accidentLocation}
                ambulance={{
                  id: "AMB-01",
                  lat: ambulancePosition.lat,
                  lng: ambulancePosition.lng
                }}
                hospitals={hospitals}
                policeUnits={[
                  { id: "POL-01", lat: 17.378, lng: 78.49 }
                ]}
                showRouteLine
                className="w-full h-[360px]"
              />

              <div className="grid grid-cols-5 mt-6 text-center">

                <div>
                  <p className="text-xs">Pulse</p>
                  <p className="text-3xl font-bold">{activeCase.vitals.pulse}</p>
                </div>

                <div>
                  <p className="text-xs">BP</p>
                  <p className="text-3xl font-bold">
                    {activeCase.vitals.bp_sys}/{activeCase.vitals.bp_dia}
                  </p>
                </div>

                <div>
                  <p className="text-xs">SpO2</p>
                  <p className="text-3xl font-bold">{activeCase.vitals.spo2}%</p>
                </div>

                <div>
                  <p className="text-xs">Temp</p>
                  <p className="text-3xl font-bold">{activeCase.vitals.temp}</p>
                </div>

                <div>
                  <p className="text-xs">ETA</p>
                  <p className="text-3xl font-bold">{activeCase.eta}</p>
                </div>

              </div>

            </div>

          )}

        </div>

        {/* RIGHT PANEL */}

        <div className="bg-slate-900 text-white p-8 rounded-2xl">

          <h3 className="text-xs uppercase mb-6">
            Clinical Readiness Matrix
          </h3>

          <div className="space-y-4">

            {[
              {key:"icu",label:"ICU Recovery Unit"},
              {key:"blood",label:"Blood Node Arranged"},
              {key:"specialist",label:"Clinical Specialist"},
              {key:"equipment",label:"Trauma Bay Triage"},
              {key:"medicines",label:"Clinical Pharmacy"}
            ].map(item=>{

              const ready = activeCase.readiness[item.key as keyof ReadinessStatus];

              return (
                <button
                  key={item.key}
                  onClick={()=>toggleReadiness(item.key as any)}
                  className={`w-full p-4 rounded-xl flex justify-between ${
                    ready ? "bg-green-600" : "bg-slate-700"
                  }`}
                >
                  {item.label}
                  {ready ? <CheckCircle/> : <div className="w-4 h-4 border rounded-full"/>}
                </button>
              );

            })}

          </div>

        </div>

      </div>

    </div>

  );

};

export default HospitalDashboard;