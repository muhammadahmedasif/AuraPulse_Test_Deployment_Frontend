"use client";

import { useState } from "react";
import { X, User, Heart } from "lucide-react";
import "react-phone-number-input/style.css";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";

interface ContactPayload {
  name: string;
  relationship: string;
  phone?: string;
  whatsappNumber?: string;
  preferredContactMethod: "phone" | "whatsapp" | "both";
  priority: number;
  enabled: boolean;
}

interface Props {
  initialData: {
    _id: string;
    name: string;
    relationship: string;
    phone?: string;
    whatsappNumber?: string;
    preferredContactMethod?: "phone" | "whatsapp" | "both";
  };
  onEdit: (data: ContactPayload) => Promise<void>;
  onClose: () => void;
}

export function EditContactModal({ initialData, onEdit, onClose }: Props) {
  const [name, setName] = useState(initialData.name || "");
  const [relationship, setRelationship] = useState(initialData.relationship || "");
  const [preferredContactMethod, setPreferredContactMethod] = useState<"phone" | "whatsapp" | "both">(initialData.preferredContactMethod || "phone");
  const [phone, setPhone] = useState(initialData.phone || "");
  const [whatsappNumber, setWhatsappNumber] = useState(initialData.whatsappNumber || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !relationship.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    if ((preferredContactMethod === "phone" || preferredContactMethod === "both") && !phone) {
      setError("Phone number is required for emergency calls.");
      return;
    }
    if ((preferredContactMethod === "phone" || preferredContactMethod === "both") && phone && !isValidPhoneNumber(phone)) {
      setError("Please enter a valid phone number.");
      return;
    }

    if ((preferredContactMethod === "whatsapp" || preferredContactMethod === "both") && !whatsappNumber) {
      setError("WhatsApp number is required for WhatsApp notifications.");
      return;
    }
    if ((preferredContactMethod === "whatsapp" || preferredContactMethod === "both") && whatsappNumber && !isValidPhoneNumber(whatsappNumber)) {
      setError("Please enter a valid WhatsApp number.");
      return;
    }

    setLoading(true);
    try {
      await onEdit({
        name: name.trim(),
        relationship: relationship.trim(),
        preferredContactMethod,
        phone: phone.trim() || undefined,
        whatsappNumber: whatsappNumber.trim() || undefined,
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

        <h2 className="text-xl font-bold mb-6">Edit Emergency Contact</h2>

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

          {/* Method Selection Segmented Control */}
          <div>
            <label className="block text-sm font-medium mb-1.5 opacity-80">Preferred Emergency Method</label>
            <div className="flex p-1 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              {(["phone", "whatsapp", "both"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPreferredContactMethod(method)}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${
                    preferredContactMethod === method
                      ? "shadow-sm"
                      : "opacity-60 hover:opacity-100"
                  }`}
                  style={{
                    background: preferredContactMethod === method ? "var(--bg)" : "transparent",
                    color: preferredContactMethod === method ? "var(--accent)" : "inherit"
                  }}
                >
                  {method === "phone" ? "Phone Call" : method === "whatsapp" ? "WhatsApp" : "Both"}
                </button>
              ))}
            </div>
          </div>

          {/* Phone Input */}
          {(preferredContactMethod === "phone" || preferredContactMethod === "both") && (
            <div>
              <label className="block text-sm font-medium mb-1.5 opacity-80">Phone Number (Voice Calls)</label>
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
            </div>
          )}

          {/* WhatsApp Input */}
          {(preferredContactMethod === "whatsapp" || preferredContactMethod === "both") && (
            <div>
              <label className="block text-sm font-medium mb-1.5 opacity-80">WhatsApp Number</label>
              <div 
                className="w-full px-4 py-2.5 rounded-xl border focus-within:ring-2 transition-shadow phone-input-wrapper"
                style={{ background: "var(--card)", borderColor: "var(--border)", outlineColor: "var(--accent)" }}
              >
                <PhoneInput
                  placeholder="Enter WhatsApp number"
                  value={whatsappNumber}
                  onChange={(val: string | undefined) => setWhatsappNumber(val || "")}
                  international
                  defaultCountry="US"
                  className="phone-input-field"
                />
              </div>
            </div>
          )}

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
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
