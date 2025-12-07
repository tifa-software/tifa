"use client";
import React, { useState } from "react";
import axios from "axios";

export default function Page() {
  const [eventName, setEventName] = useState("Happy Diwali");
  const [message, setMessage] = useState(
    "Wishing you and your family a very Happy Diwali! ✨🪔"
  );
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!eventName.trim()) {
      alert("Please enter an event name.");
      return;
    }

    if (!message.trim()) {
      alert("Please write a message before sending.");
      return;
    }

    try {
      setLoading(true);
      await axios.post("/api/automation/Event", {
        eventName,
        message,
      });

      setSuccessMsg("Message sent successfully to all staff 🎉");
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err?.response?.data?.message ||
          "Something went wrong while sending the message."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-orange-50 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-5xl bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-emerald-100/70 overflow-hidden">
        {/* Top bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-2xl">
              💬
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-gray-800">
                Event WhatsApp Broadcast
              </h1>
              <p className="text-xs md:text-sm text-gray-500">
                Send a warm greeting (like <b>Happy Diwali</b>) to all staff in a
                single click.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs md:text-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-gray-500">WhatsApp Cloud API connected</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-0">
          {/* Left: Form */}
          <form
            onSubmit={handleSubmit}
            className="px-6 py-5 space-y-4 border-r border-gray-50"
          >
            {/* Small label header */}
            <div className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1 text-[11px] text-gray-500 mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              Event Details
            </div>

            {/* Event Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Event Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. Happy Diwali"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300 transition bg-white"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                This appears in your report / logs to identify the occasion.
              </p>
            </div>

            {/* Message Box */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Message <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-gray-400">
                  {message.length} characters
                </span>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={7}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300 transition bg-white resize-none"
                placeholder="Type your WhatsApp message here..."
              />
              <div className="flex items-center justify-between mt-1.5 text-[11px] text-gray-400">
                <span>Make it warm, short and clear.</span>
                <span>Emojis are supported ✅</span>
              </div>
            </div>

            {/* Status messages */}
            {successMsg && (
              <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-start gap-2">
                <span className="mt-0.5">✅</span>
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-start gap-2">
                <span className="mt-0.5">⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <span>Send WhatsApp Message</span>
                    <span>🚀</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Right: Live Preview */}
          <div className="px-6 py-5 bg-slate-50/60 flex flex-col gap-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] text-gray-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              Live WhatsApp Preview
            </div>

            <div className="flex-1 flex items-center justify-center">
              <div className="w-full max-w-xs bg-[#e5fff3] rounded-3xl p-4 shadow-sm border border-emerald-100">
                
                <div className="bg-white rounded-2xl rounded-bl-sm shadow-sm px-3 py-2.5 text-xs text-gray-800 relative">
                  <p className="font-semibold mb-1">{eventName || "Happy Diwali"}</p>
                  <p className="whitespace-pre-wrap">
                    {message ||
                      "Wishing you and your family a very Happy Diwali! ✨🪔"}
                  </p>
                  <div className="mt-1 flex justify-end gap-1 text-[9px] text-gray-400">
                    <span>10:24</span>
                    <span>✓✓</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              This is just a visual preview of how your message will look in a
              WhatsApp group. Actual delivery is handled via your Cloud API
              configuration on the server.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
