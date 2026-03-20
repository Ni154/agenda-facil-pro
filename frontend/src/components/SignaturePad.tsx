import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Eraser, Check, X } from 'lucide-react';

interface SignaturePadProps {
  onSave: (signatureData: string) => void;
  onCancel: () => void;
}

export default function SignaturePad({ onSave, onCancel }: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);

  const clear = () => {
    sigCanvas.current?.clear();
  };

  const save = () => {
    if (sigCanvas.current?.isEmpty()) {
      alert('Por favor, forneça uma assinatura.');
      return;
    }
    const data = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
    if (data) {
      onSave(data);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-stone-200 rounded-2xl bg-white overflow-hidden">
        <SignatureCanvas
          ref={sigCanvas}
          penColor="#1c1917"
          canvasProps={{
            className: "w-full h-64 cursor-crosshair"
          }}
        />
      </div>
      
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={clear}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-all"
        >
          <Eraser size={18} />
          Limpar
        </button>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-all"
          >
            <X size={18} />
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-200"
          >
            <Check size={18} />
            Confirmar Assinatura
          </button>
        </div>
      </div>
    </div>
  );
}
