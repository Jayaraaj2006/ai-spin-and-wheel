import { useState } from 'react';
import { Lock, KeyRound, Eye, EyeOff, ShieldAlert, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { authenticateOrganizer } from '../services/authService';

export default function OrganizerAuthGate({ onAuthorized, onCancel }) {
  const [passkey, setPasskey] = useState('');
  const [showPasskey, setShowPasskey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passkey.trim()) {
      setError('Please enter the organizer authorization passkey.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await authenticateOrganizer(passkey.trim());
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onAuthorized(result.session);
        }, 500);
      } else {
        setError(result.error || 'Authorization failed. Please check your credentials.');
      }
    } catch (err) {
      setError(err?.message || 'Authentication error encountered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 sm:py-16">
      <div className="relative rounded-xl bg-[#1D2024] border border-[#3A3B3A] p-6 sm:p-8 shadow-2xl shadow-black/60">
        <div className="relative z-10 text-center">
          {/* Header Icon */}
          <div className="mx-auto w-12 h-12 rounded-xl bg-[#101216] border border-[#3A3B3A] flex items-center justify-center mb-5">
            <Lock className="w-6 h-6 text-[#D9653B]" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-[#F2EEE5] tracking-tight mb-1">
            Organizer <span className="text-[#D9653B]">Command Center</span>
          </h2>
          <p className="text-xs font-['IBM_Plex_Mono'] text-[#B9B3A8] mb-6">
            Authorized Symposium Staff • Secure Access Required
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-4 text-left">
            <div>
              <label
                htmlFor="organizer-passkey"
                className="block text-xs font-['IBM_Plex_Mono'] font-semibold text-[#B9B3A8] uppercase tracking-wider mb-2"
              >
                Organizer Passkey
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B9B3A8]">
                  <KeyRound className="w-4 h-4 text-[#D9653B]" />
                </div>
                <input
                  id="organizer-passkey"
                  name="organizerPasskey"
                  type={showPasskey ? 'text' : 'password'}
                  autoComplete="current-password"
                  autoFocus
                  value={passkey}
                  onChange={(e) => {
                    setPasskey(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter access passkey..."
                  disabled={loading || success}
                  className={`w-full pl-10 pr-10 py-3 rounded-lg bg-[#101216] border text-[#F2EEE5] placeholder:text-[#B9B3A8]/50 text-sm font-['DM_Sans'] transition duration-200 focus:outline-none focus:ring-1 ${
                    error
                      ? 'border-rose-500 focus:ring-rose-500/30'
                      : 'border-[#3A3B3A] hover:border-[#6F8799]/60 focus:border-[#D9653B] focus:ring-[#D9653B]/30'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPasskey(!showPasskey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#B9B3A8] hover:text-[#F2EEE5] transition cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPasskey ? 'Hide passkey' : 'Show passkey'}
                >
                  {showPasskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mt-2.5 flex items-start gap-2 p-2.5 rounded-lg bg-[#101216] border border-rose-500/40 text-rose-300 text-xs font-['DM_Sans']"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div
                  role="status"
                  className="mt-2.5 flex items-center gap-2 p-2.5 rounded-lg bg-[#101216] border border-[#657568] text-[#657568] text-xs font-['DM_Sans'] font-semibold"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#657568]" />
                  <span>Authorized! Loading Organizer Command Center...</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              id="organizer-auth-submit"
              disabled={loading || success}
              className="w-full py-3 px-4 rounded-lg bg-[#D9653B] hover:bg-[#E27750] active:bg-[#C2552E] text-[#F2EEE5] font-['Space_Grotesk'] font-bold text-sm tracking-wide shadow-md active:scale-[0.99] transition duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Authenticate &amp; Open Command Center</span>
              )}
            </button>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-2 px-3 text-xs text-[#B9B3A8] hover:text-[#F2EEE5] font-['DM_Sans'] flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Participant View</span>
              </button>
            )}
          </form>

          <p className="mt-6 pt-4 border-t border-[#3A3B3A] text-[11px] font-['IBM_Plex_Mono'] text-[#B9B3A8]/70 text-center leading-relaxed">
            Access is protected by cryptographic SHA-256 validation. Authorization sessions expire automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
