import { Link } from 'react-router-dom';

export function PilotBrand({
  compact = false,
  inverse = false,
}: {
  compact?: boolean;
  inverse?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 ${inverse ? 'text-white' : 'text-black'}`}>
      <Link
        to="/pilot-login"
        aria-label="Ndani Kit farmer access"
        className={`grid place-items-center border-2 font-[orbitron] font-black ${
          compact ? 'h-10 w-10 text-sm' : 'h-12 w-12 text-base'
        } ${inverse ? 'border-white bg-[#0000ff]' : 'border-black bg-[#0000ff] text-white'}`}
      >
        EC
      </Link>
      <div>
        <p className={`font-[orbitron] font-black uppercase tracking-[0.12em] ${
          compact ? 'text-sm' : 'text-base'
        }`}>
          Ndani Kit
        </p>
        <p className={`font-bold uppercase tracking-[0.16em] ${
          compact ? 'text-[10px]' : 'text-xs'
        } ${inverse ? 'text-white/65' : 'text-[#0000ff]'}`}>
          by EdgeChain
        </p>
      </div>
    </div>
  );
}
