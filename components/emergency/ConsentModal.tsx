"use client";

import { ShieldAlert, X } from "lucide-react";

interface Props {
  onAccept: () => void;
  onClose: () => void;
}

export function ConsentModal({ onAccept, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X className="w-4 h-4 opacity-50" />
        </button>

        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-center mb-2">Emergency Escalation Consent</h2>
        
        <div className="space-y-4 my-6 text-sm opacity-80 leading-relaxed text-justify">
          <p>
            AuraPulse is an AI wellness assistant, not a medical device or professional crisis service.
          </p>
          <p>
            By enabling emergency escalation, you consent to allow AuraPulse to <strong>automatically place phone calls</strong> to your listed emergency contacts if the system detects signs of severe emotional distress or potential self-harm.
          </p>
          <p>
            During an emergency call, AuraPulse will verbally disclose to your contacts that you may be in distress, based on its analysis of your session. 
          </p>
          <p className="font-semibold text-red-600 dark:text-red-400">
            Do not rely solely on this system for emergency response. In a life-threatening crisis, please dial your local emergency number immediately.
          </p>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl font-medium border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            style={{ borderColor: "var(--border)" }}
          >
            Cancel
          </button>
          <button 
            onClick={onAccept}
            className="flex-1 py-2.5 rounded-xl font-medium text-white shadow-md hover:shadow-lg transition-all"
            style={{ background: "var(--accent)" }}
          >
            I Understand & Accept
          </button>
        </div>
      </div>
    </div>
  );
}
