import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Eye, EyeOff, MapPin, Phone, Mail, Clock, Heart, Shield, FileText, Users, Building2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import imgImage1 from "figma:asset/f004727df308acf533cb5d04cec6ccdc85077998.png";
import imgImage2 from "figma:asset/7511a4e875c007913e79ed3aaafb18e5fbc9b003.png";

interface LoginPageProps {
  onLoginSuccess: (username: string) => void;
  onForgotPassword: () => void;
}

// Mock data for barangay officials
const officials = [
  { 
    name: 'Roberto Martinez', 
    position: 'Barangay Captain',
    image: 'https://images.unsplash.com/photo-1717985498747-f081679d2c33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBmaWxpcGluYSUyMG1hbiUyMHBvcnRyYWl0fGVufDF8fHx8MTc2OTc0NTg0OHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  { 
    name: 'Maria Santos', 
    position: 'Barangay Kagawad',
    image: 'https://images.unsplash.com/photo-1718006915613-bcb972cabdb1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBmaWxpcGluYSUyMHdvbWFuJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzY5NzQ1ODQ4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  { 
    name: 'Juan Dela Cruz', 
    position: 'Barangay Kagawad',
    image: 'https://images.unsplash.com/photo-1738566061505-556830f8b8f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMG1hbiUyMHBvcnRyYWl0JTIwYXNpYW58ZW58MXx8fHwxNzY5NzQ1ODQ5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  { 
    name: 'Ana Reyes', 
    position: 'Barangay Secretary',
    image: 'https://images.unsplash.com/photo-1581065178026-390bc4e78dad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB3b21hbiUyMHBvcnRyYWl0JTIwYXNpYW58ZW58MXx8fHwxNzY5NjgyMTk0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  { 
    name: 'Pedro Garcia', 
    position: 'Barangay Treasurer',
    image: 'https://images.unsplash.com/photo-1532272278764-53cd1fe53f72?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMHByb2Zlc3Npb25hbCUyMG1hbiUyMHBvcnRyYWl0fGVufDF8fHx8MTc2OTc0NTg0OXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  { 
    name: 'Linda Ramos', 
    position: 'SK Chairperson',
    image: 'https://images.unsplash.com/photo-1758600587839-56ba05596c69?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMHByb2Zlc3Npb25hbCUyMHdvbWFuJTIwcG9ydHJhaXQlMjBhc2lhbnxlbnwxfHx8fDE3Njk3NDU4NDl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  }
];

export function LoginPage({ onLoginSuccess, onForgotPassword }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mobileTab, setMobileTab] = useState<'login' | 'about'>('login');

  // Mock admin credentials
  const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
  };

  // Mock resident credentials
  const RESIDENT_CREDENTIALS = {
    username: 'resident',
    password: 'resident123'
  };

  // Mock official credentials
  const OFFICIAL_CREDENTIALS = {
    username: 'official',
    password: 'official123'
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    // Simulate login delay
    setTimeout(() => {
      if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        toast.success('Login successful! Welcome back, Admin.');
        onLoginSuccess(username);
      } else if (username === OFFICIAL_CREDENTIALS.username && password === OFFICIAL_CREDENTIALS.password) {
        toast.success('Login successful! Welcome, Barangay Official.');
        onLoginSuccess(username);
      } else if (username === RESIDENT_CREDENTIALS.username && password === RESIDENT_CREDENTIALS.password) {
        toast.success('Login successful! Welcome, Resident.');
        onLoginSuccess(username);
      } else {
        toast.error('Invalid username or password');
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-[1920px] h-screen flex flex-col md:flex-row">
        {/* Left Side - Welcome Section - Hidden on mobile */}
        <div className="hidden md:flex md:w-[70%] relative flex-col bg-gradient-to-br from-blue-50 via-white to-blue-100 overflow-hidden">
          {/* Scrollable Content Container */}
          <div className="w-full h-full overflow-y-auto px-12 py-12">
            <div className="w-full max-w-[900px] mx-auto">
              {/* Logo and Header - Matching Mobile Design */}
              <div className="bg-gradient-to-b from-white via-blue-50 to-white pt-12 pb-10 px-10 mb-10 rounded-3xl relative overflow-hidden shadow-xl">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#2957a1]/5 rounded-full -mr-20 -mt-20" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-100/30 rounded-full -ml-24 -mb-24" />
                
                <div className="flex flex-col items-center relative z-10">
                  {/* Logo with shadow */}
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-[#2957a1]/10 rounded-full blur-xl scale-110" />
                    <img 
                      src={imgImage2} 
                      alt="Barangay Logo" 
                      className="w-[110px] h-[110px] object-cover drop-shadow-2xl relative z-10 rounded-full border-4 border-[#2957a1]/20" 
                    />
                  </div>
                  
                  {/* Welcome text with decorative lines */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-[2px] bg-gradient-to-r from-transparent to-[#2957a1]/40" />
                    <p className="text-[#2957a1] text-[12px] font-bold text-center tracking-[0.25em] uppercase">
                      Welcome To
                    </p>
                    <div className="w-8 h-[2px] bg-gradient-to-l from-transparent to-[#2957a1]/40" />
                  </div>
                  
                  {/* Main title */}
                  <div className="relative mb-2">
                    <h1 className="text-[#2957a1] text-[38px] font-black text-center leading-none tracking-tight">
                      BARANGAY 160
                    </h1>
                  </div>
                  
                  {/* Location with icon */}
                  <div className="flex items-center gap-2 bg-[#2957a1]/10 backdrop-blur-sm px-4 py-2 rounded-full border border-[#2957a1]/20">
                    <MapPin className="w-3.5 h-3.5 text-[#2957a1]" />
                    <p className="text-[#2957a1] text-[12px] font-semibold text-center tracking-wide">
                      Zone 14, District 2 Tondo, Manila
                    </p>
                  </div>
                </div>
              </div>

              {/* Hero Image with Overlay */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl mb-6 group">
                <img 
                  src="https://images.unsplash.com/photo-1759860002197-9ef0e886b7ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaGlsaXBwaW5lcyUyMGNvbW11bml0eSUyMGJ1aWxkaW5nfGVufDF8fHx8MTc2OTc0NzM0OXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                  alt="Barangay Building" 
                  className="w-full h-[240px] object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2957a1]/90 via-[#2957a1]/40 to-transparent flex items-end p-6">
                  <div>
                    <h3 className="text-white text-[20px] font-bold mb-1">Our Community</h3>
                    <p className="text-white/90 text-[13px]">Serving with dedication since 1985</p>
                  </div>
                </div>
              </div>

              {/* About Overview Card */}
              <div className="bg-gradient-to-br from-[#2957a1] to-[#1e4380] p-6 rounded-2xl shadow-xl text-white mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-white/20 p-3 rounded-xl">
                    <Shield className="w-7 h-7" />
                  </div>
                  <h3 className="text-[18px] font-bold">
                    About Barangay 160
                  </h3>
                </div>
                <p className="text-white/95 text-[14px] leading-relaxed">
                  A progressive community dedicated to serving residents with excellence, integrity, and compassion since 1985. We strive to create a safe, sustainable, and thriving neighborhood for all families and individuals.
                </p>
              </div>

              {/* Mission & Vision */}
              <div className="bg-white border-2 border-[#2957a1]/20 rounded-2xl shadow-lg p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-[#2957a1]/10 p-2.5 rounded-xl">
                    <Heart className="w-6 h-6 text-[#2957a1]" />
                  </div>
                  <h3 className="text-[#2957a1] text-[17px] font-bold">
                    Our Mission
                  </h3>
                </div>
                <p className="text-gray-700 text-[14px] leading-relaxed mb-6">
                  To provide quality services, promote community development, and ensure the safety and welfare of all residents through transparent governance and active citizen participation.
                </p>
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-[#2957a1]/10 p-2.5 rounded-xl">
                    <FileText className="w-6 h-6 text-[#2957a1]" />
                  </div>
                  <h3 className="text-[#2957a1] text-[17px] font-bold">
                    Our Vision
                  </h3>
                </div>
                <p className="text-gray-700 text-[14px] leading-relaxed">
                  A united, prosperous, and peaceful barangay where every resident has access to opportunities for growth, development, and a better quality of life.
                </p>
              </div>

              {/* Contact Information */}
              <div className="bg-gradient-to-br from-blue-50 to-white border-2 border-[#2957a1]/20 rounded-2xl shadow-lg p-6 mb-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="bg-[#2957a1]/10 p-2.5 rounded-xl">
                    <Building2 className="w-6 h-6 text-[#2957a1]" />
                  </div>
                  <h3 className="text-[#2957a1] text-[17px] font-bold">
                    Contact Information
                  </h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-[#2957a1]/10 p-2.5 rounded-xl">
                      <MapPin className="w-5 h-5 text-[#2957a1]" />
                    </div>
                    <div>
                      <p className="text-gray-600 text-[11px] font-bold uppercase tracking-wider">Address</p>
                      <p className="text-gray-800 text-[14px] font-medium mt-1">Zone 14, District 2 Tondo, Manila</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-[#2957a1]/10 p-2.5 rounded-xl">
                      <Phone className="w-5 h-5 text-[#2957a1]" />
                    </div>
                    <div>
                      <p className="text-gray-600 text-[11px] font-bold uppercase tracking-wider">Phone</p>
                      <p className="text-gray-800 text-[14px] font-medium mt-1">(02) 8123-4567</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-[#2957a1]/10 p-2.5 rounded-xl">
                      <Mail className="w-5 h-5 text-[#2957a1]" />
                    </div>
                    <div>
                      <p className="text-gray-600 text-[11px] font-bold uppercase tracking-wider">Email</p>
                      <p className="text-gray-800 text-[14px] font-medium mt-1">barangay160@manila.gov.ph</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-[#2957a1]/10 p-2.5 rounded-xl">
                      <Clock className="w-5 h-5 text-[#2957a1]" />
                    </div>
                    <div>
                      <p className="text-gray-600 text-[11px] font-bold uppercase tracking-wider">Office Hours</p>
                      <p className="text-gray-800 text-[14px] font-medium mt-1">Monday - Friday: 8:00 AM - 5:00 PM</p>
                      <p className="text-gray-700 text-[13px] mt-0.5">Saturday: 8:00 AM - 12:00 PM</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Services Offered */}
              <div className="bg-white border-2 border-[#2957a1]/20 rounded-2xl shadow-lg p-6 mb-6">
                <h3 className="text-[#2957a1] text-[17px] font-bold mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#2957a1]" />
                  Services We Offer
                </h3>
                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    'Barangay Clearance',
                    'Certificate of Residency',
                    'Certificate of Indigency',
                    'Business Permit Assistance',
                    'Community Tax Certificate',
                    'Barangay ID Processing'
                  ].map((service, index) => (
                    <div key={index} className="flex items-center gap-3 py-2.5 px-4 bg-gradient-to-r from-blue-50 to-transparent rounded-xl border border-[#2957a1]/10 hover:border-[#2957a1]/30 transition-all">
                      <div className="w-2 h-2 rounded-full bg-[#2957a1]" />
                      <p className="text-gray-700 text-[14px] font-medium">{service}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Barangay Officials */}
              <div className="bg-gradient-to-br from-[#2957a1] to-[#1e4380] rounded-2xl shadow-xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-2 text-white">
                  <div className="bg-white/20 p-2.5 rounded-xl">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-[18px] font-bold">
                    Meet Our Leaders
                  </h3>
                </div>
                <p className="text-white/80 text-[13px] mb-5">
                  Dedicated public servants working for our community
                </p>
                
                <div className="space-y-3">
                  {officials.map((official, index) => (
                    <div key={index} className="bg-white/10 backdrop-blur-sm border border-white/20 p-4 rounded-xl hover:bg-white/20 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 relative">
                          <div className="absolute inset-0 bg-white/20 rounded-full blur-md" />
                          <img 
                            src={official.image} 
                            alt={official.name}
                            className="w-14 h-14 rounded-full object-cover border-2 border-white/40 relative z-10 group-hover:scale-110 transition-transform"
                          />
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="text-white text-[15px] font-bold">
                            {official.name}
                          </h3>
                          <p className="text-white/80 text-[13px] font-medium mt-0.5">
                            {official.position}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Background Decoration */}
          <div className="absolute bottom-0 left-0 w-full h-[200px] opacity-10 pointer-events-none">
            <img 
              src={imgImage1} 
              alt="City Background" 
              className="w-full h-full object-cover" 
            />
          </div>
        </div>

        {/* Right Side - Mobile and Desktop */}
        <div className="flex-1 md:w-[480px] bg-gradient-to-br from-blue-50 via-white to-blue-100 md:bg-[#2957a1] flex flex-col md:items-center md:justify-center relative md:p-8 h-screen">
          {/* Mobile Header with Logo */}
          <div className="md:hidden w-full bg-gradient-to-b from-white via-blue-50 to-white pt-8 pb-6 px-6 flex-shrink-0 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#2957a1]/5 rounded-full -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-100/30 rounded-full -ml-20 -mb-20" />
            
            <div className="flex flex-col items-center relative z-10">
              {/* Logo with shadow */}
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-[#2957a1]/10 rounded-full blur-xl scale-110" />
                <img 
                  src={imgImage2} 
                  alt="Barangay Logo" 
                  className="w-[110px] h-[110px] object-cover drop-shadow-2xl relative z-10 rounded-full border-4 border-[#2957a1]/20" 
                />
              </div>
              
              {/* Welcome text with decorative lines */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-[2px] bg-gradient-to-r from-transparent to-[#2957a1]/40" />
                <p className="text-[#2957a1] text-[12px] font-bold text-center tracking-[0.25em] uppercase">
                  Welcome To
                </p>
                <div className="w-8 h-[2px] bg-gradient-to-l from-transparent to-[#2957a1]/40" />
              </div>
              
              {/* Main title */}
              <div className="relative mb-2">
                <h1 className="text-[#2957a1] text-[34px] font-black text-center leading-none tracking-tight">
                  BARANGAY 160
                </h1>
              </div>
              
              {/* Location with icon */}
              <div className="flex items-center gap-2 bg-[#2957a1]/10 backdrop-blur-sm px-4 py-2 rounded-full border border-[#2957a1]/20">
                <MapPin className="w-3.5 h-3.5 text-[#2957a1]" />
                <p className="text-[#2957a1] text-[11px] font-semibold text-center tracking-wide">
                  Zone 14, District 2 Tondo, Manila
                </p>
              </div>
            </div>
          </div>

          {/* Mobile Tabs */}
          <div className="md:hidden w-full bg-gradient-to-r from-blue-50 via-white to-blue-50 px-4 py-4 flex-shrink-0 z-30 shadow-sm">
            <div className="flex gap-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full border-2 border-[#2957a1]/20 shadow-md">
              <button
                className={`flex-1 py-3.5 px-4 text-[13px] font-bold rounded-full transition-all duration-300 relative overflow-hidden ${
                  mobileTab === 'login'
                    ? 'bg-gradient-to-r from-[#2957a1] to-[#1e4380] text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setMobileTab('login')}
              >
                {mobileTab === 'login' && (
                  <div className="absolute inset-0 bg-white/10 animate-pulse" />
                )}
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${mobileTab === 'login' ? 'bg-white' : 'bg-[#2957a1]'}`} />
                  Log In
                </span>
              </button>
              <button
                className={`flex-1 py-3.5 px-4 text-[13px] font-bold rounded-full transition-all duration-300 relative overflow-hidden ${
                  mobileTab === 'about'
                    ? 'bg-gradient-to-r from-[#2957a1] to-[#1e4380] text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setMobileTab('about')}
              >
                {mobileTab === 'about' && (
                  <div className="absolute inset-0 bg-white/10 animate-pulse" />
                )}
                <span className="relative z-10 flex items-center justify-center gap-2">
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
              <div className="md:hidden w-full flex flex-col items-center justify-center px-4 h-full">
                <div className="w-full max-w-[400px] bg-white rounded-[24px] p-8 shadow-2xl border border-gray-100">
                  <h1 className="text-[#2957a1] text-[28px] font-bold text-center mb-8">
                    Log in to your account
                  </h1>

                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[#2957a1] text-[14px] font-semibold">
                        Username
                      </label>
                      <Input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full h-[50px] bg-white border-2 border-[#2957a1]/30 focus:border-[#2957a1] rounded-xl text-[#2957a1] text-[15px] px-4 transition-all"
                        placeholder="Enter username"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[#2957a1] text-[14px] font-semibold">
                        Password
                      </label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full h-[50px] bg-white border-2 border-[#2957a1]/30 focus:border-[#2957a1] rounded-xl text-[#2957a1] text-[15px] px-4 pr-12 transition-all"
                          placeholder="Enter password"
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#2957a1]/60 hover:text-[#2957a1] transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-[52px] bg-[#5CE36C] hover:bg-[#4bc95b] text-white text-[16px] font-bold rounded-full shadow-lg transition-all hover:shadow-xl transform hover:scale-[1.02] mt-8 opacity-100"
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

                <div className="absolute bottom-0 left-0 w-full h-[150px] opacity-10 pointer-events-none">
                  <img src={imgImage1} alt="City Background" className="w-full h-full object-cover object-top" />
                </div>
              </div>
            )}

            {/* About Content - Mobile */}
            {mobileTab === 'about' && (
              <div className="md:hidden w-full px-4 py-6">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl mb-5">
                  <img 
                    src="https://images.unsplash.com/photo-1759860002197-9ef0e886b7ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaGlsaXBwaW5lcyUyMGNvbW11bml0eSUyMGJ1aWxkaW5nfGVufDF8fHx8MTc2OTc0NzM0OXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    alt="Barangay Building" 
                    className="w-full h-[220px] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2957a1]/95 via-[#2957a1]/50 to-transparent flex items-end p-5">
                    <div className="w-full">
                      <h3 className="text-white text-[20px] font-bold mb-1">Our Community</h3>
                      <p className="text-white/90 text-[13px]">Serving with dedication since 1985</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#2957a1] to-[#1e4380] p-5 rounded-2xl shadow-xl text-white mb-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-white/20 p-2.5 rounded-xl">
                      <Shield className="w-6 h-6" />
                    </div>
                    <h3 className="text-[17px] font-bold">About Us</h3>
                  </div>
                  <p className="text-white/95 text-[14px] leading-relaxed">
                    A progressive community dedicated to serving residents with excellence, integrity, and compassion since 1985. We strive to create a safe, sustainable, and thriving neighborhood for all families and individuals.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="relative rounded-xl overflow-hidden shadow-lg">
                    <img 
                      src="https://images.unsplash.com/photo-1767990375816-1f1a0c25a88b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYW5pbGElMjBuZWlnaGJvcmhvb2QlMjBzdHJlZXR8ZW58MXx8fHwxNzY5NzQ3MzQ5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                      alt="Community Street" 
                      className="w-full h-[130px] object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-3">
                      <p className="text-white text-[12px] font-semibold">Our Neighborhood</p>
                    </div>
                  </div>
                  <div className="relative rounded-xl overflow-hidden shadow-lg">
                    <img 
                      src="https://images.unsplash.com/photo-1767990373921-1a3c6af66f57?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaWxpcGlubyUyMGNvbW11bml0eSUyMGdhdGhlcmluZ3xlbnwxfHx8fDE3Njk3NDczNTB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                      alt="Community Gathering" 
                      className="w-full h-[130px] object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-3">
                      <p className="text-white text-[12px] font-semibold">Community Events</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border-2 border-[#2957a1]/20 rounded-2xl shadow-lg p-5 mb-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-[#2957a1]/10 p-2.5 rounded-xl">
                      <Heart className="w-5 h-5 text-[#2957a1]" />
                    </div>
                    <h3 className="text-[#2957a1] text-[16px] font-bold">Our Mission</h3>
                  </div>
                  <p className="text-gray-700 text-[14px] leading-relaxed mb-5">
                    To provide quality services, promote community development, and ensure the safety and welfare of all residents through transparent governance and active citizen participation.
                  </p>
                  
                  <div className="flex items-center gap-3 mb-3 pt-3 border-t border-gray-100">
                    <div className="bg-[#2957a1]/10 p-2.5 rounded-xl">
                      <FileText className="w-5 h-5 text-[#2957a1]" />
                    </div>
                    <h3 className="text-[#2957a1] text-[16px] font-bold">Our Vision</h3>
                  </div>
                  <p className="text-gray-700 text-[14px] leading-relaxed">
                    A united, prosperous, and peaceful barangay where every resident has access to opportunities for growth, development, and a better quality of life.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-white border-2 border-[#2957a1]/20 rounded-2xl shadow-lg p-5 mb-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-[#2957a1]/10 p-2.5 rounded-xl">
                      <Building2 className="w-5 h-5 text-[#2957a1]" />
                    </div>
                    <h3 className="text-[#2957a1] text-[16px] font-bold">Contact Us</h3>
                  </div>
                  
                  <div className="space-y-3.5">
                    <div className="flex items-start gap-3">
                      <div className="bg-[#2957a1]/10 p-2 rounded-lg">
                        <MapPin className="w-4 h-4 text-[#2957a1]" />
                      </div>
                      <div>
                        <p className="text-gray-600 text-[10px] font-bold uppercase tracking-wider">Address</p>
                        <p className="text-gray-800 text-[14px] font-medium mt-0.5">Zone 14, District 2 Tondo, Manila</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-[#2957a1]/10 p-2 rounded-lg">
                        <Phone className="w-4 h-4 text-[#2957a1]" />
                      </div>
                      <div>
                        <p className="text-gray-600 text-[10px] font-bold uppercase tracking-wider">Phone</p>
                        <p className="text-gray-800 text-[14px] font-medium mt-0.5">(02) 8123-4567</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-[#2957a1]/10 p-2 rounded-lg">
                        <Mail className="w-4 h-4 text-[#2957a1]" />
                      </div>
                      <div>
                        <p className="text-gray-600 text-[10px] font-bold uppercase tracking-wider">Email</p>
                        <p className="text-gray-800 text-[14px] font-medium mt-0.5">barangay160@manila.gov.ph</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-[#2957a1]/10 p-2 rounded-lg">
                        <Clock className="w-4 h-4 text-[#2957a1]" />
                      </div>
                      <div>
                        <p className="text-gray-600 text-[10px] font-bold uppercase tracking-wider">Office Hours</p>
                        <p className="text-gray-800 text-[14px] font-medium mt-0.5">Monday - Friday: 8:00 AM - 5:00 PM</p>
                        <p className="text-gray-700 text-[13px] mt-0.5">Saturday: 8:00 AM - 12:00 PM</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border-2 border-[#2957a1]/20 rounded-2xl shadow-lg p-5 mb-5">
                  <h3 className="text-[#2957a1] text-[16px] font-bold mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#2957a1]" />
                    Services We Offer
                  </h3>
                  <div className="grid grid-cols-1 gap-2.5">
                    {[
                      'Barangay Clearance',
                      'Certificate of Residency',
                      'Certificate of Indigency',
                      'Business Permit Assistance',
                      'Community Tax Certificate',
                      'Barangay ID Processing'
                    ].map((service, index) => (
                      <div key={index} className="flex items-center gap-3 py-2.5 px-4 bg-gradient-to-r from-blue-50 to-transparent rounded-lg border border-[#2957a1]/10">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#2957a1]" />
                        <p className="text-gray-700 text-[14px] font-medium">{service}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#2957a1] to-[#1e4380] rounded-2xl shadow-xl p-5 mb-6">
                  <div className="flex items-center gap-3 mb-2 text-white">
                    <div className="bg-white/20 p-2.5 rounded-xl">
                      <Users className="w-5 h-5" />
                    </div>
                    <h3 className="text-[17px] font-bold">Meet Our Leaders</h3>
                  </div>
                  <p className="text-white/90 text-[13px] mb-5">
                    Dedicated public servants working for our community
                  </p>
                  
                  <div className="space-y-3">
                    {officials.map((official, index) => (
                      <div key={index} className="bg-white/10 backdrop-blur-sm border border-white/20 p-3.5 rounded-xl hover:bg-white/15 transition-all">
                        <div className="flex items-center gap-3.5">
                          <div className="flex-shrink-0">
                            <img 
                              src={official.image} 
                              alt={official.name}
                              className="w-14 h-14 rounded-full object-cover border-2 border-white/50"
                            />
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="text-white text-[15px] font-bold">
                              {official.name}
                            </h3>
                            <p className="text-white/90 text-[13px] font-medium mt-0.5">
                              {official.position}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Desktop Login Card */}
            <div className="hidden md:block w-full max-w-[400px] bg-white md:bg-white/95 md:backdrop-blur-md rounded-[24px] p-8 md:p-10 shadow-2xl">
              <h1 className="text-[#2957a1] text-[32px] md:text-[38px] font-bold text-center mb-8">
                Log in
              </h1>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[#2957a1] text-[14px] font-semibold">
                    Username
                  </label>
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
                  <label className="text-[#2957a1] text-[14px] font-semibold">
                    Password
                  </label>
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
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#2957a1]/60 hover:text-[#2957a1] transition-colors"
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