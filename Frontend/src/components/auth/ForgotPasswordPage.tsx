import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner@2.0.3';
import imgImage3 from "figma:asset/f004727df308acf533cb5d04cec6ccdc85077998.png";

interface ForgotPasswordPageProps {
  onBack: () => void;
  onOTPVerified: () => void;
}

export function ForgotPasswordPage({ onBack, onOTPVerified }: ForgotPasswordPageProps) {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Mock OTP for testing
  const MOCK_OTP = '123456';

  const maskEmail = (email: string) => {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return email;
    const visibleChars = Math.min(2, localPart.length);
    const masked = localPart.substring(0, 1) + '****' + localPart.substring(localPart.length - 1);
    return `${masked}@${domain}`;
  };

  const handleSendOTP = () => {
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    // Simulate sending OTP
    setTimeout(() => {
      setMaskedEmail(maskEmail(email));
      setStep('otp');
      toast.success(`OTP has been sent to ${maskEmail(email)}`);
      toast.info(`For testing: OTP is ${MOCK_OTP}`);
      setIsLoading(false);
    }, 1000);
  };

  const handleVerifyOTP = () => {
    if (!otp) {
      toast.error('Please enter the OTP');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      if (otp === MOCK_OTP) {
        toast.success('OTP verified successfully!');
        onOTPVerified();
      } else {
        toast.error('Invalid OTP. Please try again.');
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="h-screen w-screen bg-[#2957a1] flex items-center justify-center relative overflow-hidden p-4">
      {/* Background Images */}
      <div className="absolute left-[-24px] bottom-0 w-[400px] md:w-[823px] h-[200px] md:h-[337px] opacity-80">
        <img 
          src={imgImage3} 
          alt="City Background" 
          className="w-full h-full object-cover" 
        />
      </div>
      <div className="absolute right-[-24px] bottom-0 w-[450px] md:w-[918px] h-[220px] md:h-[376px] opacity-80">
        <img 
          src={imgImage3} 
          alt="City Background" 
          className="w-full h-full object-cover" 
        />
      </div>

      {/* Forgot Password Card */}
      <div className="bg-white w-full max-w-[517px] rounded-[15px] p-6 md:p-12 relative z-10 shadow-2xl">
        {step === 'email' ? (
          <>
            <h1 className="text-[#2957a1] text-[22px] md:text-[24px] font-bold mb-6">
              Forgot Password
            </h1>

            <div className="space-y-4 mb-8">
              <p className="text-[rgba(0,0,0,0.61)] text-[14px] md:text-[15px] leading-relaxed">
                Please enter your email address to receive a One-Time Password (OTP) for password recovery.
              </p>

              <div className="space-y-2">
                <label className="text-[rgba(0,0,0,0.64)] text-[13px] font-semibold">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full h-[48px] md:h-[51px] border-[#2957a1] text-[14px] md:text-[16px]"
                  disabled={isLoading}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendOTP()}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleSendOTP}
                disabled={isLoading}
                className="w-full h-[43px] bg-[#2957a1] hover:bg-[#1e3f7a] text-white text-[16px] md:text-[18px] font-semibold rounded-md"
              >
                {isLoading ? 'Sending OTP...' : 'Send OTP'}
              </Button>

              <Button
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
            <h1 className="text-[#2957a1] text-[22px] md:text-[24px] font-bold mb-6">
              Forgot Password
            </h1>

            <div className="space-y-4 mb-8">
              <div className="text-[rgba(0,0,0,0.61)] text-[14px] md:text-[15px] leading-relaxed space-y-2">
                <p>We found your email:</p>
                <p className="font-bold text-center text-[15px] md:text-[16px]">{maskedEmail}</p>
                <p className="mt-4">
                  An OTP (One-Time Password) has been sent to this email.
                </p>
                <p className="mt-2">
                  Enter the OTP below to verify your identity before resetting your password.
                </p>
              </div>

              <div className="space-y-2 pt-4">
                <label className="text-[rgba(0,0,0,0.64)] text-[13px] font-semibold">
                  Please enter OTP here
                </label>
                <Input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter OTP"
                  className="w-full h-[48px] md:h-[51px] border-[#2957a1] text-center text-base md:text-lg tracking-widest"
                  maxLength={6}
                  disabled={isLoading}
                  onKeyPress={(e) => e.key === 'Enter' && handleVerifyOTP()}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleVerifyOTP}
                disabled={isLoading || otp.length !== 6}
                className="w-full h-[43px] bg-[#2957a1] hover:bg-[#1e3f7a] text-white text-[16px] md:text-[18px] font-semibold rounded-md"
              >
                {isLoading ? 'Verifying...' : 'Confirm'}
              </Button>

              <Button
                onClick={onBack}
                variant="outline"
                className="w-full h-[43px] border-[#2957a1] text-[#2957a1] hover:bg-gray-50 text-[15px] md:text-[16px] font-semibold rounded-md"
              >
                Back to Login
              </Button>

              <button
                onClick={handleSendOTP}
                className="w-full text-[#2957a1] text-[12px] md:text-[13px] font-medium hover:underline"
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