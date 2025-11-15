import Hero from "@/components/hero";

const Home = () => {
  return (
    <>
      <div className="w-full h-full font-[orbitron] relative min-h-screen">
        <div className="min-h-screen w-full bg-[#f9fafb] relative justify-around flex flex-col overflow-hidden">
          {/* Diagonal Fade Center Grid Background */}
          <div
            className="absolute inset-0 z-0 skew-y-12 "
            style={{
              backgroundImage: `
        linear-gradient(to right, #d1d5db 1px, transparent 1px),
        linear-gradient(to bottom, #d1d5db 1px, transparent 1px)
      `,
              backgroundSize: "32px 32px",
              WebkitMaskImage:
                "radial-gradient(ellipse 60% 60% at 50% 50%, #000 30%, transparent 70%)",
              maskImage:
                "radial-gradient(ellipse 60% 60% at 50% 50%, #000 30%, transparent 70%)",
            }}
          />

          <Hero />

          <div className="relative w-full overflow-hidden p-12">
            <div className="relative z-10 flex flex-col items-center justify-center h-full gap-8">
              <h1 className="text-center uppercase text-7xl font-extrabold tracking-[-2px] group">
                Your{" "}
                <span className="text-[#0000ff] relative before:content-['#@&^'] group-hover:before:content-['data'] transition-all"></span>{" "}
                <br /> belongs to you
              </h1>
              <h6 className=" bg-white px-1">
                Take control of what's truly yours.
              </h6>
            </div>
          </div>

          <div className="w-[300px] h-[300px]"></div>
        </div>
      </div>
    </>
  );
};

export default Home;
