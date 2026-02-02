import imgProfile from "../assets/profilepic.png";
import imgImage3 from "../assets/barangaylogo.png";

export default function AboutPage() {
  return (
    <div className="bg-white relative size-full" data-name="About Page">
      <p className="absolute css-4hzbpn font-['Inter:Semi_Bold',sans-serif] font-semibold h-[40px] leading-[normal] left-[894px] not-italic text-[24px] text-black text-center top-[40px] translate-x-[-50%] w-[108px]">Home</p>
      <p className="absolute css-4hzbpn font-['Inter:Semi_Bold',sans-serif] font-semibold h-[40px] leading-[normal] left-[1045.5px] not-italic text-[24px] text-black text-center top-[40px] translate-x-[-50%] w-[131px]">Services</p>
      <div className="absolute h-0 left-0 top-[105px] w-[1366.001px]">
        <div className="absolute inset-[-3px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1366 3">
            <line id="Line 5" stroke="var(--stroke-0, #2957A1)" strokeWidth="3" x2="1366" y1="1.5" y2="1.5" />
          </svg>
        </div>
      </div>
      <div className="absolute h-[51px] left-[1252px] top-[27px] w-[60px]" data-name="Profile">
        <img alt="" className="absolute inset-0 max-w-none object-contain pointer-events-none size-full" src={imgProfile} />
      </div>
      <p className="absolute css-4hzbpn font-['Inter:Bold',sans-serif] font-bold h-[40px] leading-[normal] left-[1182.5px] not-italic text-[#2957a1] text-[24px] text-center top-[40px] translate-x-[-50%] w-[131px]">About</p>
      <p className="absolute css-4hzbpn font-['Konkhmer_Sleokchher:Regular',sans-serif] h-[74px] leading-[normal] left-[16px] not-italic text-[40px] text-white top-[335px] w-[737px]">Barangay 160 Zone 14</p>

      <p className="absolute css-4hzbpn font-['Konkhmer_Sleokchher:Regular',sans-serif] h-[74px] leading-[normal] left-[74px] not-italic text-[40px] text-white top-[216px] w-[737px]">About Us</p>
      <p className="absolute css-4hzbpn font-['Kokoro:Regular','Noto_Sans:Regular',sans-serif] h-[186px] leading-[normal] left-[76px] text-[20px] text-white top-[279px] w-[658px]" style={{ fontVariationSettings: "'CTGR' 0, 'wdth' 100, 'wght' 400" }}>
        Barangay 160, located in Zone 14, District II of the City of Manila, is a progressive and community-driven barangay dedicated to promoting good governance, peace, and sustainable development. Under the leadership of Hon. Michael Jordan Castillo, Barangay 160 continues to implement programs and initiatives that enhance public service delivery, ensure the safety and welfare of its constituents, and strengthen the spirit of unity among residents.
      </p>

      <div className="absolute left-[1014px] size-[6px] top-[633px]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 6 6">
          <circle cx="3" cy="3" fill="var(--fill-0, white)" id="Ellipse 15" r="3" />
        </svg>
      </div>
      <div className="absolute left-[1026px] size-[6px] top-[633px]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 6 6">
          <circle cx="3" cy="3" id="Ellipse 16" r="2.5" stroke="var(--stroke-0, white)" />
        </svg>
      </div>
      <div className="absolute left-[1038px] size-[6px] top-[633px]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 6 6">
          <circle cx="3" cy="3" id="Ellipse 16" r="2.5" stroke="var(--stroke-0, white)" />
        </svg>
      </div>
      <p className="absolute css-4hzbpn font-['Konkhmer_Sleokchher:Regular',sans-serif] h-[72px] leading-[normal] left-[118px] not-italic text-[#2957a1] text-[15px] top-[29px] w-[362px]">BARANGAY 160</p>
      <p className="absolute css-4hzbpn font-['Konkhmer_Sleokchher:Regular',sans-serif] h-[28px] leading-[normal] left-[116px] not-italic text-[#2957a1] text-[24px] top-[39px] w-[650px]">Welcome, Juan!</p>
      <div className="absolute left-[58px] size-[53px] top-[27px]" data-name="image 3">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage3} />
      </div>
    </div>
  );
}