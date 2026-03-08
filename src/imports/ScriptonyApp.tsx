import svgPaths from "./svg-x1psj2qnic";
import imgImageScriptonyLogo from '../assets/scriptony-logo.png';

function Paragraph() {
  return (
    <div className="h-[23.998px] relative shrink-0 w-full" data-name="Paragraph">
      <div className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[0] left-0 not-italic text-[16px] text-nowrap text-zinc-500 top-[-0.84px] tracking-[-0.3125px]">
        <p className="leading-[24px] whitespace-pre">Willkommen zurück! 👋</p>
      </div>
    </div>
  );
}

function Container() {
  return (
    <div className="absolute bg-gradient-to-b box-border content-stretch flex flex-col from-[rgba(110,89,165,0.05)] h-[71.993px] items-start left-0 pb-0 pt-[23.998px] px-[15.998px] to-[rgba(0,0,0,0)] top-0 w-[393.393px]" data-name="Container">
      <Paragraph />
    </div>
  );
}

function Heading2() {
  return (
    <div className="h-[23.998px] relative shrink-0 w-[129.655px]" data-name="Heading 2">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[23.998px] relative w-[129.655px]">
        <div className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[0] left-0 not-italic text-[16px] text-neutral-950 text-nowrap top-[-0.84px] tracking-[-0.3125px]">
          <p className="leading-[24px] whitespace-pre">Zuletzt bearbeitet</p>
        </div>
      </div>
    </div>
  );
}

function Icon() {
  return (
    <div className="absolute left-[27.89px] size-[15.998px] top-[1.99px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p189715c0} id="Vector" stroke="var(--stroke-0, #6E59A5)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3332" />
        </g>
      </svg>
    </div>
  );
}

function Button() {
  return (
    <div className="h-[19.99px] relative shrink-0 w-[43.886px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[19.99px] relative w-[43.886px]">
        <div className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[0] left-0 not-italic text-[#6e59a5] text-[14px] text-nowrap top-[0.08px] tracking-[-0.1504px]">
          <p className="leading-[20px] whitespace-pre">Alle</p>
        </div>
        <Icon />
      </div>
    </div>
  );
}

function Container1() {
  return (
    <div className="content-stretch flex h-[23.998px] items-center justify-between relative shrink-0 w-full" data-name="Container">
      <Heading2 />
      <Button />
    </div>
  );
}

function CardTitle() {
  return (
    <div className="h-[23.998px] overflow-clip relative shrink-0 w-full" data-name="CardTitle">
      <div className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[0] left-0 not-italic text-[16px] text-neutral-950 text-nowrap top-[-0.84px] tracking-[-0.3125px]">
        <p className="leading-[24px] whitespace-pre">The Last Frontier</p>
      </div>
    </div>
  );
}

function CardDescription() {
  return (
    <div className="h-[39.979px] overflow-clip relative shrink-0 w-full" data-name="CardDescription">
      <div className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[0] left-0 not-italic text-[14px] text-zinc-500 top-[0.08px] tracking-[-0.1504px] w-[289px]">
        <p className="leading-[20px]">{`A sci-fi thriller about humanity's final journey to the stars`}</p>
      </div>
    </div>
  );
}

function Icon1() {
  return (
    <div className="relative shrink-0 size-[11.99px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 12">
        <g clipPath="url(#clip0_31_664)" id="Icon">
          <path d={svgPaths.p17655480} id="Vector" stroke="var(--stroke-0, #71717A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.999201" />
          <path d={svgPaths.pad45f00} id="Vector_2" stroke="var(--stroke-0, #71717A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.999201" />
        </g>
        <defs>
          <clipPath id="clip0_31_664">
            <rect fill="white" height="11.9904" width="11.9904" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Text() {
  return (
    <div className="h-[15.998px] relative shrink-0 w-[80.363px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex h-[15.998px] items-start relative w-[80.363px]">
        <div className="font-['Inter:Regular',_sans-serif] font-normal leading-[0] not-italic relative shrink-0 text-[12px] text-nowrap text-zinc-500">
          <p className="leading-[16px] whitespace-pre">Vor 2 Stunden</p>
        </div>
      </div>
    </div>
  );
}

function Container2() {
  return (
    <div className="content-stretch flex gap-[5.995px] h-[15.998px] items-center relative shrink-0 w-full" data-name="Container">
      <Icon1 />
      <Text />
    </div>
  );
}

function Container3() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[3.991px] h-[95.957px] items-start left-0 top-0 w-[295.264px]" data-name="Container">
      <CardTitle />
      <CardDescription />
      <Container2 />
    </div>
  );
}

function Icon2() {
  return (
    <div className="absolute left-[307.25px] size-[19.99px] top-[3.99px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d={svgPaths.p37000900} id="Vector" stroke="var(--stroke-0, #71717A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6658" />
        </g>
      </svg>
    </div>
  );
}

function HomePage() {
  return (
    <div className="h-[95.957px] relative shrink-0 w-[327.244px]" data-name="HomePage">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[95.957px] relative w-[327.244px]">
        <Container3 />
        <Icon2 />
      </div>
    </div>
  );
}

function Card() {
  return (
    <div className="bg-white h-[136.105px] relative rounded-[16px] shrink-0 w-full" data-name="Card">
      <div aria-hidden="true" className="absolute border-[1.078px] border-gray-200 border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="size-full">
        <div className="box-border content-stretch flex flex-col h-[136.105px] items-start pb-[1.078px] pl-[17.076px] pr-[1.078px] pt-[17.076px] relative w-full">
          <HomePage />
        </div>
      </div>
    </div>
  );
}

function CardTitle1() {
  return (
    <div className="h-[23.998px] overflow-clip relative shrink-0 w-full" data-name="CardTitle">
      <div className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[0] left-0 not-italic text-[16px] text-neutral-950 text-nowrap top-[-0.84px] tracking-[-0.3125px]">
        <p className="leading-[24px] whitespace-pre">Midnight in Paris</p>
      </div>
    </div>
  );
}

function CardDescription1() {
  return (
    <div className="h-[19.99px] overflow-clip relative shrink-0 w-full" data-name="CardDescription">
      <div className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[0] left-0 not-italic text-[14px] text-nowrap text-zinc-500 top-[0.08px] tracking-[-0.1504px]">
        <p className="leading-[20px] whitespace-pre">A romantic comedy set in the streets of Paris</p>
      </div>
    </div>
  );
}

function Icon3() {
  return (
    <div className="relative shrink-0 size-[11.99px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 12">
        <g clipPath="url(#clip0_31_664)" id="Icon">
          <path d={svgPaths.p17655480} id="Vector" stroke="var(--stroke-0, #71717A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.999201" />
          <path d={svgPaths.pad45f00} id="Vector_2" stroke="var(--stroke-0, #71717A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.999201" />
        </g>
        <defs>
          <clipPath id="clip0_31_664">
            <rect fill="white" height="11.9904" width="11.9904" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Text1() {
  return (
    <div className="h-[15.998px] relative shrink-0 w-[44.846px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex h-[15.998px] items-start relative w-[44.846px]">
        <div className="font-['Inter:Regular',_sans-serif] font-normal leading-[0] not-italic relative shrink-0 text-[12px] text-nowrap text-zinc-500">
          <p className="leading-[16px] whitespace-pre">Gestern</p>
        </div>
      </div>
    </div>
  );
}

function Container4() {
  return (
    <div className="content-stretch flex gap-[5.995px] h-[15.998px] items-center relative shrink-0 w-full" data-name="Container">
      <Icon3 />
      <Text1 />
    </div>
  );
}

function Container5() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[3.991px] h-[75.967px] items-start left-0 top-0 w-[295.264px]" data-name="Container">
      <CardTitle1 />
      <CardDescription1 />
      <Container4 />
    </div>
  );
}

function Icon4() {
  return (
    <div className="absolute left-[307.25px] size-[19.99px] top-[3.99px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d={svgPaths.p37000900} id="Vector" stroke="var(--stroke-0, #71717A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6658" />
        </g>
      </svg>
    </div>
  );
}

function HomePage1() {
  return (
    <div className="h-[75.967px] relative shrink-0 w-[327.244px]" data-name="HomePage">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[75.967px] relative w-[327.244px]">
        <Container5 />
        <Icon4 />
      </div>
    </div>
  );
}

function Card1() {
  return (
    <div className="bg-white h-[116.115px] relative rounded-[16px] shrink-0 w-full" data-name="Card">
      <div aria-hidden="true" className="absolute border-[1.078px] border-gray-200 border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="size-full">
        <div className="box-border content-stretch flex flex-col h-[116.115px] items-start pb-[1.078px] pl-[17.076px] pr-[1.078px] pt-[17.076px] relative w-full">
          <HomePage1 />
        </div>
      </div>
    </div>
  );
}

function CardTitle2() {
  return (
    <div className="h-[23.998px] overflow-clip relative shrink-0 w-full" data-name="CardTitle">
      <div className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[0] left-0 not-italic text-[16px] text-neutral-950 text-nowrap top-[-0.84px] tracking-[-0.3125px]">
        <p className="leading-[24px] whitespace-pre">The Detective</p>
      </div>
    </div>
  );
}

function CardDescription2() {
  return (
    <div className="h-[39.979px] overflow-clip relative shrink-0 w-full" data-name="CardDescription">
      <div className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[0] left-0 not-italic text-[14px] text-zinc-500 top-[0.08px] tracking-[-0.1504px] w-[289px]">
        <p className="leading-[20px]">A noir mystery following a detective in 1940s New York</p>
      </div>
    </div>
  );
}

function Icon5() {
  return (
    <div className="relative shrink-0 size-[11.99px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 12">
        <g clipPath="url(#clip0_31_664)" id="Icon">
          <path d={svgPaths.p17655480} id="Vector" stroke="var(--stroke-0, #71717A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.999201" />
          <path d={svgPaths.pad45f00} id="Vector_2" stroke="var(--stroke-0, #71717A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.999201" />
        </g>
        <defs>
          <clipPath id="clip0_31_664">
            <rect fill="white" height="11.9904" width="11.9904" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Text2() {
  return (
    <div className="h-[15.998px] relative shrink-0 w-[67.581px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex h-[15.998px] items-start relative w-[67.581px]">
        <div className="font-['Inter:Regular',_sans-serif] font-normal leading-[0] not-italic relative shrink-0 text-[12px] text-nowrap text-zinc-500">
          <p className="leading-[16px] whitespace-pre">Vor 3 Tagen</p>
        </div>
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="content-stretch flex gap-[5.995px] h-[15.998px] items-center relative shrink-0 w-full" data-name="Container">
      <Icon5 />
      <Text2 />
    </div>
  );
}

function Container7() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[3.991px] h-[95.957px] items-start left-0 top-0 w-[295.264px]" data-name="Container">
      <CardTitle2 />
      <CardDescription2 />
      <Container6 />
    </div>
  );
}

function Icon6() {
  return (
    <div className="absolute left-[307.25px] size-[19.99px] top-[3.99px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d={svgPaths.p37000900} id="Vector" stroke="var(--stroke-0, #71717A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6658" />
        </g>
      </svg>
    </div>
  );
}

function HomePage2() {
  return (
    <div className="h-[95.957px] relative shrink-0 w-[327.244px]" data-name="HomePage">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[95.957px] relative w-[327.244px]">
        <Container7 />
        <Icon6 />
      </div>
    </div>
  );
}

function Card2() {
  return (
    <div className="bg-white h-[136.105px] relative rounded-[16px] shrink-0 w-full" data-name="Card">
      <div aria-hidden="true" className="absolute border-[1.078px] border-gray-200 border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="size-full">
        <div className="box-border content-stretch flex flex-col h-[136.105px] items-start pb-[1.078px] pl-[17.076px] pr-[1.078px] pt-[17.076px] relative w-full">
          <HomePage2 />
        </div>
      </div>
    </div>
  );
}

function Container8() {
  return (
    <div className="content-stretch flex flex-col gap-[11.99px] h-[412.305px] items-start relative shrink-0 w-full" data-name="Container">
      <Card />
      <Card1 />
      <Card2 />
    </div>
  );
}

function Section() {
  return (
    <div className="absolute box-border content-stretch flex flex-col gap-[15.998px] h-[452.301px] items-start left-0 px-[15.998px] py-0 top-[71.99px] w-[393.393px]" data-name="Section">
      <Container1 />
      <Container8 />
    </div>
  );
}

function Icon7() {
  return (
    <div className="relative shrink-0 size-[39.996px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 40 40">
        <g id="Icon" opacity="0.5">
          <path d={svgPaths.p361b4400} id="Vector" stroke="var(--stroke-0, #6E59A5)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.33301" />
          <path d={svgPaths.p1ddb8c00} id="Vector_2" stroke="var(--stroke-0, #6E59A5)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.33301" />
        </g>
      </svg>
    </div>
  );
}

function Paragraph1() {
  return (
    <div className="h-[45.469px] relative shrink-0 w-[311.246px]" data-name="Paragraph">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[45.469px] relative w-[311.246px]">
        <div className="absolute font-['Inter:Italic',_sans-serif] font-normal italic leading-[0] left-[155.74px] text-[14px] text-center text-neutral-950 top-[0.16px] tracking-[-0.1504px] translate-x-[-50%] w-[304px]">
          <p className="leading-[22.75px]">“The scariest moment is always just before you start.”</p>
        </div>
      </div>
    </div>
  );
}

function Paragraph2() {
  return (
    <div className="h-[15.998px] relative shrink-0 w-[89.423px]" data-name="Paragraph">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[15.998px] relative w-[89.423px]">
        <div className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[0] left-[45px] not-italic text-[12px] text-center text-zinc-500 top-0 translate-x-[-50%] w-[90px]">
          <p className="leading-[16px]">— Stephen King</p>
        </div>
      </div>
    </div>
  );
}

function HomePage3() {
  return (
    <div className="h-[129.453px] relative shrink-0 w-[311.246px]" data-name="HomePage">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[15.998px] h-[129.453px] items-center relative w-[311.246px]">
        <Icon7 />
        <Paragraph1 />
        <Paragraph2 />
      </div>
    </div>
  );
}

function Card3() {
  return (
    <div className="absolute box-border content-stretch flex flex-col h-[179.604px] items-start left-[16px] pb-[1.078px] pl-[25.075px] pr-[1.078px] pt-[25.075px] rounded-[16px] top-[556.29px] w-[361.397px]" data-name="Card">
      <div aria-hidden="true" className="absolute border-[1.078px] border-[rgba(110,89,165,0.2)] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <HomePage3 />
    </div>
  );
}

function HomePage4() {
  return (
    <div className="absolute bg-[#f5f6f8] h-[852.532px] left-0 top-[57.07px] w-[393.393px]" data-name="HomePage">
      <Container />
      <Section />
      <Card3 />
    </div>
  );
}

function Text3() {
  return <div className="absolute left-0 opacity-0 size-0 top-0" data-name="Text" />;
}

function Text4() {
  return <div className="absolute left-0 opacity-0 size-0 top-[852.53px]" data-name="Text" />;
}

function ImageScriptonyLogo() {
  return (
    <div className="relative shrink-0 size-[39.996px]" data-name="Image (Scriptony Logo)">
      <img alt="" className="absolute bg-clip-padding border-0 border-[transparent] border-solid box-border inset-0 max-w-none object-50%-50% object-contain pointer-events-none size-full" src={imgImageScriptonyLogo} />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border size-[39.996px]" />
    </div>
  );
}

function Text5() {
  return (
    <div className="h-[23.998px] relative shrink-0 w-[45.722px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[23.998px] relative w-[45.722px]">
        <div className="absolute font-['Inter:Bold',_sans-serif] font-bold leading-[0] left-0 not-italic text-[16px] text-neutral-950 text-nowrap top-[-0.84px] tracking-[-0.3125px]">
          <p className="leading-[24px] whitespace-pre">Home</p>
        </div>
      </div>
    </div>
  );
}

function Container9() {
  return (
    <div className="h-[39.996px] relative shrink-0 w-[93.717px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[7.999px] h-[39.996px] items-center relative w-[93.717px]">
        <ImageScriptonyLogo />
        <Text5 />
      </div>
    </div>
  );
}

function Icon8() {
  return (
    <div className="relative shrink-0 size-[15.998px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.pd17e640} id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3332" />
        </g>
      </svg>
    </div>
  );
}

function Button1() {
  return (
    <div className="relative rounded-[3.61646e+07px] shrink-0 size-[35.988px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex items-center justify-center pl-0 pr-[0.017px] py-0 relative size-[35.988px]">
        <Icon8 />
      </div>
    </div>
  );
}

function Container10() {
  return (
    <div className="h-[55.995px] relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-row items-center size-full">
        <div className="box-border content-stretch flex h-[55.995px] items-center justify-between px-[15.998px] py-0 relative w-full">
          <Container9 />
          <Button1 />
        </div>
      </div>
    </div>
  );
}

function Navigation() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col h-[57.072px] items-start left-0 pb-[1.078px] pt-0 px-0 top-0 w-[393.393px]" data-name="Navigation">
      <div aria-hidden="true" className="absolute border-[0px_0px_1.078px] border-gray-200 border-solid inset-0 pointer-events-none shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]" />
      <Container10 />
    </div>
  );
}

function Icon9() {
  return (
    <div className="h-[21.989px] overflow-clip relative shrink-0 w-full" data-name="Icon">
      <div className="absolute bottom-[12.5%] left-[37.5%] right-[37.5%] top-1/2" data-name="Vector">
        <div className="absolute inset-[-13.89%_-20.83%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 9 12">
            <path d={svgPaths.p39eadd00} id="Vector" stroke="var(--stroke-0, #6E59A5)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.29048" />
          </svg>
        </div>
      </div>
      <div className="absolute inset-[8.33%_12.5%_12.5%_12.5%]" data-name="Vector">
        <div className="absolute inset-[-6.58%_-6.94%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 21">
            <path d={svgPaths.p1569f300} id="Vector" stroke="var(--stroke-0, #6E59A5)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.29048" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Container11() {
  return (
    <div className="relative shrink-0 size-[21.989px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col items-start relative size-[21.989px]">
        <Icon9 />
      </div>
    </div>
  );
}

function Text6() {
  return (
    <div className="h-[15.005px] relative shrink-0 w-[28.73px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[15.005px] relative w-[28.73px]">
        <div className="absolute font-['Inter:Medium',_sans-serif] font-medium leading-[0] left-0 not-italic text-[#6e59a5] text-[10px] text-nowrap top-[0.08px] tracking-[0.1172px]">
          <p className="leading-[15px] whitespace-pre">Home</p>
        </div>
      </div>
    </div>
  );
}

function Button2() {
  return (
    <div className="absolute box-border content-stretch flex flex-col gap-[2.992px] h-[54.984px] items-center justify-center left-[13.74px] pb-[0.999px] pt-0 px-0 rounded-[16px] top-[8px] w-[63.994px]" data-name="Button">
      <Container11 />
      <Text6 />
    </div>
  );
}

function Icon10() {
  return (
    <div className="h-[19.99px] overflow-clip relative shrink-0 w-full" data-name="Icon">
      <div className="absolute inset-[12.5%]" data-name="Vector">
        <div className="absolute inset-[-5.56%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17 17">
            <path d={svgPaths.p225ddc0} id="Vector" stroke="var(--stroke-0, #71717A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6658" />
          </svg>
        </div>
      </div>
      <div className="absolute inset-[12.5%_70.83%_12.5%_29.17%]" data-name="Vector">
        <div className="absolute inset-[-5.56%_-0.83px]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2 17">
            <path d="M1 1V15.9922" id="Vector" stroke="var(--stroke-0, #71717A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6658" />
          </svg>
        </div>
      </div>
      <div className="absolute inset-[31.25%_70.83%_68.75%_12.5%]" data-name="Vector">
        <div className="absolute inset-[-0.83px_-25%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 6 2">
            <path d="M1 1H4.33161" id="Vector" stroke="var(--stroke-0, #71717A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6658" />
          </svg>
        </div>
      </div>
      <div className="absolute bottom-1/2 left-[12.5%] right-[12.5%] top-1/2" data-name="Vector">
        <div className="absolute inset-[-0.83px_-5.56%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17 2">
            <path d="M1 1H15.9922" id="Vector" stroke="var(--stroke-0, #71717A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6658" />
          </svg>
        </div>
      </div>
      <div className="absolute inset-[68.75%_70.83%_31.25%_12.5%]" data-name="Vector">
        <div className="absolute inset-[-0.83px_-25%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 6 2">
            <path d="M1 1H4.33161" id="Vector" stroke="var(--stroke-0, #71717A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6658" />
          </svg>
        </div>
      </div>
      <div className="absolute inset-[12.5%_29.17%_12.5%_70.83%]" data-name="Vector">
        <div className="absolute inset-[-5.56%_-0.83px]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2 17">
            <path d="M1 1V15.9922" id="Vector" stroke="var(--stroke-0, #71717A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6658" />
          </svg>
        </div>
      </div>
      <div className="absolute inset-[31.25%_12.5%_68.75%_70.83%]" data-name="Vector">
        <div className="absolute inset-[-0.83px_-25%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 6 2">
            <path d="M1 1H4.33161" id="Vector" stroke="var(--stroke-0, #71717A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6658" />
          </svg>
        </div>
      </div>
      <div className="absolute inset-[68.75%_12.5%_31.25%_70.83%]" data-name="Vector">
        <div className="absolute inset-[-0.83px_-25%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 6 2">
            <path d="M1 1H4.33161" id="Vector" stroke="var(--stroke-0, #71717A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6658" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Container12() {
  return (
    <div className="relative shrink-0 size-[19.99px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col items-start relative size-[19.99px]">
        <Icon10 />
      </div>
    </div>
  );
}

function Text7() {
  return (
    <div className="h-[15.005px] relative shrink-0 w-[39.71px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[15.005px] relative w-[39.71px]">
        <div className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[0] left-0 not-italic text-[10px] text-nowrap text-zinc-500 top-[0.08px] tracking-[0.1172px]">
          <p className="leading-[15px] whitespace-pre">Projekte</p>
        </div>
      </div>
    </div>
  );
}

function Button3() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[3.991px] h-[54.984px] items-center justify-center left-[89.22px] rounded-[16px] top-[8px] w-[63.994px]" data-name="Button">
      <Container12 />
      <Text7 />
    </div>
  );
}

function Icon11() {
  return (
    <div className="h-[19.99px] overflow-clip relative shrink-0 w-full" data-name="Icon">
      <div className="absolute inset-[8.333%]" data-name="Vector">
        <div className="absolute inset-[-5%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 19 19">
            <path d={svgPaths.p2d5e3a00} id="Vector" stroke="var(--stroke-0, #71717A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6658" />
          </svg>
        </div>
      </div>
      <div className="absolute inset-[8.33%_33.33%]" data-name="Vector">
        <div className="absolute inset-[-5%_-12.5%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 9 19">
            <path d={svgPaths.p3a980100} id="Vector" stroke="var(--stroke-0, #71717A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6658" />
          </svg>
        </div>
      </div>
      <div className="absolute bottom-1/2 left-[8.33%] right-[8.33%] top-1/2" data-name="Vector">
        <div className="absolute inset-[-0.83px_-5%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 19 2">
            <path d="M1 1H17.658" id="Vector" stroke="var(--stroke-0, #71717A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6658" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Container13() {
  return (
    <div className="relative shrink-0 size-[19.99px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col items-start relative size-[19.99px]">
        <Icon11 />
      </div>
    </div>
  );
}

function Text8() {
  return (
    <div className="h-[15.005px] relative shrink-0 w-[33.226px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[15.005px] relative w-[33.226px]">
        <div className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[0] left-0 not-italic text-[10px] text-nowrap text-zinc-500 top-[0.08px] tracking-[0.1172px]">
          <p className="leading-[15px] whitespace-pre">Welten</p>
        </div>
      </div>
    </div>
  );
}

function Button4() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[3.991px] h-[54.984px] items-center justify-center left-[164.7px] rounded-[16px] top-[8px] w-[63.994px]" data-name="Button">
      <Container13 />
      <Text8 />
    </div>
  );
}

function Icon12() {
  return (
    <div className="h-[19.99px] overflow-clip relative shrink-0 w-full" data-name="Icon">
      <div className="absolute inset-[8.04%_8.04%_44.36%_44.36%]" data-name="Vector">
        <div className="absolute inset-[-8.75%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 12">
            <path d={svgPaths.p3b307d00} id="Vector" stroke="var(--stroke-0, #71717A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6658" />
          </svg>
        </div>
      </div>
      <div className="absolute inset-[83.75%_83.75%_10.42%_10.42%]" data-name="Vector">
        <div className="absolute inset-[-71.429%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 3 3">
            <path d="M1 2.16606L2.16606 1" id="Vector" stroke="var(--stroke-0, #71717A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6658" />
          </svg>
        </div>
      </div>
      <div className="absolute inset-[10.42%_10.42%_83.75%_83.75%]" data-name="Vector">
        <div className="absolute inset-[-71.429%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 3 3">
            <path d="M1 2.16606L2.16606 1" id="Vector" stroke="var(--stroke-0, #71717A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6658" />
          </svg>
        </div>
      </div>
      <div className="absolute inset-[44.36%_44.36%_8.04%_8.04%]" data-name="Vector">
        <div className="absolute inset-[-8.75%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 12">
            <path d={svgPaths.p31318c00} id="Vector" stroke="var(--stroke-0, #71717A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6658" />
          </svg>
        </div>
      </div>
      <div className="absolute inset-[40%]" data-name="Vector">
        <div className="absolute inset-[-20.833%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 6 6">
            <path d="M1 4.99793L4.99793 1" id="Vector" stroke="var(--stroke-0, #71717A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6658" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Container14() {
  return (
    <div className="relative shrink-0 size-[19.99px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col items-start relative size-[19.99px]">
        <Icon12 />
      </div>
    </div>
  );
}

function Text9() {
  return (
    <div className="h-[15.005px] relative shrink-0 w-[21.943px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[15.005px] relative w-[21.943px]">
        <div className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[0] left-0 not-italic text-[10px] text-nowrap text-zinc-500 top-[0.08px] tracking-[0.1172px]">
          <p className="leading-[15px] whitespace-pre">Gym</p>
        </div>
      </div>
    </div>
  );
}

function Button5() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[3.991px] h-[54.984px] items-center justify-center left-[240.18px] rounded-[16px] top-[8px] w-[63.994px]" data-name="Button">
      <Container14 />
      <Text9 />
    </div>
  );
}

function Icon13() {
  return (
    <div className="h-[19.99px] overflow-clip relative shrink-0 w-full" data-name="Icon">
      <div className="absolute inset-[8.41%_12.68%]" data-name="Vector">
        <div className="absolute inset-[-5.01%_-5.58%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17 19">
            <path d={svgPaths.p2efee128} id="Vector" stroke="var(--stroke-0, #71717A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6658" />
          </svg>
        </div>
      </div>
      <div className="absolute inset-[37.5%]" data-name="Vector">
        <div className="absolute inset-[-16.667%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 7 7">
            <path d={svgPaths.p3f780700} id="Vector" stroke="var(--stroke-0, #71717A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6658" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Container15() {
  return (
    <div className="relative shrink-0 size-[19.99px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col items-start relative size-[19.99px]">
        <Icon13 />
      </div>
    </div>
  );
}

function Text10() {
  return (
    <div className="h-[15.005px] relative shrink-0 w-[39.895px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[15.005px] relative w-[39.895px]">
        <div className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[0] left-0 not-italic text-[10px] text-nowrap text-zinc-500 top-[0.08px] tracking-[0.1172px]">
          <p className="leading-[15px] whitespace-pre">Settings</p>
        </div>
      </div>
    </div>
  );
}

function Button6() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[3.991px] h-[54.984px] items-center justify-center left-[315.66px] rounded-[16px] top-[8px] w-[63.994px]" data-name="Button">
      <Container15 />
      <Text10 />
    </div>
  );
}

function Container16() {
  return (
    <div className="h-[70.983px] relative shrink-0 w-full" data-name="Container">
      <Button2 />
      <Button3 />
      <Button4 />
      <Button5 />
      <Button6 />
    </div>
  );
}

function Navigation1() {
  return (
    <div className="absolute bg-white box-border content-stretch flex flex-col h-[72.06px] items-start left-0 pb-0 pt-[1.078px] px-0 top-[780.47px] w-[393.393px]" data-name="Navigation">
      <div aria-hidden="true" className="absolute border-[1.078px_0px_0px] border-gray-200 border-solid inset-0 pointer-events-none shadow-[0px_-2px_10px_0px_rgba(0,0,0,0.1)]" />
      <Container16 />
    </div>
  );
}

function Icon14() {
  return (
    <div className="relative shrink-0 size-[23.998px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="Icon">
          <path d={svgPaths.p4269dc0} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.99981" />
        </g>
      </svg>
    </div>
  );
}

function ScriptonyAssistant() {
  return (
    <div className="absolute bg-[#6e59a5] box-border content-stretch flex items-center justify-center left-[321.4px] rounded-[3.61646e+07px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] size-[55.995px] top-[716.54px]" data-name="ScriptonyAssistant">
      <Icon14 />
    </div>
  );
}

function PrimitiveDiv() {
  return <div className="absolute bg-[rgba(0,0,0,0.5)] h-[852.532px] left-0 top-0 w-[393.393px]" data-name="Primitive.div" />;
}

function PrimitiveH2() {
  return (
    <div className="h-[23.998px] relative shrink-0 w-0" data-name="Primitive.h2">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[23.998px] relative w-0">
        <div className="absolute font-['Inter:Semi_Bold',_sans-serif] font-semibold leading-[0] left-0 not-italic text-[16px] text-neutral-950 text-nowrap top-[-0.84px] tracking-[-0.3125px]">
          <p className="leading-[24px] whitespace-pre">Scriptony Assistant</p>
        </div>
      </div>
    </div>
  );
}

function PrimitiveP() {
  return (
    <div className="h-[19.99px] relative shrink-0 w-0" data-name="Primitive.p">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[19.99px] relative w-0">
        <div className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[0] left-0 not-italic text-[14px] text-nowrap text-zinc-500 top-[0.08px] tracking-[-0.1504px]">
          <p className="leading-[20px] whitespace-pre">AI-gestützter Assistent für deine Drehbuch-Projekte</p>
        </div>
      </div>
    </div>
  );
}

function SheetHeader() {
  return (
    <div className="absolute box-border content-stretch flex flex-col gap-[5.995px] items-start left-[-0.99px] overflow-clip pb-0 pl-[15.998px] pr-0 pt-[15.998px] size-[31.997px] top-[-0.99px]" data-name="SheetHeader">
      <PrimitiveH2 />
      <PrimitiveP />
    </div>
  );
}

function AssistantIcon() {
  return (
    <div className="relative shrink-0 size-[19.99px]" data-name="AssistantIcon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_31_604)" id="AssistantIcon">
          <path d={svgPaths.p19346500} fill="var(--fill-0, #6E59A5)" id="Vector" />
        </g>
        <defs>
          <clipPath id="clip0_31_604">
            <rect fill="white" height="19.9896" width="19.9896" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Container17() {
  return (
    <div className="relative shrink-0 size-[19.99px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex items-center justify-center relative size-[19.99px]">
        <AssistantIcon />
      </div>
    </div>
  );
}

function Heading3() {
  return (
    <div className="h-[23.088px] relative shrink-0 w-[142.858px]" data-name="Heading 3">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[23.088px] relative w-[142.858px]">
        <div className="absolute font-['Inter:Semi_Bold',_sans-serif] font-semibold leading-[0] left-0 not-italic text-[#6e59a5] text-[15.4px] text-nowrap top-[0.16px] tracking-[-0.2647px]">
          <p className="leading-[23.1px] whitespace-pre">Scriptony Assistant</p>
        </div>
      </div>
    </div>
  );
}

function Container18() {
  return (
    <div className="absolute content-stretch flex gap-[7.999px] h-[23.088px] items-center left-[16px] top-[16px] w-[344px]" data-name="Container">
      <Container17 />
      <Heading3 />
    </div>
  );
}

function Label() {
  return (
    <div className="h-[15.005px] relative shrink-0 w-full" data-name="Label">
      <div className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[0] left-0 not-italic text-[#a1a1a7] text-[10px] text-nowrap top-[0.08px] tracking-[0.1172px]">
        <p className="leading-[15px] whitespace-pre">Modell:</p>
      </div>
    </div>
  );
}

function PrimitiveSpan() {
  return (
    <div className="h-[16.487px] relative shrink-0 w-[77.635px]" data-name="Primitive.span">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[8px] h-[16.487px] items-center overflow-clip relative w-[77.635px]">
        <div className="font-['Inter:Regular',_sans-serif] font-normal leading-[0] not-italic relative shrink-0 text-[#646567] text-[11px] text-nowrap tracking-[0.0645px]">
          <p className="leading-[16.5px] whitespace-pre">Claude 4 Opus</p>
        </div>
      </div>
    </div>
  );
}

function Icon15() {
  return (
    <div className="relative shrink-0 size-[15.998px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon" opacity="0.5">
          <path d={svgPaths.p1a57cf00} id="Vector" stroke="var(--stroke-0, #71717A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3332" />
        </g>
      </svg>
    </div>
  );
}

function PrimitiveButton() {
  return (
    <div className="bg-[#e4e6ea] h-[35.988px] relative rounded-[10px] shrink-0 w-full" data-name="Primitive.button">
      <div className="flex flex-row items-center size-full">
        <div className="box-border content-stretch flex h-[35.988px] items-center justify-between px-[11.99px] py-0 relative w-full">
          <PrimitiveSpan />
          <Icon15 />
        </div>
      </div>
    </div>
  );
}

function Container19() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[3.991px] h-[54.984px] items-start left-0 top-0 w-[168.001px]" data-name="Container">
      <Label />
      <PrimitiveButton />
    </div>
  );
}

function Label1() {
  return (
    <div className="h-[15.005px] relative shrink-0 w-full" data-name="Label">
      <div className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[0] left-0 not-italic text-[#a1a1a7] text-[10px] text-nowrap top-[0.08px] tracking-[0.1172px]">
        <p className="leading-[15px] whitespace-pre">Context:</p>
      </div>
    </div>
  );
}

function Text11() {
  return (
    <div className="h-[15.005px] relative shrink-0 w-[50.084px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[15.005px] relative w-[50.084px]">
        <div className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[0] left-0 not-italic text-[#727375] text-[10px] top-[0.08px] tracking-[0.1172px] w-[51px]">
          <p className="leading-[15px]">0/200.000</p>
        </div>
      </div>
    </div>
  );
}

function Container20() {
  return (
    <div className="bg-[#e4e6ea] h-[31.997px] relative rounded-[10px] shrink-0 w-full" data-name="Container">
      <div className="flex flex-row items-center size-full">
        <div className="box-border content-stretch flex h-[31.997px] items-center justify-between pl-[11.99px] pr-[105.927px] py-0 relative w-full">
          <Text11 />
        </div>
      </div>
    </div>
  );
}

function Container21() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[3.991px] h-[54.984px] items-start left-[176px] top-0 w-[168.001px]" data-name="Container">
      <Label1 />
      <Container20 />
    </div>
  );
}

function Container22() {
  return (
    <div className="absolute h-[54.984px] left-[16px] top-[98.57px] w-[344px]" data-name="Container">
      <Container19 />
      <Container21 />
    </div>
  );
}

function ChatHistoryIcon() {
  return (
    <div className="relative shrink-0 size-[19.99px]" data-name="ChatHistoryIcon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_31_598)" id="ChatHistoryIcon">
          <path d={svgPaths.p2d740f80} fill="var(--fill-0, white)" id="Vector" />
          <path d={svgPaths.p1fe2ac80} fill="var(--fill-0, white)" id="Vector_2" />
          <path d={svgPaths.p2c2f7000} fill="var(--fill-0, white)" id="Vector_3" />
          <path d={svgPaths.p11bd8800} fill="var(--fill-0, white)" id="Vector_4" />
        </g>
        <defs>
          <clipPath id="clip0_31_598">
            <rect fill="white" height="19.9896" width="19.9896" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Container23() {
  return (
    <div className="relative shrink-0 size-[19.99px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex items-center justify-center relative size-[19.99px]">
        <ChatHistoryIcon />
      </div>
    </div>
  );
}

function Text12() {
  return (
    <div className="h-[8.757px] relative shrink-0 w-[45.116px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex h-[8.757px] items-start relative w-[45.116px]">
        <div className="font-['Inter:Regular',_sans-serif] font-normal leading-[0] not-italic relative shrink-0 text-[7px] text-center text-nowrap text-white tracking-[0.2301px]">
          <p className="leading-[8.75px] whitespace-pre">Chat-History</p>
        </div>
      </div>
    </div>
  );
}

function Button7() {
  return (
    <div className="absolute bg-[#6e59a5] content-stretch flex flex-col gap-[3.991px] h-[63.994px] items-center justify-center left-0 rounded-[10px] top-0 w-[62.394px]" data-name="Button">
      <Container23 />
      <Text12 />
    </div>
  );
}

function DatabaseIcon() {
  return (
    <div className="relative shrink-0 size-[19.99px]" data-name="DatabaseIcon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="DatabaseIcon">
          <path d={svgPaths.pbe0c000} fill="var(--fill-0, white)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Container24() {
  return (
    <div className="relative shrink-0 size-[19.99px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex items-center justify-center relative size-[19.99px]">
        <DatabaseIcon />
      </div>
    </div>
  );
}

function Text13() {
  return (
    <div className="h-[17.514px] relative shrink-0 w-[46.395px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[17.514px] relative w-[46.395px]">
        <div className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[0] left-[23.38px] not-italic text-[7px] text-center text-white top-0 tracking-[0.2301px] translate-x-[-50%] w-[38px]">
          <p className="leading-[8.75px]">RAG-Datenbank</p>
        </div>
      </div>
    </div>
  );
}

function Button8() {
  return (
    <div className="absolute bg-[#6e59a5] content-stretch flex flex-col gap-[3.991px] h-[63.994px] items-center justify-center left-[70.39px] rounded-[10px] top-0 w-[62.394px]" data-name="Button">
      <Container24 />
      <Text13 />
    </div>
  );
}

function SystemPromptIcon() {
  return (
    <div className="relative shrink-0 size-[19.99px]" data-name="SystemPromptIcon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_31_592)" id="SystemPromptIcon">
          <path d={svgPaths.p2ba88600} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3558" />
        </g>
        <defs>
          <clipPath id="clip0_31_592">
            <rect fill="white" height="19.9896" width="19.9896" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Container25() {
  return (
    <div className="relative shrink-0 size-[19.99px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex items-center justify-center relative size-[19.99px]">
        <SystemPromptIcon />
      </div>
    </div>
  );
}

function Text14() {
  return (
    <div className="h-[17.514px] relative shrink-0 w-[46.412px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[17.514px] relative w-[46.412px]">
        <div className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[0] left-[23.57px] not-italic text-[7px] text-center text-white top-0 tracking-[0.2301px] translate-x-[-50%] w-[30px]">
          <p className="leading-[8.75px]">System-Prompt</p>
        </div>
      </div>
    </div>
  );
}

function Button9() {
  return (
    <div className="absolute bg-[#6e59a5] content-stretch flex flex-col gap-[3.991px] h-[63.994px] items-center justify-center left-[140.79px] rounded-[10px] top-0 w-[62.411px]" data-name="Button">
      <Container25 />
      <Text14 />
    </div>
  );
}

function ExportIcon() {
  return (
    <div className="relative shrink-0 size-[19.99px]" data-name="ExportIcon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_31_636)" id="ExportIcon">
          <path d={svgPaths.p37c63800} fill="var(--fill-0, white)" id="Vector" />
        </g>
        <defs>
          <clipPath id="clip0_31_636">
            <rect fill="white" height="19.9896" width="19.9896" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Container26() {
  return (
    <div className="relative shrink-0 size-[19.99px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex items-center justify-center relative size-[19.99px]">
        <ExportIcon />
      </div>
    </div>
  );
}

function Text15() {
  return (
    <div className="h-[8.757px] relative shrink-0 w-[41.545px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex h-[8.757px] items-start relative w-[41.545px]">
        <div className="font-['Inter:Regular',_sans-serif] font-normal leading-[0] not-italic relative shrink-0 text-[7px] text-center text-nowrap text-white tracking-[0.2301px]">
          <p className="leading-[8.75px] whitespace-pre">Export Chat</p>
        </div>
      </div>
    </div>
  );
}

function Button10() {
  return (
    <div className="absolute bg-[#6e59a5] content-stretch flex flex-col gap-[3.991px] h-[63.994px] items-center justify-center left-[211.2px] rounded-[10px] top-0 w-[62.394px]" data-name="Button">
      <Container26 />
      <Text15 />
    </div>
  );
}

function SettingsIcon() {
  return (
    <div className="relative shrink-0 size-[19.99px]" data-name="SettingsIcon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_31_588)" id="SettingsIcon">
          <path d={svgPaths.p251deb80} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.22107" />
          <path d={svgPaths.p6c30a80} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.22107" />
        </g>
        <defs>
          <clipPath id="clip0_31_588">
            <rect fill="white" height="19.9896" width="19.9896" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Container27() {
  return (
    <div className="relative shrink-0 size-[19.99px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex items-center justify-center relative size-[19.99px]">
        <SettingsIcon />
      </div>
    </div>
  );
}

function Text16() {
  return (
    <div className="h-[17.514px] relative shrink-0 w-[46.395px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[17.514px] relative w-[46.395px]">
        <div className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[0] left-[23.64px] not-italic text-[7px] text-center text-white top-0 tracking-[0.2301px] translate-x-[-50%] w-[30px]">
          <p className="leading-[8.75px]">Chat Settings</p>
        </div>
      </div>
    </div>
  );
}

function Button11() {
  return (
    <div className="absolute bg-[#6e59a5] content-stretch flex flex-col gap-[3.991px] h-[63.994px] items-center justify-center left-[281.59px] rounded-[10px] top-0 w-[62.394px]" data-name="Button">
      <Container27 />
      <Text16 />
    </div>
  );
}

function Container28() {
  return (
    <div className="absolute h-[63.994px] left-[16px] top-[165.54px] w-[344px]" data-name="Container">
      <Button7 />
      <Button8 />
      <Button9 />
      <Button10 />
      <Button11 />
    </div>
  );
}

function Text17() {
  return (
    <div className="basis-0 grow h-[19.501px] min-h-px min-w-px relative shrink-0" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[19.501px] relative w-full">
        <div className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[0] left-0 not-italic text-[#646567] text-[13px] text-nowrap top-[0.08px] tracking-[-0.0762px]">
          <p className="leading-[19.5px] whitespace-pre">Scriptony Assistant Chat - 1.10.2025 - 08:10</p>
        </div>
      </div>
    </div>
  );
}

function Container29() {
  return (
    <div className="absolute bg-[#e4e6ea] box-border content-stretch flex h-[35.5px] items-center left-0 pl-[11.99px] pr-[39.996px] py-0 rounded-[10px] top-0 w-[344px]" data-name="Container">
      <Text17 />
    </div>
  );
}

function BxEdit() {
  return (
    <div className="absolute contents inset-[10.33%_9.87%_12.5%_12.5%]" data-name="bx:edit">
      <div className="absolute inset-[10.33%_9.87%_29.11%_29.17%]" data-name="Vector">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10 10">
          <path d={svgPaths.p14c96f80} fill="var(--fill-0, black)" id="Vector" />
        </svg>
      </div>
      <div className="absolute inset-[12.5%]" data-name="Vector_2">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 12">
          <path d={svgPaths.p30c35a40} fill="var(--fill-0, black)" id="Vector_2" />
        </svg>
      </div>
    </div>
  );
}

function Icon16() {
  return (
    <div className="h-[15.998px] overflow-clip relative shrink-0 w-full" data-name="Icon">
      <BxEdit />
    </div>
  );
}

function BxEdit1() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-[3.99px] size-[15.998px] top-[3.99px]" data-name="BxEdit">
      <Icon16 />
    </div>
  );
}

function Button12() {
  return (
    <div className="absolute left-[312px] rounded-[10px] size-[23.998px] top-[5.75px]" data-name="Button">
      <BxEdit1 />
    </div>
  );
}

function Container30() {
  return (
    <div className="absolute h-[35.5px] left-[16px] top-[51.08px] w-[344px]" data-name="Container">
      <Container29 />
      <Button12 />
    </div>
  );
}

function Container31() {
  return (
    <div className="absolute h-[237.535px] left-0 top-0 w-[375.997px]" data-name="Container">
      <Container18 />
      <Container22 />
      <Container28 />
      <Container30 />
    </div>
  );
}

function Icon17() {
  return (
    <div className="relative shrink-0 size-[15.998px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_31_619)" id="Icon">
          <path d="M7.99922 12.6654V14.6652" id="Vector" stroke="var(--stroke-0, #6E59A5)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3332" />
          <path d={svgPaths.p21dad780} id="Vector_2" stroke="var(--stroke-0, #6E59A5)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3332" />
          <path d={svgPaths.p38bfae80} id="Vector_3" stroke="var(--stroke-0, #6E59A5)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3332" />
        </g>
        <defs>
          <clipPath id="clip0_31_619">
            <rect fill="white" height="15.9984" width="15.9984" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button13() {
  return (
    <div className="bg-[#e4e6ea] relative rounded-[10px] shrink-0 size-[30.986px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex items-center justify-center relative size-[30.986px]">
        <Icon17 />
      </div>
    </div>
  );
}

function TextInput() {
  return (
    <div className="basis-0 grow h-[22.179px] min-h-px min-w-px relative shrink-0" data-name="Text Input">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex h-[22.179px] items-center overflow-clip relative w-full">
        <div className="font-['Inter:Regular',_sans-serif] font-normal leading-[0] not-italic relative shrink-0 text-[#9e9ea4] text-[14.8px] text-nowrap tracking-[-0.2168px]">
          <p className="leading-[normal] whitespace-pre">Schreibe eine Nachricht...</p>
        </div>
      </div>
    </div>
  );
}

function AttachIcon() {
  return (
    <div className="relative shrink-0 size-[19.99px]" data-name="AttachIcon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_31_583)" id="AttachIcon">
          <path d={svgPaths.p1ce7d680} id="Vector" stroke="var(--stroke-0, #6E59A5)" strokeLinecap="square" strokeWidth="1.90378" />
        </g>
        <defs>
          <clipPath id="clip0_31_583">
            <rect fill="white" height="19.9896" width="19.9896" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button14() {
  return (
    <div className="relative shrink-0 size-[19.99px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex items-center justify-center relative size-[19.99px]">
        <AttachIcon />
      </div>
    </div>
  );
}

function Text18() {
  return (
    <div className="h-[22.196px] relative shrink-0 w-[32.249px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[22.196px] relative w-[32.249px]">
        <div className="absolute font-['Inter:Bold',_sans-serif] font-bold leading-[0] left-0 not-italic text-[14.8px] text-nowrap text-white top-[0.16px] tracking-[-0.2168px]">
          <p className="leading-[22.2px] whitespace-pre">RUN</p>
        </div>
      </div>
    </div>
  );
}

function SendIcon() {
  return (
    <div className="relative shrink-0 size-[15.998px]" data-name="SendIcon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="SendIcon">
          <path d={svgPaths.p27781270} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.26304" />
        </g>
      </svg>
    </div>
  );
}

function Container32() {
  return (
    <div className="relative shrink-0 size-[15.998px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex items-center justify-center relative size-[15.998px]">
        <SendIcon />
      </div>
    </div>
  );
}

function Button15() {
  return (
    <div className="bg-[#6e59a5] h-[30.986px] opacity-50 relative rounded-[10px] shrink-0 w-[88.244px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[7.999px] h-[30.986px] items-center justify-center relative w-[88.244px]">
        <Text18 />
        <Container32 />
      </div>
    </div>
  );
}

function Container33() {
  return (
    <div className="absolute box-border content-stretch flex gap-[7.999px] h-[49.141px] items-center left-[16px] px-[9.077px] py-[1.078px] rounded-[10px] top-[522.85px] w-[344px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[1.078px] border-black border-solid inset-0 pointer-events-none rounded-[10px]" />
      <Button13 />
      <TextInput />
      <Button14 />
      <Button15 />
    </div>
  );
}

function EmptyChatIcon() {
  return (
    <div className="relative shrink-0 size-[72.987px]" data-name="EmptyChatIcon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 73 73">
        <g id="EmptyChatIcon">
          <path d={svgPaths.p145e4980} id="Vector" stroke="var(--stroke-0, #9D9DA5)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.99963" />
        </g>
      </svg>
    </div>
  );
}

function Container34() {
  return (
    <div className="absolute content-stretch flex items-center justify-center left-[95.92px] size-[72.987px] top-0" data-name="Container">
      <EmptyChatIcon />
    </div>
  );
}

function Heading4() {
  return (
    <div className="absolute h-[30.01px] left-[16px] top-[96.98px] w-[232.853px]" data-name="Heading 3">
      <div className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[0] left-[116.05px] not-italic text-[#9d9da5] text-[20px] text-center text-nowrap top-[-0.84px] tracking-[-0.4492px] translate-x-[-50%]">
        <p className="leading-[30px] whitespace-pre">Starte eine Konversation</p>
      </div>
    </div>
  );
}

function Paragraph3() {
  return (
    <div className="absolute font-['Inter:Regular',_sans-serif] font-normal h-[40.249px] leading-[0] left-[16px] not-italic text-[#9d9da5] text-[14.8px] text-center text-nowrap top-[142.99px] tracking-[-0.2168px] w-[232.853px]" data-name="Paragraph">
      <div className="absolute left-[116px] top-[0.08px] translate-x-[-50%]">
        <p className="leading-[20.122px] text-nowrap whitespace-pre">Frage mich zu aktuellen Projekten,</p>
      </div>
      <div className="absolute left-[116.3px] top-[20.2px] translate-x-[-50%]">
        <p className="leading-[20.122px] text-nowrap whitespace-pre">erstelle neue Projekte oder Welten</p>
      </div>
    </div>
  );
}

function ScriptonyAssistant1() {
  return (
    <div className="h-[183.241px] relative shrink-0 w-full" data-name="ScriptonyAssistant">
      <Container34 />
      <Heading4 />
      <Paragraph3 />
    </div>
  );
}

function PrimitiveDiv1() {
  return (
    <div className="absolute box-border content-stretch flex flex-col h-[285.311px] items-start left-[16px] overflow-clip pb-0 pt-[31.997px] px-[39.575px] top-[237.53px] w-[344px]" data-name="Primitive.div">
      <ScriptonyAssistant1 />
    </div>
  );
}

function Icon18() {
  return (
    <div className="absolute left-[11.99px] size-[13.994px] top-[8.49px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="Icon">
          <path d="M2.91551 6.99722H11.0789" id="Vector" stroke="var(--stroke-0, #646567)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.1662" />
          <path d="M6.99722 2.91551V11.0789" id="Vector_2" stroke="var(--stroke-0, #646567)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.1662" />
        </g>
      </svg>
    </div>
  );
}

function Button16() {
  return (
    <div className="bg-[#e4e6ea] h-[30.986px] relative rounded-[10px] shrink-0 w-[95.856px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[30.986px] relative w-[95.856px]">
        <Icon18 />
        <div className="absolute font-['Inter:Medium',_sans-serif] font-medium leading-[0] left-[31.98px] not-italic text-[#646567] text-[11px] text-nowrap top-[7.32px] tracking-[0.0645px]">
          <p className="leading-[16.5px] whitespace-pre">New Chat</p>
        </div>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <div className="relative shrink-0 size-[13.994px]" data-name="CloseIcon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g clipPath="url(#clip0_31_612)" id="CloseIcon">
          <path d={svgPaths.p3f1c7700} fill="var(--fill-0, white)" id="Vector" />
        </g>
        <defs>
          <clipPath id="clip0_31_612">
            <rect fill="white" height="13.9944" width="13.9944" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Container35() {
  return (
    <div className="relative shrink-0 size-[13.994px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex items-center justify-center relative size-[13.994px]">
        <CloseIcon />
      </div>
    </div>
  );
}

function Button17() {
  return (
    <div className="bg-[#6e59a5] relative rounded-[10px] shrink-0 size-[30.986px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex items-center justify-center pl-0 pr-[0.017px] py-0 relative size-[30.986px]">
        <Container35 />
      </div>
    </div>
  );
}

function Container36() {
  return (
    <div className="absolute content-stretch flex gap-[7.999px] h-[30.986px] items-center left-[225.16px] top-[8px] w-[134.842px]" data-name="Container">
      <Button16 />
      <Button17 />
    </div>
  );
}

function ScriptonyAssistant2() {
  return (
    <div className="absolute h-[595.984px] left-0 top-0 w-[375.997px]" data-name="ScriptonyAssistant">
      <Container31 />
      <Container33 />
      <PrimitiveDiv1 />
      <Container36 />
    </div>
  );
}

function PrimitiveDiv2() {
  return (
    <div className="absolute bg-[#f8f8f8] h-[595.984px] left-[8.69px] rounded-tl-[24px] rounded-tr-[24px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] top-[256.55px] w-[375.997px]" data-name="Primitive.div">
      <SheetHeader />
      <ScriptonyAssistant2 />
    </div>
  );
}

export default function ScriptonyApp() {
  return (
    <div className="bg-[#f5f6f8] relative size-full" data-name="Scriptony App">
      <HomePage4 />
      <Text3 />
      <Text4 />
      <Navigation />
      <Navigation1 />
      <ScriptonyAssistant />
      <PrimitiveDiv />
      <PrimitiveDiv2 />
    </div>
  );
}