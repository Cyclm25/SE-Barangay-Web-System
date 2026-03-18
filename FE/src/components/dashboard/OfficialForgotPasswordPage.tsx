import { useState } from "react";
import { Eye, EyeOff, Lock, ArrowLeft } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { toast } from "sonner";
import imgCity from "../../assets/citybg.png";
import imgLogo from "../../assets/barangaylogo.png";
import { api } from "../../utils/api";

interface OfficialForgotPasswordPageProps {
  official: {
    adminname: string;
    barangayadminid: string;
    email: string;
  };
  onBack: () => void;
}

export function OfficialForgotPasswordPage({
  official,
  onBack,
}: OfficialForgotPasswordPageProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const passwordsMatch =
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const pw = newPassword.trim();
    const cpw = confirmPassword.trim();

    if (!pw || !cpw) {
      toast.error("Please fill in both password fields.");
      return;
    }

    if (pw !== cpw) {
      toast.error("Passwords do not match.");
      return;
    }

    if (!/^[A-Za-z0-9]{8,}$/.test(pw)) {
      toast.error("Password must be at least 8 characters and contain letters/numbers only");
      return;
    }

    try {
      setIsLoading(true);

      await api.post("/auth/admin/reset-password", {
        barangayAdminId: official.barangayadminid,
        newPassword: pw,
      });

      toast.success("Password changed successfully.");
      onBack();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message;
      toast.error("Reset failed", {
        description: msg || "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-white">
      <div className="flex min-h-[calc(100vh-0px)] flex-col overflow-hidden md:flex-row">
        <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-white px-6 py-16 md:px-10">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            className="absolute left-4 top-4 z-20 gap-2 text-[#2957a1] hover:bg-blue-50 hover:text-[#1e3f7a]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Officials
          </Button>

          <div className="relative z-10 mx-auto flex w-full max-w-[760px] flex-col items-center text-center">
            <div className="mb-6 h-[96px] w-[96px] md:mb-8 md:h-[140px] md:w-[140px]">
              <img src={imgLogo} alt="Barangay Logo" className="h-full w-full object-contain" />
            </div>

            <p className="text-center text-[18px] font-semibold tracking-[0.08em] text-[#2957a1] md:text-[34px]">
              OFFICIAL ACCOUNT
            </p>
            <p className="mt-2 text-center text-[36px] font-extrabold leading-[0.95] text-[#2957a1] md:text-[72px]">
              PASSWORD RESET
            </p>
            <div className="mt-5 h-[2px] w-[260px] bg-[#2957a1] md:w-[520px]" />
            <p className="mt-4 max-w-[620px] text-center text-[13px] font-bold text-[#6287c2] md:text-[18px]">
              Change the barangay official password directly from the admin panel
            </p>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 flex justify-center opacity-30">
            <img
              src={imgCity}
              alt="City Background"
              className="h-[220px] w-[720px] object-cover md:h-[360px] md:w-[1120px]"
            />
          </div>
        </div>

        <div className="relative flex w-full items-center justify-center bg-[#2957a1] p-4 md:w-[460px] md:p-8">
          <div className="relative w-full max-w-[390px] rounded-[20px] bg-white p-6 shadow-2xl md:p-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-full bg-blue-50 p-2">
                <Lock className="h-5 w-5 text-[#2957a1]" />
              </div>
              <div>
                <h1 className="text-[22px] font-bold text-[#2957a1] md:text-[24px]">
                  Forgot Password
                </h1>
              </div>
            </div>

            <p className="mb-6 text-sm leading-relaxed text-[rgba(0,0,0,0.61)]">
              You are changing the password for{" "}
              <span className="font-bold">{official.adminname}</span>
              <br />
              Username: <span className="font-bold">{official.barangayadminid}</span>
              <br />
              Gmail Address: <span className="font-bold">{official.email}</span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
              <div className="space-y-2">
                <label className="block text-[15px] font-semibold text-[#2957a1] md:text-[16px]">
                  New Password
                </label>
                <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="h-[48px] border-[#2957a1] bg-white px-4 pr-12 text-[14px] text-[#2957a1] md:h-[51px] md:text-[16px]"
                  disabled={isLoading}
                />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[15px] font-semibold text-[#2957a1] md:text-[16px]">
                  Confirm Password
                </label>
                <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="h-[48px] border-[#2957a1] bg-white px-4 pr-12 text-[14px] text-[#2957a1] md:h-[51px] md:text-[16px]"
                  disabled={isLoading}
                />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {confirmPassword.length > 0 && (
                <p className={`text-xs ${passwordsMatch ? "text-green-600" : "text-red-600"}`}>
                  {passwordsMatch ? "Passwords match." : "Passwords do not match."}
                </p>
              )}

              <Button
                type="submit"
                disabled={isLoading || (confirmPassword.length > 0 && !passwordsMatch)}
                className="h-[43px] w-full rounded-md border border-white bg-[#2957a1] text-[16px] font-semibold text-white hover:bg-[#1e3f7a] disabled:cursor-not-allowed disabled:opacity-50 md:text-[18px]"
              >
                {isLoading ? "Changing Password..." : "Change Password"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
