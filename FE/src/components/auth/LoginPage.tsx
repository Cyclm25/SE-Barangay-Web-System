import { useState, useEffect, FormEvent } from 'react';
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
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import imgImage1 from "../../assets/citybg.png";
import imgImage2 from "../../assets/barangaylogo.png";
import imgCommunity from "../../assets/community.png";

interface LoginPageProps {
  onLoginSuccess: (username: string, role: string, firstName: string) => void;
  onForgotPassword: () => void;
}


interface Official {
  id: string;
  name: string;
  position: string;
  image: string | null;
}

export function LoginPage({ onLoginSuccess, onForgotPassword }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mobileTab, setMobileTab] = useState<'login' | 'about'>('login');

  // State to hold dynamic officials data
  const [officials, setOfficials] = useState<Official[]>([]);
  const [isLoadingOfficials, setIsLoadingOfficials] = useState(true);

  // Fetch officials data mapping your exact backend schema
  useEffect(() => {
    const fetchOfficials = async () => {
      try {
        const response = await fetch("https://se-barangay-web-system.onrender.com/api/officials");

        if (response.ok) {
          const data = await response.json();

          // Filter for active officials only and map backend keys to frontend keys
          const activeOfficials = data
            .filter((item: any) => item.status === true || item.status === "true")
            .map((item: any) => ({
              id: item.barangayadminid,
              name: item.adminname,
              position: item.position || 'Barangay Official',
              image: item.profileimage || null
            }));

          setOfficials(activeOfficials);
        } else {
          setOfficials([]);
        }
      } catch (error) {
        console.error("Error connecting to backend for officials:", error);
        setOfficials([]);
      } finally {
        setIsLoadingOfficials(false);
      }
    };

    fetchOfficials();
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("https://se-barangay-web-system.onrender.com/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ residentId: username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data?.error || data?.message || "Invalid ID or Password");
        return;
      }

      const normalizedToken = String(data.token || "").trim().replace(/^Bearer\s+/i, "");
      localStorage.setItem("token", normalizedToken);
      localStorage.setItem("authToken", normalizedToken);
      localStorage.setItem("jwt", normalizedToken);

      const u = data?.user ?? data;
      const role = u?.Role ?? u?.role ?? "";
      const displayName = u?.DisplayName ?? u?.displayName ?? "User";

      const residentId = u?.ResidentID ?? u?.residentId ?? null;
      const barangayAdminId = u?.BarangayAdminID ?? u?.barangayAdminId ?? null;
      const superAdminId = u?.SuperAdminID ?? u?.superAdminId ?? null;

      const userId = superAdminId || barangayAdminId || residentId;
      const userType = superAdminId
        ? "superadmin"
        : barangayAdminId
          ? "barangayadmin"
          : "resident";

      if (!userId) {
        toast.error("Login response missing user identifier.");
        return;
      }

      localStorage.setItem("userId", String(userId));
      localStorage.setItem("userType", userType);
      localStorage.setItem("role", String(role));
      localStorage.setItem("displayName", String(displayName));

      // Save position for SK Kagawad read-only enforcement
      const position = u?.Position ?? u?.position ?? "";
      localStorage.setItem("position", String(position));

      if (residentId) {
        localStorage.setItem("residentId", String(residentId));
      }

      toast.success(`Login successful! Welcome, ${displayName}.`);
      onLoginSuccess(String(userId), userType, String(displayName));
    } catch (err) {
      toast.error("Could not connect to server. Check your backend!");
    } finally {
      setIsLoading(false);
    }
  };

  // Reusable component for the Officials List to avoid code duplication 
  // between Desktop View and Mobile "About" Tab
  const OfficialsList = () => (
    <div className="bg-gradient-to-br from-[#2957a1] to-[#1e4380] rounded-3xl shadow-xl p-8 mb-8 mt-8">
      <div className="flex items-center gap-4 mb-3 text-white">
        <div className="bg-white/20 p-3 rounded-xl">
          <Users className="w-7 h-7" />
        </div>
        <h3 className="text-[20px] font-bold">Meet Our Leaders</h3>
      </div>
      <p className="text-white/80 text-[14px] mb-6">
        Dedicated public servants working for our community
      </p>

      {isLoadingOfficials ? (
        <div className="flex justify-center py-8">
          <p className="text-white/80 animate-pulse">Loading officials data...</p>
        </div>
      ) : officials.length === 0 ? (
        <div className="rounded-xl border border-white/20 bg-white/10 px-5 py-6 text-center text-white/80">
          No active barangay officials available.
        </div>
      ) : (
        <div className="space-y-4">
          {officials.map((official) => (
            <div
              key={official.id}
              className="bg-white/10 backdrop-blur-sm border border-white/20 p-5 rounded-xl hover:bg-white/20 transition-all group"
            >
              <div className="flex items-center gap-5">
                <div className="flex-shrink-0 relative">
                  <div className="absolute inset-0 bg-white/20 rounded-full blur-md" />
                  <img
                    src={
                      official.image ||
                      "https://ui-avatars.com/api/?name=" +
                        encodeURIComponent(official.name) +
                        "&background=2957a1&color=fff"
                    }
                    alt={official.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white/40 relative z-10 group-hover:scale-110 transition-transform bg-white"
                  />
                </div>

                <div className="flex-1">
                  <h3 className="text-white text-[16px] font-bold">
                    {official.name}
                  </h3>
                  <p className="text-white/80 text-[14px] font-medium mt-1">
                    {official.position}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-[1920px] h-screen flex flex-col md:flex-row">
        {/* Left Side - Welcome Section - Hidden on mobile */}
        <div className="hidden md:flex md:w-[60%] relative flex-col bg-gradient-to-br from-blue-50 via-white to-blue-100 overflow-hidden">
          <div className="w-full h-full overflow-y-auto px-8 py-10">
            <div className="w-full max-w-[700px] mx-auto">
              
              {/* Logo and Header */}
              <div className="bg-gradient-to-b from-white via-blue-50 to-white pt-10 pb-8 px-8 mb-8 rounded-3xl relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#2957a1]/5 rounded-full -mr-20 -mt-20" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-100/30 rounded-full -ml-24 -mb-24" />

                <div className="flex flex-col items-center relative z-10">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-[#2957a1]/10 rounded-full blur-xl scale-110" />
                    <img
                      src={imgImage2}
                      alt="Barangay Logo"
                      className="w-[130px] h-[130px] object-cover drop-shadow-2xl relative z-10 rounded-full border-4 border-[#2957a1]/20"
                    />
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-[2px] bg-gradient-to-r from-transparent to-[#2957a1]/40" />
                    <p className="text-[#2957a1] text-[14px] font-bold text-center tracking-[0.25em] uppercase">
                      Welcome To
                    </p>
                    <div className="w-12 h-[2px] bg-gradient-to-l from-transparent to-[#2957a1]/40" />
                  </div>

                  <div className="relative mb-3">
                    <h1 className="text-[#2957a1] text-[44px] font-black text-center leading-none tracking-tight">
                      BARANGAY 160
                    </h1>
                  </div>

                  <div className="flex items-center gap-2 bg-[#2957a1]/10 backdrop-blur-sm px-5 py-3 rounded-full border border-[#2957a1]/20">
                    <MapPin className="w-4 h-4 text-[#2957a1]" />
                    <p className="text-[#2957a1] text-[14px] font-semibold text-center tracking-wide">
                      Zone 14, District 2 Tondo, Manila
                    </p>
                  </div>
                </div>
              </div>

              {/* Hero Image */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl mb-8 group">
                <img
                  src={imgCommunity}
                  alt="Barangay Building"
                  className="w-full h-[280px] object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2957a1]/90 via-[#2957a1]/40 to-transparent flex items-end p-8">
                  <div>
                    <h3 className="text-white text-[24px] font-bold mb-1">Our Community</h3>
                    <p className="text-white/90 text-[15px]">Serving with dedication since 1985</p>
                  </div>
                </div>
              </div>

              {/* About Overview Card */}
              <div className="bg-gradient-to-br from-[#2957a1] to-[#1e4380] p-8 rounded-3xl shadow-xl text-white mb-8">
                <div className="flex items-center gap-4 mb-5">
                  <div className="bg-white/20 p-3.5 rounded-xl">
                    <Shield className="w-8 h-8" />
                  </div>
                  <h3 className="text-[20px] font-bold">About Barangay 160</h3>
                </div>
                <p className="text-white/95 text-[15px] leading-relaxed">
                  A progressive community dedicated to serving residents with excellence, integrity, and compassion since 1985. We strive to create a safe, sustainable, and thriving neighborhood for all families and individuals.
                </p>
              </div>

              {/* Mission & Vision */}
              <div className="bg-white border-2 border-[#2957a1]/20 rounded-3xl shadow-lg p-8 mb-8">
                <div className="flex items-center gap-4 mb-5">
                  <div className="bg-[#2957a1]/10 p-3 rounded-xl">
                    <Heart className="w-7 h-7 text-[#2957a1]" />
                  </div>
                  <h3 className="text-[#2957a1] text-[19px] font-bold">Our Mission</h3>
                </div>
                <p className="text-gray-700 text-[15px] leading-relaxed mb-8">
                  To provide quality services, promote community development, and ensure the safety and welfare of all residents through transparent governance and active citizen participation.
                </p>

                <div className="flex items-center gap-4 mb-5">
                  <div className="bg-[#2957a1]/10 p-3 rounded-xl">
                    <FileText className="w-7 h-7 text-[#2957a1]" />
                  </div>
                  <h3 className="text-[#2957a1] text-[19px] font-bold">Our Vision</h3>
                </div>
                <p className="text-gray-700 text-[15px] leading-relaxed">
                  A united, prosperous, and peaceful barangay where every resident has access to opportunities for growth, development, and a better quality of life.
                </p>
              </div>

              {/* Contact Information */}
              <div className="bg-gradient-to-br from-blue-50 to-white border-2 border-[#2957a1]/20 rounded-3xl shadow-lg p-8 mb-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-[#2957a1]/10 p-3 rounded-xl">
                    <Building2 className="w-7 h-7 text-[#2957a1]" />
                  </div>
                  <h3 className="text-[#2957a1] text-[19px] font-bold">Contact Information</h3>
                </div>

                <div className="space-y-5">
                  <div className="flex items-start gap-5">
                    <div className="bg-[#2957a1]/10 p-3 rounded-xl">
                      <MapPin className="w-6 h-6 text-[#2957a1]" />
                    </div>
                    <div>
                      <p className="text-gray-600 text-[12px] font-bold uppercase tracking-wider">Address</p>
                      <p className="text-gray-800 text-[15px] font-medium mt-1">Zone 14, District 2 Tondo, Manila</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-5">
                    <div className="bg-[#2957a1]/10 p-3 rounded-xl">
                      <Phone className="w-6 h-6 text-[#2957a1]" />
                    </div>
                    <div>
                      <p className="text-gray-600 text-[12px] font-bold uppercase tracking-wider">Phone</p>
                      <p className="text-gray-800 text-[15px] font-medium mt-1">(02) 8123-4567</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-5">
                    <div className="bg-[#2957a1]/10 p-3 rounded-xl">
                      <Mail className="w-6 h-6 text-[#2957a1]" />
                    </div>
                    <div>
                      <p className="text-gray-600 text-[12px] font-bold uppercase tracking-wider">Email</p>
                      <p className="text-gray-800 text-[15px] font-medium mt-1">barangay160@manila.gov.ph</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-5">
                    <div className="bg-[#2957a1]/10 p-3 rounded-xl">
                      <Clock className="w-6 h-6 text-[#2957a1]" />
                    </div>
                    <div>
                      <p className="text-gray-600 text-[12px] font-bold uppercase tracking-wider">Office Hours</p>
                      <p className="text-gray-800 text-[15px] font-medium mt-1">Monday - Friday: 8:00 AM - 5:00 PM</p>
                      <p className="text-gray-700 text-[14px] mt-1">Saturday: 8:00 AM - 12:00 PM</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Services Offered */}
              <div className="bg-white border-2 border-[#2957a1]/20 rounded-3xl shadow-lg p-8 mb-8">
                <h3 className="text-[#2957a1] text-[19px] font-bold mb-6 flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#2957a1]" />
                  Services We Offer
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    'Barangay Clearance',
                    'Certificate of Residency',
                    'Certificate of Indigency',
                    'Business Permit Assistance',
                    'Community Tax Certificate',
                    'Barangay ID Processing'
                  ].map((service, index) => (
                    <div key={index} className="flex items-center gap-4 py-3.5 px-5 bg-gradient-to-r from-blue-50 to-transparent rounded-xl border border-[#2957a1]/10 hover:border-[#2957a1]/30 transition-all">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#2957a1]" />
                      <p className="text-gray-700 text-[15px] font-medium">{service}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic Barangay Officials Rendering via Component */}
              <OfficialsList />

            </div>
          </div>

          <div className="absolute bottom-0 left-0 w-full h-[200px] opacity-10 pointer-events-none">
            <img src={imgImage1} alt="City Background" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Right Side - Mobile and Desktop - Takes up 40% (2/5) */}
        <div className="md:w-[40%] bg-gradient-to-br from-blue-50 via-white to-blue-100 md:bg-[#2957a1] flex flex-col md:items-center md:justify-center relative md:p-8 h-screen">
          
          {/* Mobile Header with Logo */}
          <div className="md:hidden w-full bg-gradient-to-b from-white via-blue-50 to-white pt-6 pb-5 px-4 flex-shrink-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#2957a1]/5 rounded-full -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-100/30 rounded-full -ml-20 -mb-20" />

            <div className="flex flex-col items-center relative z-10">
              <div className="relative mb-3">
                <div className="absolute inset-0 bg-[#2957a1]/10 rounded-full blur-xl scale-110" />
                <img
                  src={imgImage2}
                  alt="Barangay Logo"
                  className="w-[80px] h-[80px] object-cover drop-shadow-2xl relative z-10 rounded-full border-4 border-[#2957a1]/20"
                />
              </div>

              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-[2px] bg-gradient-to-r from-transparent to-[#2957a1]/40" />
                <p className="text-[#2957a1] text-[11px] font-bold text-center tracking-[0.2em] uppercase">
                  Welcome To
                </p>
                <div className="w-6 h-[2px] bg-gradient-to-l from-transparent to-[#2957a1]/40" />
              </div>

              <div className="relative mb-1.5">
                <h1 className="text-[#2957a1] text-[26px] font-black text-center leading-none tracking-tight">
                  BARANGAY 160
                </h1>
              </div>

              <div className="flex items-center gap-2 bg-[#2957a1]/10 backdrop-blur-sm px-4 py-2 rounded-full border border-[#2957a1]/20">
                <MapPin className="w-3.5 h-3.5 text-[#2957a1]" />
                <p className="text-[#2957a1] text-[10px] font-semibold text-center tracking-wide">
                  Zone 14, District 2 Tondo, Manila
                </p>
              </div>
            </div>
          </div>

          {/* Mobile Tabs */}
          <div className="md:hidden w-full bg-gradient-to-r from-blue-50 via-white to-blue-50 px-3 py-3 flex-shrink-0 z-30 shadow-sm">
            <div className="flex gap-2 p-1 bg-white/80 backdrop-blur-sm rounded-full border-2 border-[#2957a1]/20 shadow-md">
              <button
                className={`flex-1 py-2.5 px-3 text-[12px] font-bold rounded-full transition-all duration-300 relative overflow-hidden ${
                  mobileTab === 'login'
                    ? 'bg-gradient-to-r from-[#2957a1] to-[#1e4380] text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setMobileTab('login')}
              >
                {mobileTab === 'login' && <div className="absolute inset-0 bg-white/10 animate-pulse" />}
                <span className="relative z-10 flex items-center justify-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${mobileTab === 'login' ? 'bg-white' : 'bg-[#2957a1]'}`} />
                  Log In
                </span>
              </button>
              <button
                className={`flex-1 py-2.5 px-3 text-[12px] font-bold rounded-full transition-all duration-300 relative overflow-hidden ${
                  mobileTab === 'about'
                    ? 'bg-gradient-to-r from-[#2957a1] to-[#1e4380] text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setMobileTab('about')}
              >
                {mobileTab === 'about' && <div className="absolute inset-0 bg-white/10 animate-pulse" />}
                <span className="relative z-10 flex items-center justify-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${mobileTab === 'about' ? 'bg-white' : 'bg-[#2957a1]'}`} />
                  About Barangay
                </span>
              </button>
            </div>
          </div>

          {/* Content Container */}
          <div className="flex-1 w-full overflow-y-auto md:overflow-visible md:flex md:items-center md:justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 md:bg-transparent">
            
            {/* Login Content - Mobile */}
            {mobileTab === 'login' && (
              <div className="md:hidden w-full flex flex-col items-center justify-start px-4 pb-8 pt-4">
                <div className="w-full max-w-[400px] bg-white rounded-[20px] p-6 shadow-2xl border border-gray-100">
                  <h1 className="text-[#2957a1] text-[22px] font-bold text-center mb-6">
                    Log in to your account
                  </h1>

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[#2957a1] text-[13px] font-semibold">Username</label>
                      <Input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full h-[44px] bg-white border-2 border-[#2957a1]/30 focus:border-[#2957a1] rounded-xl text-[#2957a1] text-[14px] px-4 transition-all"
                        placeholder="Enter username"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[#2957a1] text-[13px] font-semibold">Password</label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full h-[44px] bg-white border-2 border-[#2957a1]/30 focus:border-[#2957a1] rounded-xl text-[#2957a1] text-[14px] px-4 pr-12 transition-all"
                          placeholder="Enter password"
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-4 flex items-center justify-center text-[#2957a1]/60 hover:text-[#2957a1] transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-[46px] bg-[#5CE36C] hover:bg-[#4bc95b] text-white text-[14px] font-bold rounded-full shadow-lg transition-all hover:shadow-xl transform hover:scale-[1.02] mt-4 opacity-100"
                    >
                      {isLoading ? 'Logging in...' : 'Log In'}
                    </Button>

                    <button
                      type="button"
                      onClick={onForgotPassword}
                      className="w-full text-[#2957a1] text-[12px] font-medium text-center hover:underline transition-all"
                    >
                      Forgot Password?
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* About Content - Mobile */}
            {mobileTab === 'about' && (
              <div className="md:hidden w-full px-4 py-5 pb-12 space-y-5">

                {/* Hero Image */}
                <div className="relative rounded-2xl overflow-hidden shadow-xl group">
                  <img
                    src="https://images.unsplash.com/photo-1759860002197-9ef0e886b7ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaGlsaXBwaW5lcyUyMGNvbW11bml0eSUyMGJ1aWxkaW5nfGVufDF8fHx8MTc2OTc0NzM0OXww&ixlib=rb-4.1.0&q=80&w=1080"
                    alt="Barangay Building"
                    className="w-full h-[180px] object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2957a1]/90 via-[#2957a1]/40 to-transparent flex items-end p-5">
                    <div>
                      <h3 className="text-white text-[18px] font-bold mb-0.5">Our Community</h3>
                      <p className="text-white/90 text-[13px]">Serving with dedication since 1985</p>
                    </div>
                  </div>
                </div>

                {/* About Overview Card */}
                <div className="bg-gradient-to-br from-[#2957a1] to-[#1e4380] p-5 rounded-2xl shadow-xl text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-white/20 p-2.5 rounded-xl">
                      <Shield className="w-5 h-5" />
                    </div>
                    <h3 className="text-[16px] font-bold">About Barangay 160</h3>
                  </div>
                  <p className="text-white/95 text-[13px] leading-relaxed">
                    A progressive community dedicated to serving residents with excellence, integrity, and compassion since 1985. We strive to create a safe, sustainable, and thriving neighborhood for all families and individuals.
                  </p>
                </div>

                {/* Mission & Vision */}
                <div className="bg-white border-2 border-[#2957a1]/20 rounded-2xl shadow-lg p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-[#2957a1]/10 p-2.5 rounded-xl">
                      <Heart className="w-5 h-5 text-[#2957a1]" />
                    </div>
                    <h3 className="text-[#2957a1] text-[15px] font-bold">Our Mission</h3>
                  </div>
                  <p className="text-gray-700 text-[13px] leading-relaxed mb-5">
                    To provide quality services, promote community development, and ensure the safety and welfare of all residents through transparent governance and active citizen participation.
                  </p>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-[#2957a1]/10 p-2.5 rounded-xl">
                      <FileText className="w-5 h-5 text-[#2957a1]" />
                    </div>
                    <h3 className="text-[#2957a1] text-[15px] font-bold">Our Vision</h3>
                  </div>
                  <p className="text-gray-700 text-[13px] leading-relaxed">
                    A united, prosperous, and peaceful barangay where every resident has access to opportunities for growth, development, and a better quality of life.
                  </p>
                </div>

                {/* Contact Information */}
                <div className="bg-gradient-to-br from-blue-50 to-white border-2 border-[#2957a1]/20 rounded-2xl shadow-lg p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-[#2957a1]/10 p-2.5 rounded-xl">
                      <Building2 className="w-5 h-5 text-[#2957a1]" />
                    </div>
                    <h3 className="text-[#2957a1] text-[15px] font-bold">Contact Information</h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      { icon: <MapPin className="w-4 h-4 text-[#2957a1]" />, label: 'Address', value: 'Zone 14, District 2 Tondo, Manila' },
                      { icon: <Phone className="w-4 h-4 text-[#2957a1]" />, label: 'Phone', value: '(02) 8123-4567' },
                      { icon: <Mail className="w-4 h-4 text-[#2957a1]" />, label: 'Email', value: 'barangay160@manila.gov.ph' },
                    ].map(({ icon, label, value }) => (
                      <div key={label} className="flex items-start gap-3">
                        <div className="bg-[#2957a1]/10 p-2 rounded-lg mt-0.5 flex-shrink-0">{icon}</div>
                        <div>
                          <p className="text-gray-600 text-[11px] font-bold uppercase tracking-wider">{label}</p>
                          <p className="text-gray-800 text-[13px] font-medium mt-0.5">{value}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-start gap-3">
                      <div className="bg-[#2957a1]/10 p-2 rounded-lg mt-0.5 flex-shrink-0">
                        <Clock className="w-4 h-4 text-[#2957a1]" />
                      </div>
                      <div>
                        <p className="text-gray-600 text-[11px] font-bold uppercase tracking-wider">Office Hours</p>
                        <p className="text-gray-800 text-[13px] font-medium mt-0.5">Monday – Friday: 8:00 AM – 5:00 PM</p>
                        <p className="text-gray-700 text-[12px] mt-0.5">Saturday: 8:00 AM – 12:00 PM</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Services Offered */}
                <div className="bg-white border-2 border-[#2957a1]/20 rounded-2xl shadow-lg p-5">
                  <h3 className="text-[#2957a1] text-[15px] font-bold mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#2957a1]" />
                    Services We Offer
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      'Barangay Clearance',
                      'Certificate of Residency',
                      'Certificate of Indigency',
                      'Business Permit Assistance',
                      'Community Tax Certificate',
                      'Barangay ID Processing'
                    ].map((service, index) => (
                      <div key={index} className="flex items-center gap-3 py-2.5 px-4 bg-gradient-to-r from-blue-50 to-transparent rounded-xl border border-[#2957a1]/10">
                        <div className="w-2 h-2 rounded-full bg-[#2957a1] flex-shrink-0" />
                        <p className="text-gray-700 text-[13px] font-medium">{service}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Officials */}
                <OfficialsList />

              </div>
            )}

            {/* Desktop Login Card */}
            <div className="hidden md:block w-full max-w-[400px] bg-white md:bg-white/95 md:backdrop-blur-md rounded-[24px] p-8 md:p-10 shadow-2xl z-10">
              <h1 className="text-[#2957a1] text-[32px] md:text-[38px] font-bold text-center mb-8">
                Log in
              </h1>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[#2957a1] text-[14px] font-semibold">Username</label>
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full h-[48px] bg-white border-2 border-[#2957a1]/30 focus:border-[#2957a1] rounded-xl text-[#2957a1] text-[15px] px-4 transition-all"
                    placeholder="Enter username"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[#2957a1] text-[14px] font-semibold">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-[48px] bg-white border-2 border-[#2957a1]/30 focus:border-[#2957a1] rounded-xl text-[#2957a1] text-[15px] px-4 pr-12 transition-all"
                      placeholder="Enter password"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-4 flex items-center justify-center text-[#2957a1]/60 hover:text-[#2957a1] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-[50px] bg-[#5CE36C] hover:bg-[#4bc95b] text-white text-[16px] font-bold rounded-full shadow-lg transition-all hover:shadow-xl transform hover:scale-[1.02] mt-6"
                >
                  {isLoading ? 'Logging in...' : 'Log In'}
                </Button>

                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="w-full text-[#2957a1] text-[13px] font-medium text-center hover:underline transition-all mt-4"
                >
                  Forgot Password?
                </button>
              </form>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
