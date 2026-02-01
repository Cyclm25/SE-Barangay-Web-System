import { useState, useEffect } from 'react';
import axios from 'axios';

const ForgotPassword = ({ onBack, username }) => {
    const [step, setStep] = useState(1);
    const [maskedEmail, setMaskedEmail] = useState("");
    const [sentOtp, setSentOtp] = useState("");
    const [otpInput, setOtpInput] = useState("");
    const [timer, setTimer] = useState(120);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    useEffect(() => {
        if (username) {
            handleSendOTP();
        } else {
            alert("Please enter your email/username first.");
            onBack();
        }
    }, [username]);

    useEffect(() => {
        let interval = null;
        if (timer > 0 && step === 1) {
            interval = setInterval(() => setTimer(prev => prev - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timer, step]);

    const handleSendOTP = async () => {
        try {
            const res = await axios.post("http://localhost:5000/auth/forgot-password", { username });
            setSentOtp(res.data.otp.toString()); 
            setMaskedEmail(res.data.maskedEmail);
            setTimer(120);
        } catch (err) {
            alert("Error sending OTP. Please try again.");
            onBack();
        }
    };

    const handleVerifyOTP = () => {
        // String comparison at pagtanggal ng spaces
        if (otpInput.trim() === sentOtp.trim()) {
            setStep(2);
        } else {
            alert("Invalid OTP. Please check the code sent to your email.");
        }
    };

    const handleResetPassword = async () => {
        if (newPassword !== confirmPassword) {
            return alert("Passwords do not match!");
        }
        try {
            await axios.put("http://localhost:5000/auth/reset-password", { username, newPassword });
            alert("Password reset successful!");
            onBack();
        } catch (err) {
            alert("Failed to reset password.");
        }
    };

    return (
        <div className="flex h-screen w-full bg-[#2b59ac] items-center justify-center p-8">
            <div className="w-full max-w-md bg-white/10 p-10 rounded-3xl backdrop-blur-md border border-white/20 shadow-2xl text-white">
                
                {step === 1 ? (
                    <>
                        <h2 className="text-3xl font-bold mb-4">OTP Verification</h2>
                        <p className="text-sm text-white/80 mb-6">
                            OTP sent to: <span className="font-bold">{maskedEmail || "Loading..."}</span>
                        </p>

                        <div className="text-center mb-6 bg-black/20 py-2 rounded-lg">
                            <p className="text-xs uppercase tracking-widest text-white/60">Expires in</p>
                            <p className="text-2xl font-mono font-bold text-green-400">
                                {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                            </p>
                        </div>

                        <input 
                            type="text" 
                            placeholder="Enter 6-digit OTP"
                            className="w-full p-4 rounded-xl bg-white text-black mb-6 outline-none focus:ring-4 focus:ring-green-400"
                            onChange={(e) => setOtpInput(e.target.value)}
                        />

                        <button 
                            onClick={handleVerifyOTP}
                            className="w-full bg-[#4ade80] hover:bg-green-500 py-4 rounded-xl font-bold text-xl transition-all"
                            disabled={timer === 0}
                        >
                            Confirm OTP
                        </button>

                        {timer === 0 && (
                            <button onClick={handleSendOTP} className="mt-4 text-blue-300 underline block w-full text-center">
                                Resend Code
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        <h2 className="text-3xl font-bold mb-4">New Password</h2>
                        <p className="text-sm text-white/80 mb-6">Enter your new password below.</p>
                        
                        <input 
                            type="password" 
                            placeholder="New Password"
                            className="w-full p-4 rounded-xl bg-white text-black mb-4 outline-none"
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <input 
                            type="password" 
                            placeholder="Confirm Password"
                            className="w-full p-4 rounded-xl bg-white text-black mb-6 outline-none"
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />

                        <button 
                            onClick={handleResetPassword}
                            className="w-full bg-[#4ade80] hover:bg-green-500 py-4 rounded-xl font-bold text-xl"
                        >
                            Reset Password
                        </button>
                    </>
                )}

                <button onClick={onBack} className="mt-8 text-xs text-white/50 block text-center w-full hover:text-white">
                    Back to Login
                </button>
            </div>
        </div>
    );
};

export default ForgotPassword;