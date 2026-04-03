
import React from 'react';
import { X, ZoomIn, ZoomOut, Download } from 'lucide-react';

interface Props {
  src: string;
  title: string;
  onClose: () => void;
}

const ImageModal: React.FC<Props> = ({ src, title, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300">
      <div 
        className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-5xl bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-800 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md">
          <div>
            <h3 className="text-white font-black uppercase italic tracking-tight">{title}</h3>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Forensic Evidence Viewer</p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-slate-800 hover:bg-red-600 text-white rounded-2xl transition-all"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/40 custom-scrollbar">
          <img 
            src={src} 
            className="max-w-full h-auto rounded-xl shadow-2xl cursor-zoom-in" 
            alt={title}
          />
        </div>

        <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex justify-center gap-4">
          <div className="flex items-center gap-2 px-6 py-3 bg-slate-800 rounded-2xl text-slate-400 text-[10px] font-black uppercase tracking-widest">
            <ZoomIn size={14} /> Zoom Control Active
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
