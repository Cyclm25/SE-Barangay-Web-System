import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { toast } from "sonner";
import imgImage3 from "../../assets/citybg.png";
import { api } from "../../utils/api";


type Identity = {
  type: "resident" | "barangayadmin";
  email: string;
  firstName: string;
  username: string;
};

interface ForgotPasswordProps {
  onBack: () => void;
  onOTPVerified: (payload: { residentAccountId: number; otpCode: string; identity: Identity }) => void;
}

export default function ForgotPassword({ onBack, onOTPVerified }: ForgotPasswordProps) {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const maskEmail = (addr: string) => {
    const [localPart, domain] = addr.split("@");
    if (!localPart || !domain) return addr;
    const masked = localPart.substring(0, 1) + "****" + localPart.substring(localPart.length - 1);
    return `${masked}@${domain}`;
  };

  const handleSendOTP = async () => {
    const e = email.trim().toLowerCase();

    if (!e) return toast.error("Please enter your Gmail");
    if (!/^[^\s@]+@gmail\.com$/i.test(e)) return toast.error("Only Gmail addresses are allowed");
    if (e.length > 100) return toast.error("Email too long");

    try {
      setIsLoading(true);

      const res = await api.post("/auth/forgot-password", { email: e });

      const ident = res?.data?.identity as Identity | undefined;
      if (!ident?.email || !ident?.username) {
        toast.error("Server error", { description: "Missing identity data from server." });
        return;
      }

      setIdentity(ident);
      setMaskedEmail(maskEmail(ident.email));
      setStep("otp");

      toast.success(`OTP has been sent to ${maskEmail(ident.email)}`);
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error || err?.response?.data?.message;

      if (status === 404) toast.error("No Gmail address linked to it");
      else toast.error("Failed to send OTP", { description: msg || "Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const e = email.trim().toLowerCase();
    const code = otp.trim();

    if (!code) return toast.error("Please enter the OTP");
    if (!/^\d{6}$/.test(code)) return toast.error("OTP must be 6 digits");
    if (!identity) return toast.error("Missing identity. Please resend OTP.");

    try {
      setIsLoading(true);

      const res = await api.post("/auth/verify-otp", { email: e, otpCode: code });

      const residentAccountId = Number(res?.data?.residentAccountId);
      const verifiedIdentity = res?.data?.identity as Identity | undefined;

      if (!Number.isFinite(residentAccountId) || residentAccountId <= 0) {
        toast.error("Verification failed", { description: "Missing residentAccountId from server." });
        return;
      }
      if (!verifiedIdentity?.username) {
        toast.error("Verification failed", { description: "Missing identity from server." });
        return;
      }

      toast.success("OTP verified successfully!");
      onOTPVerified({ residentAccountId, otpCode: code, identity: verifiedIdentity });
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message;
      toast.error("Invalid OTP", { description: msg || "Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    await handleSendOTP();
  };

  return (
    <div className="h-screen w-screen bg-[#2957a1] flex items-center justify-center relative overflow-hidden p-4">
      <div className="absolute left-[-24px] bottom-0 w-[400px] md:w-[823px] h-[200px] md:h-[337px] opacity-80">
        <img src={imgImage3} alt="City Background" className="w-full h-full object-cover" />
      </div>
      <div className="absolute right-[-24px] bottom-0 w-[450px] md:w-[918px] h-[220px] md:h-[376px] opacity-80">
        <img src={imgImage3} alt="City Background" className="w-full h-full object-cover" />
      </div>

      <div className="bg-white w-full max-w-[517px] rounded-[15px] p-6 md:p-12 relative z-10 shadow-2xl">
        {step === "email" ? (
          <>
            <h1 className="text-[#2957a1] text-[22px] md:text-[24px] font-bold mb-6">Forgot Password</h1>

            <div className="space-y-4 mb-8">
              <p className="text-[rgba(0,0,0,0.61)] text-[14px] md:text-[15px] leading-relaxed">
                Please enter your Gmail address to receive a One-Time Password (OTP) for password recovery.
              </p>

              <div className="space-y-2">
                <label className="text-[rgba(0,0,0,0.64)] text-[13px] font-semibold">Gmail Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your Gmail"
                  className="w-full h-[48px] md:h-[51px] border-[#2957a1] text-[14px] md:text-[16px]"
                  disabled={isLoading}
                  onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Button
                type="button"
                onClick={handleSendOTP}
                disabled={isLoading}
                className="w-full h-[43px] bg-[#2957a1] hover:bg-[#1e3f7a] text-white text-[16px] md:text-[18px] font-semibold rounded-md"
              >
                {isLoading ? "Sending OTP..." : "Send OTP"}
              </Button>

              <Button
                type="button"
                onClick={onBack}
                variant="outline"
                className="w-full h-[43px] border-[#2957a1] text-[#2957a1] hover:bg-gray-50 text-[15px] md:text-[16px] font-semibold rounded-md"
              >
                Back to Login
              </Button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-[#2957a1] text-[22px] md:text-[24px] font-bold mb-6">Forgot Password</h1>

            <div className="space-y-4 mb-8">
              <div className="text-[rgba(0,0,0,0.61)] text-[14px] md:text-[15px] leading-relaxed space-y-3">
                <p>
                  We found your Gmail: <span className="font-bold">{maskedEmail}</span>
                </p>

                <p>
                  Are you <span className="font-bold">{identity?.firstName || "this user"}</span> with the username{" "}
                  <span className="font-bold">{identity?.username || ""}</span>?
                </p>

                <p>An OTP (One-Time Password) has been sent to this email.</p>
                <p>Enter the OTP below to verify your identity before resetting your password.</p>
              </div>

              <div className="space-y-2 pt-4">
                <label className="text-[rgba(0,0,0,0.64)] text-[13px] font-semibold">Please enter OTP here</label>
                <Input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter OTP"
                  className="w-full h-[48px] md:h-[51px] border-[#2957a1] text-center text-base md:text-lg tracking-widest"
                  maxLength={6}
                  disabled={isLoading}
                  onKeyDown={(e) => e.key === "Enter" && handleVerifyOTP()}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Button
                type="button"
                onClick={handleVerifyOTP}
                disabled={isLoading || otp.length !== 6}
                className="w-full h-[43px] bg-[#2957a1] hover:bg-[#1e3f7a] text-white text-[16px] md:text-[18px] font-semibold rounded-md"
              >
                {isLoading ? "Verifying..." : "Confirm"}
              </Button>

              <Button
                type="button"
                onClick={onBack}
                variant="outline"
                className="w-full h-[43px] border-[#2957a1] text-[#2957a1] hover:bg-gray-50 text-[15px] md:text-[16px] font-semibold rounded-md"
              >
                Back to Login
              </Button>

              <button
                type="button"
                onClick={handleResend}
                disabled={isLoading}
                className="w-full text-[#2957a1] text-[12px] md:text-[13px] font-medium hover:underline disabled:opacity-60"
              >
                Resend OTP
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}