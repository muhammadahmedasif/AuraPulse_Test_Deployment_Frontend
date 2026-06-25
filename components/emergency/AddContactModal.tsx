"use client";

import { useState } from "react";
import { X, User, Heart } from "lucide-react";
import "react-phone-number-input/style.css";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";

interface ContactPayload {
  name: string;
  relationship: string;
  phone: string;
  priority: number;
  enabled: boolean;
}

interface Props {
  onAdd: (data: ContactPayload) => Promise<void>;
  onClose: () => void;
}

export function AddContactModal({ onAdd, onClose }: Props) {
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !relationship.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    if (!phone) {
      setError("Emergency contact number is required.");
      return;
    }

    if (!isValidPhoneNumber(phone)) {
      setError("Please enter a valid phone number.");
      return;
    }

    setLoading(true);
    try {
      await onAdd({
        name: name.trim(),
        relationship: relationship.trim(),
        phone: phone.trim(),
        priority: 1,
        enabled: true,
      });
    } catch (err: any) {
      setError(err.message || "Failed to add contact");
      setLoading(false);
    }
  };

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

        <h2 className="text-xl font-bold mb-6">Add Emergency Contact</h2>

        {error && (
          <div className="mb-4 p-3 text-sm rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 opacity-80">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 transition-shadow"
                style={{ background: "var(--card)", borderColor: "var(--border)", outlineColor: "var(--accent)" }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 opacity-80">Relationship</label>
            <div className="relative">
              <Heart className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
              <input
                type="text"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="Spouse, Parent, Therapist..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 transition-shadow"
                style={{ background: "var(--card)", borderColor: "var(--border)", outlineColor: "var(--accent)" }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 opacity-80">Phone Number</label>
            <div 
              className="w-full px-4 py-2.5 rounded-xl border focus-within:ring-2 transition-shadow phone-input-wrapper"
              style={{ background: "var(--card)", borderColor: "var(--border)", outlineColor: "var(--accent)" }}
            >
              <PhoneInput
                placeholder="Enter phone number"
                value={phone}
                onChange={(val: string | undefined) => setPhone(val || "")}
                international
                defaultCountry="US"
                className="phone-input-field"
              />
            </div>
            <style jsx global>{`
              .phone-input-wrapper .PhoneInput {
                display: flex;
                align-items: center;
              }
              .phone-input-wrapper .PhoneInputCountry {
                margin-right: 12px;
              }
              .phone-input-wrapper .PhoneInputInput {
                border: none;
                background: transparent;
                outline: none;
                flex: 1;
                color: var(--text);
                font-size: 1rem;
              }
              .phone-input-wrapper .PhoneInputCountrySelectArrow {
                opacity: 0.5;
              }
            `}</style>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl font-medium border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              style={{ borderColor: "var(--border)" }}
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl font-medium text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              style={{ background: "var(--accent)" }}
            >
              {loading ? "Adding..." : "Add Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
