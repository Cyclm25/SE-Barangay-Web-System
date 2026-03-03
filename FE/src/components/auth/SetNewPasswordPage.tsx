import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { toast } from "sonner";
import imgImage1 from "../../assets/citybg.png";
import imgImage2 from "../../assets/barangaylogo.png";
import { api } from "../../utils/api";

type Identity = {
  type: "resident" | "barangayadmin";
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
    <div className="h-screen w-screen bg-white flex flex-col md:flex-row overflow-hidden">
      <div className="flex-1 relative flex flex-col items-center justify-center p-4 md:p-8">
        <div className="mb-4 md:mb-0 md:absolute md:top-[195px] md:left-[127px] w-[100px] h-[100px] md:w-[203px] md:h-[203px]">
          <img src={imgImage2} alt="Barangay Logo" className="w-full h-full object-cover" />
        </div>

        <div className="flex flex-col items-center mt-2 md:mt-[-50px]">
          <p className="text-[#2957a1] text-[18px] md:text-[40px] font-semibold text-center">WELCOME TO</p>
          <p className="text-[#2957a1] text-[32px] md:text-[64px] font-extrabold text-center leading-tight mt-1">
            BARANGAY 160
          </p>
          <div className="w-[280px] md:w-[489px] h-[2px] bg-[#2957a1] mt-2 md:mt-4" />
          <p className="text-[#6287c2] text-[12px] md:text-[15px] font-bold text-center mt-2 md:mt-3">
            Zone 14, District 2 Tondo, Manila
          </p>
        </div>

        <div className="absolute bottom-0 left-[-24px] w-[600px] md:w-[969px] h-[250px] md:h-[397px] opacity-80">
          <img src={imgImage1} alt="City Background" className="w-full h-full object-cover" />
        </div>
      </div>

      <div className="w-full md:w-[421px] bg-[#2957a1] flex items-center justify-center relative p-4 md:p-0">
        <div className="w-full max-w-[367px] bg-white rounded-[15px] p-6 md:p-8 relative">
          <h1 className="text-[#2957a1] text-[22px] md:text-[24px] font-bold mb-2">Set New Password</h1>

          <p className="text-sm text-[rgba(0,0,0,0.61)] mb-6 leading-relaxed">
            We found your Gmail: <span className="font-bold">{identity.email}</span>
            <br />
            Are you <span className="font-bold">{identity.firstName || "this user"}</span> with the username{" "}
            <span className="font-bold">{identity.username}</span>?
          </p>

          <form onSubmit={handleResetPassword} className="space-y-5 md:space-y-6">
            <div className="space-y-2">
              <label className="text-[rgba(0,0,0,0.64)] text-[11px] font-semibold">Enter new password</label>
              <label className="text-[#2957a1] text-[15px] md:text-[16px] font-semibold block">New Password</label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-[48px] md:h-[51px] bg-white border-[#2957a1] rounded-[5px] text-[#2957a1] text-[14px] md:text-[16px] px-4 pr-12"
                  placeholder="Enter new password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[rgba(0,0,0,0.64)] text-[11px] font-semibold">Enter confirm new password</label>
              <label className="text-[#2957a1] text-[15px] md:text-[16px] font-semibold block">Confirm Password</label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-[48px] md:h-[51px] bg-white border-[#2957a1] rounded-[5px] text-[#2957a1] text-[14px] md:text-[16px] px-4 pr-12"
                  placeholder="Confirm new password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {confirmPassword && (
              <div className="space-y-2 text-xs">
                <div className={`flex items-center gap-2 ${passwordsMatch ? "text-green-600" : "text-red-600"}`}>
                  {passwordsMatch ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  <span>Passwords match</span>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || (confirmPassword.length > 0 && !passwordsMatch)}
              className="w-full h-[43px] bg-[#2957a1] hover:bg-[#1e3f7a] text-white text-[16px] md:text-[18px] font-semibold rounded-md border border-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Resetting Password..." : "Reset Password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}