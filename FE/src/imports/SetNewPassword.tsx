import svgPaths from "./svg-co5tqmd34a";
import imgImage1 from "../assets/citybg.png";
import imgImage2 from "../assets/barangaylogo.png";

export default function SetNewPassword() {
  return (
    <div className="bg-white relative size-full" data-name="Set New Password">
      <p className="absolute css-4hzbpn font-['Inter:Semi_Bold',sans-serif] font-semibold h-[94px] leading-[normal] left-[461.5px] not-italic text-[#2957a1] text-[40px] text-center top-[213px] translate-x-[-50%] w-[347px]">WELCOME TO</p>
      <p className="absolute css-4hzbpn font-['Inter:Extra_Bold',sans-serif] font-extrabold h-[97px] leading-[normal] left-[583px] not-italic text-[#2957a1] text-[64px] text-center top-[248px] translate-x-[-50%] w-[546px]">BARANGAY 160</p>
      <div className="absolute bg-[#2957a1] h-[700px] left-[945px] top-0 w-[421px]" />
      <div className="absolute bg-white h-[493px] left-[975px] rounded-[15px] top-[107px] w-[367px]" />
      <div className="absolute h-[51px] left-[1019px] top-[279px] w-[270px]" data-name="Rectangle">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 270 51">
          <path d={svgPaths.p1b32760} fill="var(--fill-0, white)" id="Rectangle" stroke="var(--stroke-0, #2957A1)" />
        </svg>
      </div>
      <div className="absolute bg-white border border-[#2957a1] border-solid h-[51px] left-[1019px] rounded-[5px] top-[365px] w-[270px]" data-name="Rectangle" />
      <p className="absolute css-4hzbpn font-['Inter:Semi_Bold',sans-serif] font-semibold h-[33px] leading-[normal] left-[1035px] not-italic text-[#2957a1] text-[16px] top-[294px] w-[136px]">New Password</p>
      <p className="absolute css-4hzbpn font-['Inter:Semi_Bold',sans-serif] font-semibold h-[33px] leading-[normal] left-[1035px] not-italic text-[#2957a1] text-[16px] top-[380px] w-[175px]">Confirm Password</p>
      <div className="absolute h-[397px] left-[-24px] top-[347px] w-[969px]" data-name="image 1">
        <img alt="" className="absolute inset-0 max-w-none object-cover opacity-80 pointer-events-none size-full" src={imgImage1} />
      </div>
      <div className="absolute h-0 left-[337px] top-[328px] w-[489px]">
        <div className="absolute inset-[-2px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 489 2">
            <line id="Line 3" stroke="var(--stroke-0, #2957A1)" strokeWidth="2" x2="489" y1="1" y2="1" />
          </svg>
        </div>
      </div>
      <div className="absolute left-[127px] size-[203px] top-[195px]" data-name="image 2">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage2} />
      </div>
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[normal] left-[456.5px] not-italic text-[#6287c2] text-[15px] text-center top-[342px] translate-x-[-50%]">Zone 14, District 2 Tondo, Manila</p>
      <p className="absolute css-4hzbpn font-['Inter:Bold',sans-serif] font-bold leading-[normal] left-[1019px] not-italic text-[#2957a1] text-[24px] top-[219px] w-[316px]">Set New Password</p>
      <div className="absolute h-[43px] left-[1030px] top-[447px] w-[251px]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 251 43">
          <path d={svgPaths.p345a9d80} fill="var(--fill-0, #2957A1)" id="Rectangle 8" stroke="var(--stroke-0, white)" />
        </svg>
      </div>
      <p className="absolute css-4hzbpn font-['Inter:Semi_Bold',sans-serif] font-semibold h-[47px] leading-[normal] left-[1155.5px] not-italic text-[18px] text-center text-white top-[457px] translate-x-[-50%] w-[165px]">Reset Password</p>
      <p className="absolute css-4hzbpn font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] left-[1019px] not-italic text-[11px] text-[rgba(0,0,0,0.64)] top-[262px] w-[293px]">Enter new password</p>
      <p className="absolute css-4hzbpn font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] left-[1019px] not-italic text-[11px] text-[rgba(0,0,0,0.64)] top-[349px] w-[293px]">Enter confirm new password</p>
    </div>
  );
}