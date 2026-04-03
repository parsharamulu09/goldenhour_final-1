
import React, { useState, useEffect } from 'react';
import { Role, EmergencyCase, Severity, UserProfile } from './types';
import AmbulanceDashboard from './pages/AmbulanceDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import PoliceDashboard from './pages/PoliceDashboard';
import AuthPortal from './components/AuthPortal';
import { Clock, LogOut, PlusCircle, ShieldAlert, Activity } from 'lucide-react';
import { mockAuth } from './services/supabase';
import {
  broadcastEmergencyCase,
  subscribeBroadcastEmergencyCases,
  subscribeSupabaseEmergencyCases,
} from './services/emergencyCaseSync';

const createEmptyCase = (ambulanceId: string): EmergencyCase => ({
  id: 'CASE-' + Math.floor(1000 + Math.random() * 9000),
  ambulanceId: ambulanceId,
  hospitalId: 'CENTRAL-GEN',
  identity: {
    temporaryId: 'TEMP-' + Math.floor(10000 + Math.random() * 90000),
    isPoliceVerified: false
  },
  isUnknown: true,
  severity: Severity.LOW,
  vitals: {
    pulse: 0,
    bp_sys: 0,
    bp_dia: 0,
    spo2: 0,
    temp: 0,
    lastUpdated: new Date().toISOString()
  },
  medicalCondition: {
    state: '',
    injuries: '',
    symptoms: '',
    treatment: '',
    medicalSentToHospital: false
  },
  accidentDetails: {
    accidentLocation: '',
    hospitalLocation: 'Central General - Emergency Wing',
    identitySentToPolice: false
  },
  eta: 15,
  status: 'TRANSIT',
  evidence: {},
  readiness: {
    icu: false,
    blood: false,
    specialist: false,
    equipment: false,
    medicines: false
  },
  createdAt: new Date().toISOString()
});

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(mockAuth.getUser());
  const [cases, setCases] = useState<EmergencyCase[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);

  // Persistence to simulate Realtime DB Registry
  useEffect(() => {
    const stored = localStorage.getItem('gh_emergency_registry_v2');
    if (stored) {
      const parsed = JSON.parse(stored);
      setCases(parsed);
      if (parsed.length > 0 && !activeCaseId) {
        setActiveCaseId(parsed[0].id);
      }
    }
  }, []);

  useEffect(() => {
    if (cases.length > 0) {
      localStorage.setItem('gh_emergency_registry_v2', JSON.stringify(cases));
    }
  }, [cases]);

  useEffect(() => {
    const offBc = subscribeBroadcastEmergencyCases((incoming) => {
      setCases((prev) => prev.map((c) => (c.id === incoming.id ? incoming : c)));
    });
    const offRt = subscribeSupabaseEmergencyCases((incoming) => {
      setCases((prev) => prev.map((c) => (c.id === incoming.id ? incoming : c)));
    });
    return () => {
      offBc();
      offRt();
    };
  }, []);

  const handleLogin = (email: string, role: Role) => {
    const loggedUser = mockAuth.signIn(email, role) as UserProfile;
    setUser(loggedUser);
    if (cases.length === 0) {
      const initialCase = createEmptyCase('AMB-' + Math.floor(10 + Math.random() * 89));
      setCases([initialCase]);
      setActiveCaseId(initialCase.id);
    }
  };

  const handleLogout = () => {
    mockAuth.signOut();
    setUser(null);
  };

  const updateCase = (updates: Partial<EmergencyCase>, targetId?: string) => {
    const idToUpdate = targetId || activeCaseId;
    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== idToUpdate) return c;
        const merged = { ...c, ...updates };
        broadcastEmergencyCase(merged);
        return merged;
      })
    );
  };

  const startNewCase = () => {
    if (window.confirm("Start entry for a new accident patient? Previous data remains visible to Authorities.")) {
      const newCase = createEmptyCase(activeCase?.ambulanceId || 'AMB-01');
      setCases(prev => [newCase, ...prev]);
      setActiveCaseId(newCase.id);
    }
  };

  if (!user) {
    return <AuthPortal onLogin={handleLogin} />;
  }

  const activeCase = cases.find(c => c.id === activeCaseId) || cases[0];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased font-sans">
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center sticky top-0 z-[60] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600 rounded-lg text-white shadow-lg">
            <Clock size={20} strokeWidth={3} />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xl text-slate-900 tracking-tighter uppercase italic leading-none">GoldenHour</span>
            <span className="text-[8px] font-black text-red-600 uppercase tracking-widest mt-0.5">Emergency Command</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {user.role === Role.AMBULANCE && (
            <button 
              onClick={startNewCase}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg shadow-slate-200"
            >
              <PlusCircle size={14} /> New Accident Patient
            </button>
          )}

          <div className="hidden sm:flex flex-col items-end border-l border-slate-100 pl-4 ml-2">
            <div className="flex items-center gap-2">
               <span className="text-xs font-bold text-slate-700">{user.name}</span>
               <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                 user.role === Role.AMBULANCE ? 'bg-red-50 text-red-600 border-red-100' : 
                 user.role === Role.HOSPITAL ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'
               }`}>
                 {user.role}
               </div>
            </div>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5 tracking-tighter italic">UNIT: {activeCase?.ambulanceId || 'N/A'}</span>
          </div>

          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 rounded-xl transition-all">
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      {/* Case Management Strip for Authorities */}
      {(user.role === Role.HOSPITAL || user.role === Role.POLICE) && cases.length > 0 && (
        <div className="bg-slate-900 px-6 py-2.5 flex items-center gap-4 overflow-x-auto scrollbar-hide border-b border-white/5">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap flex items-center gap-2 italic">
            <Activity size={12} className="text-red-500" /> Triage Queue:
          </span>
          {cases.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveCaseId(c.id)}
              className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${
                activeCaseId === c.id 
                  ? 'bg-red-600 border-red-500 text-white shadow-lg' 
                  : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {c.id} {c.identity.name ? `| ${c.identity.name}` : `| ${c.identity.temporaryId}`}
            </button>
          ))}
        </div>
      )}

      <main className="flex-1 overflow-x-hidden relative">
        {user.role === Role.AMBULANCE && activeCase && <AmbulanceDashboard activeCase={activeCase} updateCase={updateCase} />}
        {user.role === Role.HOSPITAL && activeCase && <HospitalDashboard activeCase={activeCase} updateCase={updateCase} />}
        {user.role === Role.POLICE && activeCase && <PoliceDashboard activeCase={activeCase} updateCase={updateCase} />}
      </main>

      <footer className="bg-white border-t border-slate-100 px-6 py-2 flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <ShieldAlert size={12} className="text-red-500" />
          Protocol Node: {activeCase?.id || 'NO_CONTEXT'}
        </div>
        <div className="flex items-center gap-4">
          <span>Active Registry: {cases.length} Cases</span>
          <span className="w-1 h-1 bg-slate-200 rounded-full" />
          <span>AES-256 Mesh Link</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
