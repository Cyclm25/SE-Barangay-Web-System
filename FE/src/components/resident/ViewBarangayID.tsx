import { Download, X } from "lucide-react";
import imgBarangayLogo from "../../assets/barangaylogo.png";
import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface ViewBarangayIDProps {
  onClose: () => void;
  profileData?: any; // optional now
}

function pick(obj: any, keys: string[], fallback = "") {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return fallback;
}

export function ViewBarangayID({ onClose, profileData }: ViewBarangayIDProps) {
  const [me, setMe] = useState<any>(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [resident, setResident] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    console.log("TOKEN:", token);

    fetch("http://localhost:5001/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        console.log("STATUS:", r.status);
        const body = await r.text();
        console.log("BODY:", body);
        return JSON.parse(body);
      })
      .then((data) => setResident(data))
      .catch((e) => console.error("FETCH ERROR:", e));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoadingMe(false);
      setMe(null);
      return;
    }

    setLoadingMe(true);

    fetch("http://localhost:5001/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((data) => setMe(data))
      .catch((err) => {
        console.error("Failed to load /auth/me:", err);
        setMe(null);
      })
      .finally(() => setLoadingMe(false));
  }, []);

  // Prefer /auth/me data, fallback to passed profileData if any
  const data = me ?? profileData ?? {};

  const firstName = pick(data, ["firstName", "FirstName"], "");
  const middleName = pick(data, ["middleName", "MiddleName"], "");
  const lastName = pick(data, ["lastName", "LastName"], "");

  const residentId = pick(data, ["ResidentID", "residentId"], "");
  const birthRaw = pick(data, ["birthdate", "Birthday"], "");
  const sex = pick(data, ["sex", "Gender"], "");

  const contactNumber = pick(data, ["contactNumber", "ContactNumber"], "");
  const houseNo = pick(data, ["houseNo", "HouseNumber"], "");
  const streetAddress = pick(data, ["street", "StreetAddress"], "");
  const barangay = pick(data, ["barangay"], "Barangay 160");
  const city = pick(data, ["city"], "Manila");

  const initials =
    (firstName?.charAt?.(0) || "") + (lastName?.charAt?.(0) || "");

  const formattedBirthdate =
    birthRaw
      ? new Date(birthRaw).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      : "—";

  const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl max-w-[900px] w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between rounded-t-2xl">
            <div>
              <h1 className="text-[24px] text-[#2957a1] font-bold">
                Digital Barangay ID
              </h1>
              <p className="text-gray-600 text-[13px]">
                Your official digital identification card
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* ID Card Container */}
          <div className="p-8">
            {/* ID Card */}
            <div className="relative w-full max-w-[600px] mx-auto aspect-[1.586/1] bg-gradient-to-br from-[#2957a1] to-[#1e4380] rounded-2xl shadow-xl overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.1) 35px, rgba(255,255,255,.1) 70px)",
                  }}
                />
              </div>

              {/* ID Content */}
              <div className="relative h-full p-8 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <img
                      src={imgBarangayLogo}
                      alt="Barangay Logo"
                      className="w-16 h-16 bg-white rounded-full p-2"
                    />
                    <div className="text-white">
                      <p className="text-[11px] font-semibold opacity-90">
                        Republic of the Philippines
                      </p>
                      <p className="text-[16px] font-bold">BARANGAY 160</p>
                      <p className="text-[10px] opacity-80">
                        Zone 14, District 2, Tondo, Manila
                      </p>
                    </div>
                  </div>
                  <div className="text-white text-right">
                    <p className="text-[10px] opacity-80">Valid Until</p>
                    <p className="text-[14px] font-bold">Dec 31, 2026</p>
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex gap-6">
                  {/* Profile Picture */}
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 bg-white rounded-lg overflow-hidden border-4 border-white/30 shadow-lg">
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <span className="text-5xl text-gray-500 font-bold">
                          {initials || "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="flex-1 text-white space-y-3">
                    <div>
                      <p className="text-[10px] opacity-70 font-semibold">
                        FULL NAME
                      </p>
                      <p className="text-[18px] font-bold uppercase">
                        {fullName || "Loading..."}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[9px] opacity-70 font-semibold">
                          DATE OF BIRTH
                        </p>
                        <p className="text-[13px] font-bold">
                          {formattedBirthdate}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] opacity-70 font-semibold">
                          SEX
                        </p>
                        <p className="text-[13px] font-bold">{sex || "—"}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[9px] opacity-70 font-semibold">
                        ADDRESS
                      </p>
                      <p className="text-[12px] font-semibold">
                        {[houseNo, streetAddress].filter(Boolean).join(" ") ||
                          "—"}
                        {barangay ? `, ${barangay}` : ""}
                      </p>
                      <p className="text-[12px] font-semibold">
                        Zone 14, District 2, Tondo, {city || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] opacity-70 font-semibold">
                        CONTACT NUMBER
                      </p>
                      <p className="text-[13px] font-bold">
                        {contactNumber || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-white/20 flex items-center justify-between">
                  <div className="text-white">
                    <p className="text-[9px] opacity-70 font-semibold">
                      RESIDENT ID
                    </p>
                    <p className="text-[16px] font-bold tracking-wider">
                      {resident?.ResidentID ?? "Loading..."}
                    </p>
                  </div>
                  <div className="text-right text-white">
                    <p className="text-[8px] opacity-70">Signature</p>
                    <div className="h-8 flex items-end">
                      <p className="text-[14px] font-signature italic">
                        {firstName && lastName ? `${firstName} ${lastName}` : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex justify-center gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex items-center gap-2 bg-[#2957a1] hover:bg-[#1e4380] text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-md">
                    <Download className="w-5 h-5" />
                    Download ID
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  Upcoming feature
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex items-center gap-2 border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                    Share ID
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  Upcoming feature
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
