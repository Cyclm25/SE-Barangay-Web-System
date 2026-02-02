import svgPaths from "./svg-c9dqutv1jv";
import imgImage3 from "figma:asset/f004727df308acf533cb5d04cec6ccdc85077998.png";

export default function ForgotPassword() {
  return (
    <div className="bg-white relative size-full" data-name="Forgot Password">
      <div className="absolute bg-[#2957a1] h-[700px] left-[-24px] top-0 w-[1390px]" />
      <div className="absolute h-[376px] left-[711px] top-[334px] w-[918px]" data-name="image 3">
        <img alt="" className="absolute inset-0 max-w-none object-cover opacity-80 pointer-events-none size-full" src={imgImage3} />
      </div>
      <div className="absolute h-[337px] left-[-24px] top-[373px] w-[823px]" data-name="image 1">
        <img alt="" className="absolute inset-0 max-w-none object-cover opacity-80 pointer-events-none size-full" src={imgImage3} />
      </div>
      <div className="absolute bg-white h-[500px] left-[425px] rounded-[15px] top-[100px] w-[517px]" />
      <div className="absolute bg-white border border-[#2957a1] border-solid h-[51px] left-[522px] rounded-[5px] top-[443px] w-[306px]" data-name="Rectangle" />
      <p className="absolute css-4hzbpn font-['Inter:Semi_Bold',sans-serif] font-semibold h-[33px] leading-[normal] left-[568px] not-italic text-[#2957a1] text-[16px] text-center top-[461px] translate-x-[-50%] w-[154px]">OTP</p>
      <div className="absolute h-[43px] left-[523px] top-[512px] w-[306px]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 306 43">
          <path d={svgPaths.p34656680} fill="var(--fill-0, #2957A1)" id="Rectangle 5" stroke="var(--stroke-0, white)" />
        </svg>
      </div>
      <p className="absolute css-4hzbpn font-['Inter:Semi_Bold',sans-serif] font-semibold h-[47px] leading-[normal] left-[676.5px] not-italic text-[18px] text-center text-white top-[522px] translate-x-[-50%] w-[187px]">Confirm</p>
      <p className="absolute css-4hzbpn font-['Inter:Bold',sans-serif] font-bold h-[40px] leading-[normal] left-[495px] not-italic text-[#2957a1] text-[24px] top-[154px] w-[359px]">Forgot Password</p>
      <div className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[0] left-[495px] not-italic text-[0px] text-[15px] text-[rgba(0,0,0,0.61)] top-[218px] w-[398px]">
        <p className="css-4hzbpn mb-0">
          <span className="leading-[normal]">{`We found your email: `}</span>
          <span className="font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic text-[rgba(0,0,0,0.61)]"> </span>
        </p>
        <p className="css-4hzbpn font-['Inter:Bold',sans-serif] font-bold leading-[normal] mb-0"> </p>
        <p className="css-4hzbpn font-['Inter:Bold',sans-serif] font-bold leading-[normal] mb-0">{`                                 j****e@gmail.com.`}</p>
        <p className="css-4hzbpn leading-[normal] mb-0">&nbsp;</p>
        <p className="css-4hzbpn leading-[normal] mb-0">An OTP (One-Time Password) has been sent to this email.</p>
        <p className="css-4hzbpn leading-[normal] mb-0">&nbsp;</p>
        <p className="css-4hzbpn">
          <span className="leading-[normal]">{`Enter the OTP `}</span>
          <span className="leading-[normal]">below</span>
          <span className="leading-[normal]">{` to verify your identity before resetting your password.`}</span>
        </p>
      </div>
      <p className="absolute css-4hzbpn font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] left-[525px] not-italic text-[13px] text-[rgba(0,0,0,0.64)] top-[424px] w-[332px]">Please enter OTP here</p>
    </div>
  );
}