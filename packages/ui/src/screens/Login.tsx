import Hero from "@/components/hero";
import { useState } from "react";
import { toast } from "sonner";

export function Login({
  onConnect,
  isConnecting = false,
  isMidnightPreviewInstalled = true,
  error = null,
  contractContext,
  walletContext,
  isDeploying,
  setIsDeploying,
}: {
  onConnect: () => void;
  isConnecting?: boolean;
  isMidnightPreviewInstalled?: boolean;
  error?: string | null;
  contractContext: any;
  walletContext: any;
  isDeploying: boolean;
  setIsDeploying: (deploying: boolean) => void;
}) {
  const [deployError, setDeployError] = useState<string | null>(null);

  const handleDeploy = async () => {
    setDeployError(null);

    // Step 1: Connect wallet if not connected
    if (!walletContext.isConnected) {
      try {
        setIsDeploying(true);
        await onConnect();
        // Wait a moment for wallet to connect
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (err: any) {
        console.error("Wallet connection failed:", err);
        setDeployError(err.message || "Failed to connect wallet");
        setIsDeploying(false);
        return;
      }
    } else {
      setIsDeploying(true);
    }

    // Step 2: Deploy contract
    try {
      console.log("🚀 Starting contract deployment...");
      await contractContext.deployContract();
      console.log("✅ Contract deployed successfully!");
      setIsDeploying(false);
    } catch (err: any) {
      console.error("Deployment failed:", err);
      setDeployError(err.message || "Deployment failed");
      setIsDeploying(false);
    }
  };

  const connectToWallet = async () => {
    if (!isMidnightPreviewInstalled) {
      toast.warning("Please install Lace Midnight Preview first");
      return;
    }
    handleDeploy();
  };

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

          <div className="text-xl font-[orbitron] font-bold text-end  absolute bottom-6 right-6 z-20">
            <button
              onClick={connectToWallet}
              disabled={isConnecting}
              className=" bg-[#0000ff] text-white w-[280px] font-semibold py-4 px-6 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
            >
              {!isMidnightPreviewInstalled ? (
                <a
                  href="https://docs.midnight.network/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full font-semibold py-4 px-6 rounded-xl text-center transition-all"
                >
                  Install Lace
                </a>
              ) : (
                <>
                  {isConnecting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⏳</span>
                      Connecting ...
                    </span>
                  ) : (
                    "Connect Lace"
                  )}
                </>
              )}
            </button>
          </div>

          <div className="relative w-full overflow-hidden p-12">
            <div className="relative z-10 flex flex-col items-center justify-center h-full gap-8">
              <h1 className="text-center uppercase text-7xl font-extrabold tracking-[-2px] group">
                Your <span className="text-[#0000ff]">DATA</span> <br /> belongs to you
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
}
