"use client";

import { Trash2, PhoneCall, User, MessageCircle } from "lucide-react";

interface Contact {
  _id: string;
  name: string;
  relationship: string;
  phone?: string;
  whatsappNumber?: string;
  preferredContactMethod?: "phone" | "whatsapp" | "both";
  priority: number;
  enabled: boolean;
}

interface Props {
  contact: Contact;
  onDelete: () => void;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onTestCall: () => void;
  testCallLoading?: boolean;
}

export function EmergencyContactCard({ contact, onDelete, onToggle, onEdit, onTestCall, testCallLoading }: Props) {
  return (
    <div 
      className={`p-4 rounded-xl border flex items-center justify-between transition-all hover:shadow-md ${
        contact.enabled ? "opacity-100 bg-white dark:bg-gray-800/50" : "opacity-60 bg-gray-50 dark:bg-gray-900"
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
            <h3 className="font-bold text-sm tracking-tight">{contact.name}</h3>
            <span 
              className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold"
              style={{ background: "var(--border)", color: "var(--text)" }}
            >
              {contact.relationship}
            </span>
          </div>
          
          <div className="flex flex-col gap-1 mt-1 opacity-70 text-sm">
            {(!contact.preferredContactMethod || contact.preferredContactMethod === "phone" || contact.preferredContactMethod === "both") && contact.phone && (
              <div className="flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5" />
                <span>{contact.phone}</span>
              </div>
            )}
            {(contact.preferredContactMethod === "whatsapp" || contact.preferredContactMethod === "both") && contact.whatsappNumber && (
              <div className="flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-green-500" />
                <span>{contact.whatsappNumber} (WhatsApp)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onTestCall}
          disabled={testCallLoading || !contact.enabled}
          className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
            contact.enabled
              ? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
              : "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800"
          }`}
          title="Send a test emergency call"
        >
          {testCallLoading ? "Calling..." : "Test Call"}
        </button>
        
        <button
          onClick={onEdit}
          className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title="Edit contact"
        >
          Edit
        </button>
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
          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-2"
          title="Delete contact"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
