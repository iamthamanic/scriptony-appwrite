import svgPaths from "./svg-njegu6kjg5";

function Heading2() {
  return (
    <div
      className="h-[24.002px] relative shrink-0 w-[119.51px]"
      data-name="Heading 2"
    >
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[24.002px] relative w-[119.51px]">
        <div className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[0] left-[0.01px] not-italic text-[16px] text-blue-500 top-[-0.19px] tracking-[-0.3125px] w-[131px]">
          <p className="leading-[24px]">@Charaktere (2)</p>
        </div>
      </div>
    </div>
  );
}

function Icon() {
  return (
    <div
      className="absolute left-[10px] size-[13.995px] top-[9px]"
      data-name="Icon"
    >
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 14 14"
      >
        <g id="Icon">
          <path
            d="M2.91559 6.99742H11.0793"
            id="Vector"
            stroke="var(--stroke-0, white)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.16624"
          />
          <path
            d="M6.99742 2.91559V11.0793"
            id="Vector_2"
            stroke="var(--stroke-0, white)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.16624"
          />
        </g>
      </svg>
    </div>
  );
}

function Button() {
  return (
    <div
      className="bg-[#6e59a5] h-[31.999px] relative rounded-[10px] shrink-0 w-[72.554px]"
      data-name="Button"
    >
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[31.999px] relative w-[72.554px]">
        <Icon />
        <div className="absolute font-['Inter:Medium',_sans-serif] font-medium leading-[0] left-[35.99px] not-italic text-[14px] text-nowrap text-white top-[6.99px] tracking-[-0.1504px]">
          <p className="leading-[20px] whitespace-pre">Neu</p>
        </div>
      </div>
    </div>
  );
}

function Container() {
  return (
    <div
      className="h-[31.999px] relative shrink-0 w-full"
      data-name="Container"
    >
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex h-[31.999px] items-center justify-between relative w-full">
          <Heading2 />
          <Button />
        </div>
      </div>
    </div>
  );
}

function Icon1() {
  return (
    <div className="relative shrink-0 size-[11.996px]" data-name="Icon">
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 12 12"
      >
        <g id="Icon">
          <path
            d={svgPaths.p7b3d00}
            id="Vector"
            stroke="var(--stroke-0, #646567)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="0.999632"
          />
          <path
            d={svgPaths.p3ca4a200}
            id="Vector_2"
            stroke="var(--stroke-0, #646567)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="0.999632"
          />
          <path
            d={svgPaths.p1e5d800}
            id="Vector_3"
            stroke="var(--stroke-0, #646567)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="0.999632"
          />
        </g>
      </svg>
    </div>
  );
}

function CharacterCard() {
  return (
    <div
      className="h-[15.994px] relative shrink-0 w-[58.465px]"
      data-name="CharacterCard"
    >
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[15.994px] relative w-[58.465px]">
        <div className="absolute font-['Inter:Medium',_sans-serif] font-medium leading-[0] left-0 not-italic text-[#646567] text-[12px] text-nowrap top-[0.66px]">
          <p className="leading-[16px] whitespace-pre">Speichern</p>
        </div>
      </div>
    </div>
  );
}

function Button1() {
  return (
    <div
      className="bg-[#e4e6ea] h-[27.99px] relative rounded-[10px] shrink-0 w-[100.45px]"
      data-name="Button"
    >
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[9.996px] h-[27.99px] items-center justify-center relative w-[100.45px]">
        <Icon1 />
        <CharacterCard />
      </div>
    </div>
  );
}

function Icon2() {
  return (
    <div className="relative shrink-0 size-[15.994px]" data-name="Icon">
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 16 16"
      >
        <g id="Icon">
          <path
            d={svgPaths.p26ec5d00}
            id="Vector"
            stroke="var(--stroke-0, #646567)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.33284"
          />
        </g>
      </svg>
    </div>
  );
}

function Button2() {
  return (
    <div
      className="bg-[#e4e6ea] h-[27.99px] relative rounded-[10px] shrink-0 w-[35.987px]"
      data-name="Button"
    >
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex h-[27.99px] items-center justify-center relative w-[35.987px]">
        <Icon2 />
      </div>
    </div>
  );
}

function CharacterCard1() {
  return (
    <div
      className="absolute content-stretch flex gap-[7.997px] h-[27.99px] items-center justify-end left-[15.99px] top-[15.99px] w-[328.501px]"
      data-name="CharacterCard"
    >
      <Button1 />
      <Button2 />
    </div>
  );
}

function Icon3() {
  return (
    <div className="relative shrink-0 size-[23.991px]" data-name="Icon">
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 24 24"
      >
        <g id="Icon">
          <path
            d={svgPaths.p1c853bf0}
            id="Vector"
            stroke="var(--stroke-0, #71717A)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.99926"
          />
          <path
            d={svgPaths.p986b80}
            id="Vector_2"
            stroke="var(--stroke-0, #71717A)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.99926"
          />
        </g>
      </svg>
    </div>
  );
}

function Button3() {
  return (
    <div
      className="absolute bg-[rgba(229,231,235,0.1)] box-border content-stretch flex items-center justify-center left-0 p-[1.989px] rounded-[2.22455e+07px] size-[63.997px] top-0"
      data-name="Button"
    >
      <div
        aria-hidden="true"
        className="absolute border-[1.989px] border-gray-200 border-solid inset-0 pointer-events-none rounded-[2.22455e+07px]"
      />
      <Icon3 />
    </div>
  );
}

function Input() {
  return (
    <div
      className="absolute bg-white h-[31.999px] left-0 rounded-[10px] top-0 w-[252.508px]"
      data-name="Input"
    >
      <div className="box-border content-stretch flex h-[31.999px] items-center overflow-clip pl-[17.038px] pr-[12px] py-[4px] relative w-[252.508px]">
        <div className="font-['Inter:Regular',_sans-serif] font-normal leading-[0] not-italic relative shrink-0 text-[16px] text-nowrap text-zinc-500 tracking-[-0.3125px]">
          <p className="leading-[normal] whitespace-pre">Captain Sarah Chen</p>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="absolute border-[1.989px] border-gray-200 border-solid inset-0 pointer-events-none rounded-[10px]"
      />
    </div>
  );
}

function Container1() {
  return (
    <div
      className="absolute h-[31.999px] left-[75.35px] top-[16.17px] w-[252.508px]"
      data-name="Container"
    >
      <Input />
    </div>
  );
}

function CharacterCard2() {
  return (
    <div
      className="absolute h-[63.997px] left-[15.99px] top-[61.98px] w-[328.501px]"
      data-name="CharacterCard"
    >
      <Button3 />
      <Container1 />
    </div>
  );
}

function PrimitiveLabel() {
  return (
    <div
      className="content-stretch flex gap-[8px] h-[15.994px] items-center relative shrink-0 w-full"
      data-name="Primitive.label"
    >
      <div className="font-['Inter:Bold',_sans-serif] font-bold leading-[0] not-italic relative shrink-0 text-[12px] text-nowrap text-zinc-500">
        <p className="leading-[16px] whitespace-pre">Rolle</p>
      </div>
    </div>
  );
}

function Input1() {
  return (
    <div
      className="bg-white h-[35.997px] relative rounded-[10px] shrink-0 w-full"
      data-name="Input"
    >
      <div className="flex flex-row items-center overflow-clip size-full">
        <div className="box-border content-stretch flex h-[35.997px] items-center px-[12px] py-[4px] relative w-full">
          <div className="font-['Inter:Regular',_sans-serif] font-normal leading-[0] not-italic relative shrink-0 text-[16px] text-nowrap text-zinc-500 tracking-[-0.3125px]">
            <p className="leading-[normal] whitespace-pre">Protagonist</p>
          </div>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="absolute border-[1.989px] border-gray-200 border-solid inset-0 pointer-events-none rounded-[10px]"
      />
    </div>
  );
}

function Container2() {
  return (
    <div
      className="absolute content-stretch flex flex-col gap-[5.998px] h-[57.989px] items-start left-0 top-0 w-[328.501px]"
      data-name="Container"
    >
      <PrimitiveLabel />
      <Input1 />
    </div>
  );
}

function PrimitiveLabel1() {
  return (
    <div
      className="content-stretch flex gap-[8px] h-[15.994px] items-center relative shrink-0 w-full"
      data-name="Primitive.label"
    >
      <div className="font-['Inter:Bold',_sans-serif] font-bold leading-[0] not-italic relative shrink-0 text-[12px] text-nowrap text-zinc-500">
        <p className="leading-[16px] whitespace-pre">Beschreibung</p>
      </div>
    </div>
  );
}

function Textarea() {
  return (
    <div
      className="bg-white h-[67.975px] relative rounded-[10px] shrink-0 w-full"
      data-name="Textarea"
    >
      <div className="overflow-clip size-full">
        <div className="box-border content-stretch flex h-[67.975px] items-start px-[12px] py-[8px] relative w-full">
          <div className="font-['Inter:Regular',_sans-serif] font-normal leading-[0] not-italic relative shrink-0 text-[16px] text-nowrap text-zinc-500 tracking-[-0.3125px]">
            <p className="leading-[24px] whitespace-pre">
              Kurze Zusammenfassung des Charakters...
            </p>
          </div>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="absolute border-[1.989px] border-gray-200 border-solid inset-0 pointer-events-none rounded-[10px]"
      />
    </div>
  );
}

function Container3() {
  return (
    <div
      className="absolute content-stretch flex flex-col gap-[5.998px] h-[89.967px] items-start left-0 top-[69.98px] w-[328.501px]"
      data-name="Container"
    >
      <PrimitiveLabel1 />
      <Textarea />
    </div>
  );
}

function PrimitiveLabel2() {
  return (
    <div
      className="content-stretch flex gap-[8px] h-[15.994px] items-center relative shrink-0 w-full"
      data-name="Primitive.label"
    >
      <div className="font-['Inter:Bold',_sans-serif] font-bold leading-[0] not-italic relative shrink-0 text-[12px] text-nowrap text-zinc-500">
        <p className="leading-[16px] whitespace-pre">Alter</p>
      </div>
    </div>
  );
}

function Input2() {
  return (
    <div
      className="bg-white h-[35.997px] relative rounded-[10px] shrink-0 w-full"
      data-name="Input"
    >
      <div className="flex flex-row items-center overflow-clip size-full">
        <div className="box-border content-stretch flex h-[35.997px] items-center px-[12px] py-[4px] relative w-full">
          <div className="font-['Inter:Regular',_sans-serif] font-normal leading-[0] not-italic relative shrink-0 text-[16px] text-nowrap text-zinc-500 tracking-[-0.3125px]">
            <p className="leading-[normal] whitespace-pre">35</p>
          </div>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="absolute border-[1.989px] border-gray-200 border-solid inset-0 pointer-events-none rounded-[10px]"
      />
    </div>
  );
}

function Container4() {
  return (
    <div
      className="absolute content-stretch flex flex-col gap-[5.998px] h-[57.989px] items-start left-0 top-0 w-[104.169px]"
      data-name="Container"
    >
      <PrimitiveLabel2 />
      <Input2 />
    </div>
  );
}

function PrimitiveLabel3() {
  return (
    <div
      className="content-stretch flex gap-[8px] h-[15.994px] items-center relative shrink-0 w-full"
      data-name="Primitive.label"
    >
      <div className="font-['Inter:Bold',_sans-serif] font-bold leading-[0] not-italic relative shrink-0 text-[12px] text-nowrap text-zinc-500">
        <p className="leading-[16px] whitespace-pre">Geschlecht</p>
      </div>
    </div>
  );
}

function Input3() {
  return (
    <div
      className="bg-white h-[35.997px] relative rounded-[10px] shrink-0 w-full"
      data-name="Input"
    >
      <div className="flex flex-row items-center overflow-clip size-full">
        <div className="box-border content-stretch flex h-[35.997px] items-center px-[12px] py-[4px] relative w-full">
          <div className="font-['Inter:Regular',_sans-serif] font-normal leading-[0] not-italic relative shrink-0 text-[16px] text-nowrap text-zinc-500 tracking-[-0.3125px]">
            <p className="leading-[normal] whitespace-pre">Female</p>
          </div>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="absolute border-[1.989px] border-gray-200 border-solid inset-0 pointer-events-none rounded-[10px]"
      />
    </div>
  );
}

function Container5() {
  return (
    <div
      className="absolute content-stretch flex flex-col gap-[5.998px] h-[57.989px] items-start left-[112.17px] top-0 w-[104.169px]"
      data-name="Container"
    >
      <PrimitiveLabel3 />
      <Input3 />
    </div>
  );
}

function PrimitiveLabel4() {
  return (
    <div
      className="content-stretch flex gap-[8px] h-[15.994px] items-center relative shrink-0 w-full"
      data-name="Primitive.label"
    >
      <div className="font-['Inter:Bold',_sans-serif] font-bold leading-[0] not-italic relative shrink-0 text-[12px] text-nowrap text-zinc-500">
        <p className="leading-[16px] whitespace-pre">Spezies</p>
      </div>
    </div>
  );
}

function Input4() {
  return (
    <div
      className="bg-white h-[35.997px] relative rounded-[10px] shrink-0 w-full"
      data-name="Input"
    >
      <div className="flex flex-row items-center overflow-clip size-full">
        <div className="box-border content-stretch flex h-[35.997px] items-center px-[12px] py-[4px] relative w-full">
          <div className="font-['Inter:Regular',_sans-serif] font-normal leading-[0] not-italic relative shrink-0 text-[16px] text-nowrap text-zinc-500 tracking-[-0.3125px]">
            <p className="leading-[normal] whitespace-pre">Human</p>
          </div>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="absolute border-[1.989px] border-gray-200 border-solid inset-0 pointer-events-none rounded-[10px]"
      />
    </div>
  );
}

function Container6() {
  return (
    <div
      className="absolute content-stretch flex flex-col gap-[5.998px] h-[57.989px] items-start left-[224.33px] top-0 w-[104.169px]"
      data-name="Container"
    >
      <PrimitiveLabel4 />
      <Input4 />
    </div>
  );
}

function Container7() {
  return (
    <div
      className="absolute h-[57.989px] left-0 top-[171.95px] w-[328.501px]"
      data-name="Container"
    >
      <Container4 />
      <Container5 />
      <Container6 />
    </div>
  );
}

function PrimitiveLabel5() {
  return (
    <div
      className="content-stretch flex gap-[8px] h-[15.994px] items-center relative shrink-0 w-full"
      data-name="Primitive.label"
    >
      <div className="font-['Inter:Bold',_sans-serif] font-bold leading-[0] not-italic relative shrink-0 text-[12px] text-nowrap text-zinc-500">
        <p className="leading-[16px] whitespace-pre">Background Story</p>
      </div>
    </div>
  );
}

function Textarea1() {
  return (
    <div
      className="bg-white h-[67.975px] relative rounded-[10px] shrink-0 w-full"
      data-name="Textarea"
    >
      <div className="overflow-clip size-full">
        <div className="box-border content-stretch flex h-[67.975px] items-start px-[12px] py-[8px] relative w-full">
          <div className="font-['Inter:Regular',_sans-serif] font-normal leading-[0] not-italic relative shrink-0 text-[16px] text-nowrap text-zinc-500 tracking-[-0.3125px]">
            <p className="leading-[24px] whitespace-pre">
              Die Hintergrundgeschichte des Charakters - Herkunft, wichtige
              Ereignisse, Motivation...
            </p>
          </div>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="absolute border-[1.989px] border-gray-200 border-solid inset-0 pointer-events-none rounded-[10px]"
      />
    </div>
  );
}

function Container8() {
  return (
    <div
      className="absolute content-stretch flex flex-col gap-[5.998px] h-[89.967px] items-start left-0 top-[241.93px] w-[328.501px]"
      data-name="Container"
    >
      <PrimitiveLabel5 />
      <Textarea1 />
    </div>
  );
}

function PrimitiveLabel6() {
  return (
    <div
      className="content-stretch flex gap-[8px] h-[15.994px] items-center relative shrink-0 w-full"
      data-name="Primitive.label"
    >
      <div className="font-['Inter:Bold',_sans-serif] font-bold leading-[0] not-italic relative shrink-0 text-[12px] text-nowrap text-zinc-500">
        <p className="leading-[16px] whitespace-pre">Skills</p>
      </div>
    </div>
  );
}

function Textarea2() {
  return (
    <div
      className="bg-white h-[63.997px] relative rounded-[10px] shrink-0 w-full"
      data-name="Textarea"
    >
      <div className="overflow-clip size-full">
        <div className="box-border content-stretch flex h-[63.997px] items-start px-[12px] py-[8px] relative w-full">
          <div className="font-['Inter:Regular',_sans-serif] font-normal leading-[0] not-italic relative shrink-0 text-[16px] text-nowrap text-zinc-500 tracking-[-0.3125px]">
            <p className="leading-[24px] whitespace-pre">
              Fähigkeiten kommagetrennt (z.B. Piloting, Schwertkampf, Hacking)
            </p>
          </div>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="absolute border-[1.989px] border-gray-200 border-solid inset-0 pointer-events-none rounded-[10px]"
      />
    </div>
  );
}

function Container9() {
  return (
    <div
      className="absolute content-stretch flex flex-col gap-[5.998px] h-[85.989px] items-start left-0 top-[343.89px] w-[328.501px]"
      data-name="Container"
    >
      <PrimitiveLabel6 />
      <Textarea2 />
    </div>
  );
}

function PrimitiveLabel7() {
  return (
    <div
      className="content-stretch flex gap-[8px] h-[15.994px] items-center relative shrink-0 w-full"
      data-name="Primitive.label"
    >
      <div className="font-['Inter:Bold',_sans-serif] font-bold leading-[0] not-italic relative shrink-0 text-[12px] text-nowrap text-zinc-500">
        <p className="leading-[16px] whitespace-pre">Stärken</p>
      </div>
    </div>
  );
}

function Textarea3() {
  return (
    <div
      className="bg-white h-[63.997px] relative rounded-[10px] shrink-0 w-full"
      data-name="Textarea"
    >
      <div className="overflow-clip size-full">
        <div className="box-border content-stretch flex h-[63.997px] items-start px-[12px] py-[8px] relative w-full">
          <div className="font-['Inter:Regular',_sans-serif] font-normal leading-[0] not-italic relative shrink-0 text-[16px] text-nowrap text-zinc-500 tracking-[-0.3125px]">
            <p className="leading-[24px] whitespace-pre">
              Was macht den Charakter stark? (z.B. Entscheidungsfreudig, Mutig,
              Intelligent)
            </p>
          </div>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="absolute border-[1.989px] border-gray-200 border-solid inset-0 pointer-events-none rounded-[10px]"
      />
    </div>
  );
}

function Container10() {
  return (
    <div
      className="absolute content-stretch flex flex-col gap-[5.998px] h-[85.989px] items-start left-0 top-[441.88px] w-[328.501px]"
      data-name="Container"
    >
      <PrimitiveLabel7 />
      <Textarea3 />
    </div>
  );
}

function PrimitiveLabel8() {
  return (
    <div
      className="content-stretch flex gap-[8px] h-[15.994px] items-center relative shrink-0 w-full"
      data-name="Primitive.label"
    >
      <div className="font-['Inter:Bold',_sans-serif] font-bold leading-[0] not-italic relative shrink-0 text-[12px] text-nowrap text-zinc-500">
        <p className="leading-[16px] whitespace-pre">Schwächen</p>
      </div>
    </div>
  );
}

function Textarea4() {
  return (
    <div
      className="bg-white h-[63.997px] relative rounded-[10px] shrink-0 w-full"
      data-name="Textarea"
    >
      <div className="overflow-clip size-full">
        <div className="box-border content-stretch flex h-[63.997px] items-start px-[12px] py-[8px] relative w-full">
          <div className="font-['Inter:Regular',_sans-serif] font-normal leading-[0] not-italic relative shrink-0 text-[16px] text-nowrap text-zinc-500 tracking-[-0.3125px]">
            <p className="leading-[24px] whitespace-pre">
              Schwachstellen und Verletzlichkeiten (z.B. Impulsiv,
              Vertrauensselig, Sturköpfig)
            </p>
          </div>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="absolute border-[1.989px] border-gray-200 border-solid inset-0 pointer-events-none rounded-[10px]"
      />
    </div>
  );
}

function Container11() {
  return (
    <div
      className="absolute content-stretch flex flex-col gap-[5.998px] h-[85.989px] items-start left-0 top-[539.86px] w-[328.501px]"
      data-name="Container"
    >
      <PrimitiveLabel8 />
      <Textarea4 />
    </div>
  );
}

function PrimitiveLabel9() {
  return (
    <div
      className="content-stretch flex gap-[8px] h-[15.994px] items-center relative shrink-0 w-full"
      data-name="Primitive.label"
    >
      <div className="font-['Inter:Bold',_sans-serif] font-bold leading-[0] not-italic relative shrink-0 text-[12px] text-nowrap text-zinc-500">
        <p className="leading-[16px] whitespace-pre">Charakter Traits</p>
      </div>
    </div>
  );
}

function Textarea5() {
  return (
    <div
      className="bg-white h-[63.997px] relative rounded-[10px] shrink-0 w-full"
      data-name="Textarea"
    >
      <div className="overflow-clip size-full">
        <div className="box-border content-stretch flex h-[63.997px] items-start px-[12px] py-[8px] relative w-full">
          <div className="font-['Inter:Regular',_sans-serif] font-normal leading-[0] not-italic relative shrink-0 text-[16px] text-nowrap text-zinc-500 tracking-[-0.3125px]">
            <p className="leading-[24px] whitespace-pre">
              Persönlichkeitsmerkmale (z.B. Mutig, Sarkastisch, Mitfühlend,
              Neugierig)
            </p>
          </div>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="absolute border-[1.989px] border-gray-200 border-solid inset-0 pointer-events-none rounded-[10px]"
      />
    </div>
  );
}

function Container12() {
  return (
    <div
      className="absolute content-stretch flex flex-col gap-[5.998px] h-[85.989px] items-start left-0 top-[637.85px] w-[328.501px]"
      data-name="Container"
    >
      <PrimitiveLabel9 />
      <Textarea5 />
    </div>
  );
}

function CharacterCard3() {
  return (
    <div
      className="absolute h-[723.837px] left-[15.99px] top-[143.97px] w-[328.501px]"
      data-name="CharacterCard"
    >
      <Container2 />
      <Container3 />
      <Container7 />
      <Container8 />
      <Container9 />
      <Container10 />
      <Container11 />
      <Container12 />
    </div>
  );
}

function Badge() {
  return (
    <div
      className="absolute bg-[rgba(110,89,165,0.1)] box-border content-stretch flex gap-[4px] h-[19.993px] items-center justify-center left-[15.99px] overflow-clip px-[8px] py-[2px] rounded-[10px] top-[873.8px] w-[140.995px]"
      data-name="Badge"
    >
      <div className="font-['Inter:Medium',_sans-serif] font-medium leading-[0] not-italic relative shrink-0 text-[#6e59a5] text-[12px] text-nowrap">
        <p className="leading-[16px] whitespace-pre">01.10.2025, 19:13 Uhr</p>
      </div>
    </div>
  );
}

function CardHeader() {
  return (
    <div
      className="basis-0 grow min-h-px min-w-px relative shrink-0 w-[360.489px]"
      data-name="CardHeader"
    >
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-full relative w-[360.489px]">
        <CharacterCard1 />
        <CharacterCard2 />
        <CharacterCard3 />
        <Badge />
      </div>
    </div>
  );
}

function Card() {
  return (
    <div
      className="bg-white h-[911.115px] relative rounded-[16px] shrink-0 w-full"
      data-name="Card"
    >
      <div className="overflow-clip size-full">
        <div className="box-border content-stretch flex flex-col h-[911.115px] items-start p-[0.663px] relative w-full">
          <CardHeader />
        </div>
      </div>
      <div
        aria-hidden="true"
        className="absolute border-[0.663px] border-gray-200 border-solid inset-0 pointer-events-none rounded-[16px]"
      />
    </div>
  );
}

function Container13() {
  return (
    <div
      className="content-stretch flex flex-col gap-[11.995px] h-[1014.37px] items-start relative shrink-0 w-full"
      data-name="Container"
    >
      <Card />
    </div>
  );
}

function Section() {
  return (
    <div
      className="absolute box-border content-stretch flex flex-col gap-[15.994px] h-[1062.36px] items-start left-0 px-[15.994px] py-0 top-[891.78px] w-[393.803px]"
      data-name="Section"
    >
      <Container />
      <Container13 />
    </div>
  );
}

function Container14() {
  return (
    <div
      className="absolute h-[199.999px] left-0 top-0 w-[393.803px]"
      data-name="Container"
    />
  );
}

export default function ProjectDetail() {
  return (
    <div className="bg-[#f5f6f8] relative size-full" data-name="ProjectDetail">
      <Section />
      <Container14 />
    </div>
  );
}
