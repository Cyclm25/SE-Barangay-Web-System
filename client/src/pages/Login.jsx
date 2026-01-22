import { useState } from 'react';
import axios from 'axios';

const Login = ({ onLoginSuccess, onForgot }) => {
  const [username, setUsername] = useState(""); 
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/auth/login", { 
        username, 
        password 
      });
      if (res.status === 200) onLoginSuccess();
    } catch (err) {
      alert("Invalid Username or Password");
    }
  };

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden m-0 p-0 font-sans">
      <div className="hidden md:flex md:w-2/3 flex-col justify-center items-center relative bg-white border-r">
        <div className="text-center z-10 -mt-20 px-10">
          <div className="flex justify-center mb-6">
            <div className="w-40 h-40 rounded-full border-[12px] border-[#1e3a8a] flex items-center justify-center bg-white shadow-lg">
              <span className="text-[#1e3a8a] text-8xl font-black italic">B</span>
            </div>
          </div>
          <h1 className="text-[#1e3a8a] text-4xl font-bold">WELCOME TO</h1>
          <h2 className="text-[#1e3a8a] text-6xl font-black tracking-tight">BARANGAY 160</h2>
          <div className="h-1.5 w-72 bg-[#1e3a8a] mx-auto my-3 rounded-full"></div>
          <p className="text-blue-800 font-bold tracking-[0.2em] text-sm">ZONE 14, DISTRICT 2 TONDO, MANILA</p>
        </div>

        <div className="absolute bottom-0 w-full flex items-end justify-center gap-1 px-2 opacity-90">
          <div className="w-8 h-24 bg-gray-800 rounded-t"></div>
          <div className="w-10 h-40 bg-gray-800 rounded-t"></div>
          <div className="w-6 h-20 bg-gray-800 rounded-t"></div>
          <div className="w-12 h-52 bg-gray-800 rounded-t"></div>
          <div className="w-8 h-32 bg-gray-800 rounded-t"></div>
          <div className="w-14 h-64 bg-gray-800 rounded-t"></div>
          <div className="w-10 h-44 bg-gray-800 rounded-t"></div>
          <div className="w-12 h-56 bg-gray-800 rounded-t"></div>
          <div className="w-8 h-28 bg-gray-800 rounded-t"></div>
          <div className="w-10 h-36 bg-gray-800 rounded-t"></div>
        </div>
      </div>

      <div className="w-full md:w-1/3 bg-[#2b59ac] flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md bg-white/10 p-10 rounded-3xl backdrop-blur-md border border-white/20 shadow-2xl">
          <h2 className="text-white text-4xl font-bold mb-10 text-left">Log in</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-white/80 text-xs font-semibold mb-2 block uppercase tracking-widest">Enter username</label>
              <input 
                type="text" 
                className="w-full p-4 rounded-xl bg-white focus:ring-4 focus:ring-green-400 outline-none text-gray-800 shadow-inner font-medium"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-white/80 text-xs font-semibold mb-2 block uppercase tracking-widest">Enter password</label>
              <input 
                type="password" 
                className="w-full p-4 rounded-xl bg-white focus:ring-4 focus:ring-green-400 outline-none text-gray-800 shadow-inner font-medium"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-white font-black py-4 rounded-xl text-xl shadow-lg transition-all active:scale-95 uppercase tracking-wide mt-4"
            >
              LOG IN
            </button>

            <div className="text-center mt-6">
              <button 
                type="button" 
                onClick={() => {
                  if(!username) {
                    alert("Please enter your email/username first.");
                  } else {
                    onForgot(username);
                  }
                }} 
                className="text-white/70 hover:text-white text-sm underline underline-offset-4 transition-colors font-medium"
              >
                Forgot Password?
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;