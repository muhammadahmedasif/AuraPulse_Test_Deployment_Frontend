"use client";

import { Trash2, PhoneCall, User } from "lucide-react";

interface Contact {
  _id: string;
  name: string;
  relationship: string;
  phone: string;
  priority: number;
  enabled: boolean;
}

interface Props {
  contact: Contact;
  onDelete: () => void;
  onToggle: (enabled: boolean) => void;
}

export function EmergencyContactCard({ contact, onDelete, onToggle }: Props) {
  return (
    <div 
      className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
        contact.enabled ? "opacity-100" : "opacity-60 grayscale-[50%]"
      }`}
      style={{ borderColor: "var(--border)", background: "var(--bg)" }}
    >
      <div className="flex items-center gap-4">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "rgba(124, 58, 237, 0.1)", color: "var(--accent)" }}
        >
          <User className="w-5 h-5" />
        </div>
        
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">{contact.name}</h3>
            <span 
              className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-medium"
              style={{ background: "var(--border)" }}
            >
              {contact.relationship}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 mt-1 opacity-70 text-sm">
            <PhoneCall className="w-3.5 h-3.5" />
            <span>{contact.phone}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => onToggle(!contact.enabled)}
          className={`relative w-9 h-5 rounded-full transition-colors ${
            contact.enabled ? "bg-green-500" : "bg-gray-300 dark:bg-gray-700"
          }`}
          title={contact.enabled ? "Disable contact" : "Enable contact"}
        >
          <span 
            className={`absolute top-[2px] left-[2px] w-4 h-4 bg-white rounded-full shadow transition-transform ${
              contact.enabled ? "translate-x-4" : "translate-x-0"
            }`} 
          />
        </button>
        
        <button 
          onClick={onDelete}
          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title="Delete contact"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
