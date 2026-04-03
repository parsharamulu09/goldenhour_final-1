
import React, { useState } from 'react';
import { Role } from '../types';
import { Activity, Hospital, Shield, Clock, ArrowRight, Lock, User, Mail, CheckCircle } from 'lucide-react';
import { mockAuth } from '../services/supabase';

interface Props {
  onLogin: (email: string, role: Role) => void;
}

const AuthPortal: React.FC<Props> = ({ onLogin }) => {
  const [view, setView] = useState<'signin' | 'signup' | 'success'>('signin');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!role) return;
    
    if (view === 'signin') {
      const user = mockAuth.signIn(email, role);
      if (user) {
        onLogin(email, role);
      } else {
        setError("Invalid credentials or role mismatch for this email.");
      }
    } else {
      mockAuth.signUp(email, role, name);
      setView('success');
    }
  };

  if (view === 'success') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 p-12 rounded-[3rem] max-w-md w-full text-center space-y-8 animate-in zoom-in-95">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20">
            <CheckCircle size={48} />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Registration OK</h2>
            <p className="text-slate-400 font-medium">Account created for {name}. Registry updated successfully.</p>
          </div>
          <button 
            onClick={() => setView('signin')}
            className="w-full bg-white text-slate-950 font-black py-4 rounded-2xl uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
          >
            Authorize Entry (Sign In)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row font-sans selection:bg-red-500/30">
      <div className="md:w-1/2 p-12 flex flex-col justify-between relative overflow-hidden bg-slate-900 border-r border-slate-800">
        <div className="absolute top-[-10%] left-[-10%] w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-600/10 via-transparent to-transparent opacity-50"></div>
        <div className="z-10">
          <div className="flex items-center gap-3 mb-16 group">
            <div className="p-3 bg-red-600 rounded-2xl text-white shadow-2xl shadow-red-500/20 group-hover:scale-110 transition-transform">
              <Clock size={32} strokeWidth={3} />
            </div>
            <span className="font-black text-4xl text-white tracking-tighter uppercase italic">GoldenHour</span>
          </div>
          <h1 className="text-6xl md:text-7xl font-black text-white leading-[0.9] mb-8 tracking-tighter">
            THE CARE <br /> 
            <span className="text-red-600">HANDSHAKE.</span>
          </h1>
          <p className="text-slate-400 text-xl max-w-md font-medium leading-relaxed">
            Clinical coordination during the critical hour.
          </p>
        </div>
      </div>

      <div className="md:w-1/2 p-8 md:p-24 flex items-center justify-center bg-slate-950">
        <div className="w-full max-w-md space-y-10">
          <div className="flex gap-4 p-1 bg-slate-900 rounded-2xl border border-slate-800">
            <button 
              onClick={() => { setView('signin'); setError(null); }}
              className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${view === 'signin' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => { setView('signup'); setError(null); }}
              className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${view === 'signup' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {error && <div className="p-4 bg-red-600/10 border border-red-600/20 text-red-500 text-xs font-bold uppercase rounded-xl tracking-widest">{error}</div>}
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Organization Role</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: Role.AMBULANCE, icon: Activity, label: 'EMS' },
                  { id: Role.HOSPITAL, icon: Hospital, label: 'Hospital' },
                  { id: Role.POLICE, icon: Shield, label: 'Police' },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 group ${
                      role === r.id 
                        ? 'border-red-600 bg-red-600/10 text-white shadow-xl' 
                        : 'border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    <r.icon size={20} className={role === r.id ? 'text-red-500' : ''} />
                    <span className="text-[9px] font-black uppercase tracking-widest">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {view === 'signup' && (
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-red-500 transition-colors" size={18} />
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-red-600 outline-none transition-all placeholder:text-slate-700 font-medium"
                    placeholder="Registry Name"
                  />
                </div>
              )}
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-red-500 transition-colors" size={18} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-red-600 outline-none transition-all placeholder:text-slate-700 font-medium"
                  placeholder="Registry Email"
                />
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-red-500 transition-colors" size={18} />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-red-600 outline-none transition-all placeholder:text-slate-700 font-medium"
                  placeholder="Password"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={!role || !email || !password}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-20 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-red-900/20 group uppercase tracking-widest text-xs"
            >
              {view === 'signin' ? 'Authorize Entry' : 'Create Registry Profile'}
              <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthPortal;
