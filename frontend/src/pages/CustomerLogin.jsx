
import React, { useState } from "react";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import {
  requestCustomerOtp,
  verifyCustomerOtp,
} from "../services/api";

export const CustomerLogin = ({ onBack, onLoginSuccess }) => {
  const [stage, setStage] = useState("details");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleRequestOtp = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await requestCustomerOtp({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
      });

      setStage("otp");
      setMessage("If the request succeeded, check your email for the OTP.");
    } catch (err) {
      setError(err.message || "Unable to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const result = await verifyCustomerOtp({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });

      setMessage("Email verified successfully.");

      if (onLoginSuccess) {
        onLoginSuccess(result.customer ?? result);
      }
    } catch (err) {
      setError(err.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-md">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            {stage === "details" ? (
              <Mail size={24} />
            ) : (
              <ShieldCheck size={24} />
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            {stage === "details" ? "Sign in to Manpasand" : "Verify your email"}
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            {stage === "details"
              ? "Enter your details to receive a one-time password by email."
              : `Enter the OTP sent to ${email}.`}
          </p>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {message && (
            <div
              role="status"
              className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-green-700"
            >
              {message}
            </div>
          )}

          {stage === "details" ? (
            <form onSubmit={handleRequestOtp} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="customer-name"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Full name
                </label>
                <input
                  id="customer-name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-rose-500"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label
                  htmlFor="customer-email"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Email address
                </label>
                <input
                  id="customer-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-rose-500"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="customer-phone"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Mobile number
                </label>
                <input
                  id="customer-phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-rose-500"
                  placeholder="Enter your mobile number"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-rose-600 px-4 py-3 font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending OTP..." : "Send email OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="customer-otp"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  One-time password
                </label>
                <input
                  id="customer-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 text-center text-xl tracking-[0.4em] outline-none focus:border-rose-500"
                  placeholder="000000"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full rounded-lg bg-rose-600 px-4 py-3 font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStage("details");
                  setOtp("");
                  setError("");
                  setMessage("");
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Change details
              </button>
            </form>
          )}

          <p className="mt-6 text-xs leading-5 text-gray-400">
            Never share your OTP with anyone. Your session is managed securely
            by the Manpasand server.
          </p>
        </div>
      </div>
    </div>
  );
};
