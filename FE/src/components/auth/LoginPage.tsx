import { useState, FormEvent } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { 
  Eye, 
  EyeOff, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Heart, 
  Shield, 
  FileText, 
  Users, 
  Building2,
  Target,
  ChevronRight,
  FileCheck
} from 'lucide-react';
import { toast } from 'sonner';
import imgImage1 from "../../assets/citybg.png";
import imgImage2 from "../../assets/barangaylogo.png";

interface LoginPageProps {
  // Updated to pass the 3 required fields to your App.tsx normalization logic
  onLoginSuccess: (username: string, role: string, firstName: string) => void;
  onForgotPassword: () => void;
}

const officials = [
  { name: 'Roberto Martinez', position: 'Barangay Captain', image: 'https://images.unsplash.com/photo-1717985498747-f081679d2c33?q=80&w=1080' },
  { name: 'Maria Santos', position: 'Barangay Kagawad', image: 'https://images.unsplash.com/photo-1718006915613-bcb972cabdb1?q=80&w=1080' },
  { name: 'Juan Dela Cruz', position: 'Barangay Kagawad', image: 'https://images.unsplash.com/photo-1738566061505-556830f8b8f5?q=80&w=1080' },
  { name: 'Ana Reyes', position: 'Barangay Secretary', image: 'https://images.unsplash.com/photo-1581065178026-390bc4e78dad?q=80&w=1080' }
];

export function LoginPage({ onLoginSuccess, onForgotPassword }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mobileTab, setMobileTab] = useState<'login' | 'about'>('login');

  // REAL BACKEND LOGIN LOGIC
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:5001/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ residentId: username, password: password }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Login successful! Welcome, ${data.firstName}.`);
        // Passes real DB data to App.tsx for role mapping (SuperAdmin -> Admin, Admin -> Official)
        onLoginSuccess(username, data.role || data.Role, data.firstName);
      } else {
        toast.error(typeof data === 'string' ? data : data.message || "Invalid ID or Password");
      }
    } catch (err) {
      toast.error("Could not connect to server. Check your backend!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-[1920px] h-screen flex flex-col md:flex-row">
        
        {/* LEFT SIDE: SCROLLABLE INFO (60%) */}
        <div className="hidden md:flex md:w-[60%] shrink-0 relative flex-col bg-white overflow-hidden border-r border-slate-100">
          <div className="w-full h-full overflow-y-auto px-8 py-10">
            {/* Fix for "Far Apart": content aligned to the right edge of this panel */}
            <div className="w-full max-w-[750px] md:ml-auto md:mr-4 space-y-8">
              
              <div className="bg-white pt-10 pb-8 px-8 rounded-3xl shadow-xl border-t-8 border-blue-600 text-center relative overflow-hidden">
                <div className="flex flex-col items-center">
                  <img src={imgImage2} alt="Logo" className="w-[120px] h-[120px] mx-auto mb-6 rounded-full shadow-md border-4 border-slate-50" />
                  <h2 className="text-slate-400 text-xs font-bold tracking-[0.25em] uppercase mb-2">Welcome To</h2>
                  <h1 className="text-slate-900 text-[44px] font-black leading-none tracking-tight mb-4 uppercase">BARANGAY 160</h1>
                  <div className="flex items-center gap-2 bg-slate-50 px-5 py-3 rounded-full w-fit mx-auto border border-slate-100">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <p className="text-[#2957a1] text-[14px] font-semibold">Zone 14, District 2 Tondo, Manila</p>
                  </div>
                </div>
              </div>

              <div className="relative rounded-3xl overflow-hidden shadow-2xl h-[280px]">
                <img src="https://images.unsplash.com/photo-1759860002197-9ef0e886b7ff?q=80&w=1080" alt="Building" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2957a1]/90 via-[#2957a1]/40 to-transparent flex items-end p-8 text-white">
                  <div><h3 className="text-2xl font-bold">Our Community</h3><p className="opacity-90 italic">Serving since 1985</p></div>
                </div>
              </div>

              <div className="bg-[#1e3a8a] rounded-3xl p-10 text-white shadow-xl">
                 <div className="flex items-center gap-4 mb-5"><Shield size={24} /><h3 className="text-2xl font-bold">About Us</h3></div>
                 <p className="text-blue-50 leading-relaxed text-[15px]">A progressive community dedicated to serving residents with excellence and integrity since 1985.</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100">
                  <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mb-4"><Heart className="text-blue-600" /></div>
                  <h3 className="text-[#2957a1] font-bold mb-2">Our Mission</h3>
                  <p className="text-slate-500 text-sm">To provide quality services and ensure the safety of all residents.</p>
                </div>
                <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100">
                  <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mb-4"><Target className="text-blue-600" /></div>
                  <h3 className="text-[#2957a1] font-bold mb-2">Our Vision</h3>
                  <p className="text-slate-500 text-sm">A united, prosperous, and peaceful barangay for every individual.</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#2957a1] to-[#1e4380] rounded-3xl shadow-xl p-8 text-white">
                <h3 className="text-[20px] font-bold mb-6 flex items-center gap-3"><Users /> Meet Our Leaders</h3>
                <div className="space-y-4">
                  {officials.map((o, i) => (
                    <div key={i} className="bg-white/10 backdrop-blur-sm border border-white/20 p-4 rounded-2xl flex items-center gap-4 hover:bg-white/20 transition-all">
                      <img src={o.image} alt={o.name} className="w-14 h-14 rounded-full object-cover border-2 border-white/50" />
                      <div><p className="font-bold">{o.name}</p><p className="text-blue-200 text-xs">{o.position}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-[200px] opacity-10 pointer-events-none">
            <img src={imgImage1} alt="Decoration" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* RIGHT SIDE: STICKY LOGIN (40% - Color set to White/Gray) */}
        <div className="w-full md:w-[40%] shrink-0 bg-slate-50 flex flex-col md:items-center md:justify-center relative p-8 h-screen md:sticky md:top-0">
          {/* Fix for "Far Apart": content aligned to the left edge of this panel */}
          <div className="w-full max-w-[400px] bg-white rounded-3xl p-10 shadow-2xl relative z-10 md:ml-4 md:mr-auto">
            <h2 className="text-[#1e3a8a] text-[36px] font-black text-center mb-8 uppercase tracking-tight">Log in</h2>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-slate-900 text-[11px] font-black uppercase tracking-widest ml-1">Resident ID / Username</label>
                <Input
                  type="text"
                  placeholder="Enter ID"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-12 rounded-xl border-slate-200 bg-blue-50/30 text-slate-900 px-5 focus:ring-2 focus:ring-blue-500 transition-all"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <label className="text-slate-900 text-[11px] font-black uppercase tracking-widest ml-1">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 rounded-xl border-slate-200 bg-blue-50/30 text-slate-900 px-5 focus:ring-2 focus:ring-blue-500 transition-all"
                    disabled={isLoading}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3 text-slate-400 hover:text-blue-600">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full h-12 bg-[#5CE36C] hover:bg-[#4bc95b] text-white text-[16px] font-bold rounded-xl shadow-lg mt-4 transition-transform active:scale-95">
                {isLoading ? "Signing in..." : "Log In"}
              </Button>
              <div className="text-center mt-4">
                 <button type="button" onClick={onForgotPassword} className="text-slate-500 text-[12px] font-bold hover:text-blue-600 transition-colors underline-offset-4">
                   Forgot Password?
                 </button>
              </div>
            </form>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-[150px] opacity-10 pointer-events-none md:hidden">
            <img src={imgImage1} alt="City Background" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </div>
  );
}