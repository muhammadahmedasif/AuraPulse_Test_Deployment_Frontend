"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, Phone, Plus, AlertTriangle, CheckCircle2, Clock, ChevronRight } from "lucide-react";
import { ConsentModal } from "@/components/emergency/ConsentModal";
import { AddContactModal } from "@/components/emergency/AddContactModal";
import { EmergencyContactCard } from "@/components/emergency/EmergencyContactCard";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Contact {
  _id: string;
  name: string;
  relationship: string;
  phone: string;
  priority: number;
  enabled: boolean;
}

interface EscalationStatus {
  consentAccepted: boolean;
  autoCallEnabled: boolean;
  contactCount: number;
  onCooldown: boolean;
  cooldownExpiresAt: string | null;
  lastEscalation: { outcome: string; createdAt: string } | null;
}

const API = process.env.NEXT_PUBLIC_API_URL;

function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(err.message || "Request failed");
  }
  return res.json();
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function EmergencySettingsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [status, setStatus] = useState<EscalationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoCallEnabled, setAutoCallEnabled] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      const [contactsRes, statusRes] = await Promise.all([
        apiFetch("/api/emergency/contacts"),
        apiFetch("/api/emergency/status"),
      ]);
      setContacts(contactsRes.contacts || []);
      setStatus(statusRes);
      setAutoCallEnabled(statusRes.autoCallEnabled || false);
    } catch (err) {
      showToast("Failed to load emergency settings", "err");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleConsentAccepted = async () => {
    try {
      await apiFetch("/api/emergency/consent", { method: "POST" });
      setShowConsentModal(false);
      showToast("Consent accepted — you can now add emergency contacts.");
      await loadData();
    } catch { showToast("Failed to save consent", "err"); }
  };

  const handleToggleAutoCall = async (enabled: boolean) => {
    if (enabled && !status?.consentAccepted) {
      setShowConsentModal(true);
      return;
    }
    try {
      setAutoCallEnabled(enabled);
      await apiFetch("/api/emergency/settings", {
        method: "PUT",
        body: JSON.stringify({ autoCallEnabled: enabled }),
      });
      showToast(enabled ? "Auto-calling enabled." : "Auto-calling disabled.");
      await loadData();
    } catch { showToast("Failed to update setting", "err"); setAutoCallEnabled(!enabled); }
  };



  const handleAddContact = async (data: Omit<Contact, "_id">) => {
    try {
      const res = await apiFetch("/api/emergency/contacts", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setContacts(res.contacts);
      setShowAddModal(false);
      showToast(`${data.name} added as an emergency contact.`);
    } catch (err: any) { showToast(err.message || "Failed to add contact", "err"); }
  };

  const handleDeleteContact = async (contactId: string, name: string) => {
    try {
      const res = await apiFetch(`/api/emergency/contacts/${contactId}`, { method: "DELETE" });
      setContacts(res.contacts);
      showToast(`${name} removed.`);
    } catch { showToast("Failed to remove contact", "err"); }
  };

  const handleToggleContact = async (contactId: string, enabled: boolean) => {
    try {
      const res = await apiFetch(`/api/emergency/contacts/${contactId}`, {
        method: "PUT",
        body: JSON.stringify({ enabled }),
      });
      setContacts(res.contacts);
    } catch { showToast("Failed to update contact", "err"); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="animate-pulse text-center">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-40" style={{ color: "var(--accent)" }} />
          <p className="opacity-50">Loading emergency settings…</p>
        </div>
      </div>
    );
  }

  const isReady = status?.consentAccepted && contacts.filter(c => c.enabled).length > 0 && autoCallEnabled;

  return (
    <div
      className="min-h-screen pb-16"
      style={{
        background: "var(--bg)",
        color: "var(--text)",
        paddingTop: "65px", // adjust to navbar height
      }}
    >
      {/* ── Toast ── */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-lg transition-all"
          style={{ background: toast.type === "ok" ? "#16a34a" : "#dc2626", color: "#fff" }}
        >
          {toast.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: "rgba(239,68,68,0.12)" }}>
              <Shield className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Emergency Settings</h1>
              <p className="text-sm opacity-60">Configure crisis escalation and emergency contacts</p>
            </div>
          </div>

          {/* System status badge */}
          <div
            className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
            style={{ background: isReady ? "rgba(22,163,74,0.1)" : "rgba(251,191,36,0.1)" }}
          >
            <div className={`w-2 h-2 rounded-full ${isReady ? "bg-green-500" : "bg-yellow-400"}`} />
            <span className={isReady ? "text-green-600" : "text-yellow-600"}>
              {isReady
                ? "Emergency system active — auto-calling enabled"
                : "Emergency system inactive — complete setup below"}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* ── Step 1: Consent ── */}
        <section className="rounded-2xl p-5 border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold
                ${status?.consentAccepted ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"}`}>
                {status?.consentAccepted ? "✓" : "1"}
              </div>
              <div>
                <p className="font-semibold text-sm">Privacy Consent</p>
                <p className="text-xs opacity-55">Required before adding contacts</p>
              </div>
            </div>
            {status?.consentAccepted ? (
              <span className="text-xs text-green-600 font-medium">Accepted</span>
            ) : (
              <button
                onClick={() => setShowConsentModal(true)}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                Review & Accept
              </button>
            )}
          </div>
        </section>

        {/* ── Step 2: Contacts ── */}
        <section className="rounded-2xl p-5 border space-y-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold
                ${contacts.length > 0 ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"}`}>
                {contacts.length > 0 ? "✓" : "2"}
              </div>
              <div>
                <p className="font-semibold text-sm">Emergency Contacts</p>
                <p className="text-xs opacity-55">{contacts.length} / 5 contacts added</p>
              </div>
            </div>
            {contacts.length < 5 && (
              <button
                onClick={() => {
                  if (!status?.consentAccepted) { setShowConsentModal(true); return; }
                  setShowAddModal(true);
                }}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                <Plus className="w-3 h-3" /> Add Contact
              </button>
            )}
          </div>

          {contacts.length === 0 ? (
            <div className="text-center py-6 rounded-xl border-2 border-dashed opacity-40" style={{ borderColor: "var(--border)" }}>
              <Phone className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No emergency contacts yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contacts.map((c) => (
                <EmergencyContactCard
                  key={c._id}
                  contact={c}
                  onDelete={() => handleDeleteContact(c._id, c.name)}
                  onToggle={(enabled) => handleToggleContact(c._id, enabled)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Step 3: Auto-call toggle ── */}
        <section className="rounded-2xl p-5 border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold
                ${autoCallEnabled ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"}`}>
                {autoCallEnabled ? "✓" : "3"}
              </div>
              <div>
                <p className="font-semibold text-sm">Enable Auto-Calling</p>
                <p className="text-xs opacity-55">AuraPulse will call your contacts in a crisis</p>
              </div>
            </div>
            <button
              onClick={() => handleToggleAutoCall(!autoCallEnabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${autoCallEnabled ? "bg-green-500" : "bg-gray-300"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoCallEnabled ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        </section>



        {/* ── Cooldown status ── */}
        {status?.onCooldown && status.cooldownExpiresAt && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(251,191,36,0.1)" }}>
            <Clock className="w-4 h-4 text-yellow-500 shrink-0" />
            <span className="text-yellow-700">
              Cooldown active — next call available{" "}
              {new Date(status.cooldownExpiresAt).toLocaleString()}
            </span>
          </div>
        )}

        {/* ── Last escalation ── */}
        {status?.lastEscalation && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm opacity-70" style={{ background: "var(--card)" }}>
            <ChevronRight className="w-4 h-4 shrink-0" />
            <span>
              Last escalation:{" "}
              <strong>{status.lastEscalation.outcome}</strong> on{" "}
              {new Date(status.lastEscalation.createdAt).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showConsentModal && (
        <ConsentModal onAccept={handleConsentAccepted} onClose={() => setShowConsentModal(false)} />
      )}
      {showAddModal && (
        <AddContactModal onAdd={handleAddContact} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}

