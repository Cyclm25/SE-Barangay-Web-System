import svgPaths from "./svg-fueez8ar4s";
import imgImage1 from "figma:asset/f004727df308acf533cb5d04cec6ccdc85077998.png";
import imgImage2 from "figma:asset/7511a4e875c007913e79ed3aaafb18e5fbc9b003.png";

export default function LogIn() {
  return (
    <div className="bg-white relative size-full" data-name="Log-in">
      <p className="absolute css-4hzbpn font-['Inter:Semi_Bold',sans-serif] font-semibold h-[94px] leading-[normal] left-[461.5px] not-italic text-[#2957a1] text-[40px] text-center top-[213px] translate-x-[-50%] w-[347px]">WELCOME TO</p>
      <p className="absolute css-4hzbpn font-['Inter:Extra_Bold',sans-serif] font-extrabold h-[97px] leading-[normal] left-[583px] not-italic text-[#2957a1] text-[64px] text-center top-[248px] translate-x-[-50%] w-[546px]">BARANGAY 160</p>
      <div className="absolute bg-[#2957a1] h-[700px] left-[945px] top-0 w-[421px]" />
      <div className="absolute bg-[rgba(217,217,217,0.33)] h-[493px] left-[972px] rounded-[15px] top-[107px] w-[367px]" />
      <div className="absolute h-[51px] left-[1017px] top-[263px] w-[270px]" data-name="Rectangle">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 270 51">
          <path d={svgPaths.p1b32760} fill="var(--fill-0, white)" id="Rectangle" stroke="var(--stroke-0, #2957A1)" />
        </svg>
      </div>
      <div className="absolute bg-white border border-[#2957a1] border-solid h-[51px] left-[1017px] rounded-[5px] top-[340px] w-[270px]" data-name="Rectangle" />
      <p className="absolute css-4hzbpn font-['Inter:Semi_Bold',sans-serif] font-semibold h-[33px] leading-[normal] left-[1075px] not-italic text-[#2957a1] text-[16px] text-center top-[280px] translate-x-[-50%] w-[136px]">Username</p>
      <p className="absolute css-4hzbpn font-['Inter:Semi_Bold',sans-serif] font-semibold h-[33px] leading-[normal] left-[1075px] not-italic text-[#2957a1] text-[16px] text-center top-[355px] translate-x-[-50%] w-[136px]">Password</p>
      <p className="absolute css-4hzbpn font-['Inter:Medium',sans-serif] font-medium h-[33px] leading-[normal] left-[1161px] not-italic text-[13px] text-center text-white top-[514px] translate-x-[-50%] w-[136px]">Forgot Password?</p>
      <div className="absolute h-[43px] left-[1030px] top-[451px] w-[251px]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 251 43">
          <path d={svgPaths.p3a5c0880} fill="var(--fill-0, #5CE36C)" id="Rectangle 5" />
        </svg>
      </div>
      <p className="absolute css-4hzbpn font-['Inter:Extra_Bold',sans-serif] font-extrabold h-[47px] leading-[normal] left-[1161.5px] not-italic text-[18px] text-center text-white top-[458px] translate-x-[-50%] w-[165px]">Log In</p>
      <div className="absolute h-[397px] left-[-24px] top-[347px] w-[969px]" data-name="image 1">
        <img alt="" className="absolute inset-0 max-w-none object-cover opacity-80 pointer-events-none size-full" src={imgImage1} />
      </div>
      <div className="absolute h-0 left-[1015px] top-[420px] w-[270px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 270 1">
            <line id="Line 2" stroke="var(--stroke-0, white)" x2="270" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <div className="absolute h-0 left-[337px] top-[328px] w-[489px]">
        <div className="absolute inset-[-2px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 489 2">
            <line id="Line 3" stroke="var(--stroke-0, #2957A1)" strokeWidth="2" x2="489" y1="1" y2="1" />
          </svg>
        </div>
      </div>
      <p className="absolute css-4hzbpn font-['Inter:Bold',sans-serif] font-bold h-[72px] leading-[normal] left-[1075.5px] not-italic text-[40px] text-center text-shadow-[0px_4px_4px_rgba(0,0,0,0.25)] text-white top-[182px] translate-x-[-50%] w-[219px]">Log in</p>
      <div className="absolute left-[127px] size-[203px] top-[195px]" data-name="image 2">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage2} />
      </div>
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[normal] left-[456.5px] not-italic text-[#6287c2] text-[15px] text-center top-[342px] translate-x-[-50%]">Zone 14, District 2 Tondo, Manila</p>
    </div>
  );
}