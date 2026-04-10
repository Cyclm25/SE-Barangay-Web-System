import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Eye, EyeOff, Check, X, MapPin } from "lucide-react";
import { toast } from "sonner";
import imgImage2 from "../../assets/barangaylogo.png";
import { api } from "../../utils/api";

type Identity = {
  type: "resident" | "barangayadmin" | "superadmin";
  email: string;
  firstName: string;
  username: string;
};

interface SetNewPasswordPageProps {
  residentAccountId: number;
  otpCode: string;
  identity: Identity;
  onPasswordReset: () => void;
}

export function SetNewPasswordPage({ residentAccountId, otpCode, identity, onPasswordReset }: SetNewPasswordPageProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const pw = newPassword.trim();
    const cpw = confirmPassword.trim();

    if (!residentAccountId || residentAccountId <= 0) {
      toast.error("Missing account reference. Verify OTP again.");
      return;
    }
    if (!otpCode) {
      toast.error("Missing OTP. Verify OTP again.");
      return;
    }
    if (!pw || !cpw) {
      toast.error("Please fill in all fields");
      return;
    }
    if (pw !== cpw) {
      toast.error("Passwords do not match");
      return;
    }
    if (!/^[A-Za-z0-9]{8,}$/.test(pw)) {
      toast.error("Password must be at least 8 characters and contain letters/numbers only");
      return;
    }

    try {
      setIsLoading(true);
      await api.post("/auth/reset-password", {
        residentAccountId,
        otpCode,
        newPassword: pw,
      });
      toast.success("Password reset successfully!");
      onPasswordReset();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message;
      toast.error("Reset failed", { description: msg || "Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-screen flex flex-col md:flex-row"
      style={{
        background: "linear-gradient(135deg, #dde9f7 0%, #eaf1fb 40%, #f0f5fc 70%, #e2ecf8 100%)",
      }}
    >
      {/* Left Panel — Branding (50%) */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-10">
        <div
          className="w-full max-w-[480px] bg-white rounded-2xl shadow-sm p-8 sm:p-10 flex flex-col items-center relative overflow-hidden"
          style={{ border: "1px solid rgba(41,87,161,0.08)" }}
        >
          {/* Decorative circles */}
          <div
            className="absolute top-[-40px] right-[-40px] w-[150px] h-[150px] rounded-full"
            style={{ background: "rgba(41,87,161,0.06)" }}
          />
          <div
            className="absolute bottom-[-30px] left-[-30px] w-[100px] h-[100px] rounded-full"
            style={{ background: "rgba(41,87,161,0.04)" }}
          />

          <img
            src={imgImage2}
            alt="Barangay Logo"
            className="w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] object-contain mb-5 relative z-10"
          />

          <div className="flex items-center gap-3 mb-1 relative z-10">
            <div className="h-px w-10 bg-[#2957a1] opacity-40" />
            <p className="text-[#2957a1] text-[12px] sm:text-[13px] font-semibold tracking-widest uppercase">
              Welcome to
            </p>
            <div className="h-px w-10 bg-[#2957a1] opacity-40" />
          </div>

          <p className="text-[#1e3f7a] text-[32px] sm:text-[40px] font-extrabold tracking-tight leading-tight relative z-10 text-center">
            BARANGAY 160
          </p>

          <div
            className="mt-4 px-4 py-2 rounded-full flex items-center gap-1.5 relative z-10"
            style={{ background: "rgba(41,87,161,0.08)" }}
          >
            <MapPin className="w-3.5 h-3.5 text-[#2957a1]" />
            <p className="text-[#2957a1] text-[12px] font-semibold">Zone 14, District 2 Tondo, Manila</p>
          </div>
        </div>
      </div>

      {/* Divider — vertical on desktop, horizontal on mobile */}
      <div
        className="hidden md:block w-px self-stretch my-10"
        style={{ background: "rgba(41,87,161,0.12)" }}
      />
      <div
        className="block md:hidden h-px mx-6"
        style={{ background: "rgba(41,87,161,0.12)" }}
      />

      {/* Right Panel — Form (50%) */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-10">
        <div
          className="w-full max-w-[480px] bg-white rounded-2xl shadow-md p-8 sm:p-10"
          style={{ border: "1px solid rgba(41,87,161,0.08)" }}
        >
          <h1 className="text-[#1e3f7a] text-[24px] sm:text-[28px] font-bold text-center mb-2">
            Set New Password
          </h1>

          <p className="text-center text-[13px] text-gray-500 mb-7 leading-relaxed">
            We found your Gmail:{" "}
            <span className="font-semibold text-[#2957a1]">{identity.email}</span>
            <br />
            Are you{" "}
            <span className="font-semibold text-gray-700">{identity.firstName || "this user"}</span>{" "}
            with the username{" "}
            <span className="font-semibold text-gray-700">{identity.username}</span>?
          </p>

          <form onSubmit={handleResetPassword} className="space-y-5">
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-[#1e3f7a] text-[14px] font-semibold block">New Password</label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-[48px] border-[#2957a1] rounded-lg text-[#1e3f7a] text-[14px] px-4 pr-11 focus:ring-2 focus:ring-[#2957a1]/20"
                  placeholder="Enter new password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2957a1] transition-colors"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-[#1e3f7a] text-[14px] font-semibold block">Confirm Password</label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-[48px] border-[#2957a1] rounded-lg text-[#1e3f7a] text-[14px] px-4 pr-11 focus:ring-2 focus:ring-[#2957a1]/20"
                  placeholder="Confirm new password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2957a1] transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Password match indicator */}
            {confirmPassword && (
              <div
                className={`flex items-center gap-2 text-xs font-medium ${
                  passwordsMatch ? "text-green-600" : "text-red-500"
                }`}
              >
                {passwordsMatch ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                <span>Passwords {passwordsMatch ? "match" : "do not match"}</span>
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              disabled={isLoading || (confirmPassword.length > 0 && !passwordsMatch)}
              className="w-full h-[48px] rounded-full text-white text-[16px] font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2"
              style={{
                background:
                  isLoading || (confirmPassword.length > 0 && !passwordsMatch)
                    ? "#9ca3af"
                    : "linear-gradient(90deg, #22c55e 0%, #16a34a 100%)",
                border: "none",
                boxShadow: "0 4px 14px rgba(34,197,94,0.35)",
              }}
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}