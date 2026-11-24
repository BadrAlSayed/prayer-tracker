export function AppTitle({ className = '' }: { className?: string }) {
  return (
    <h1 className={`font-brand leading-none font-bold ${className}`}>
      <span className="block bg-gradient-to-br from-white via-emerald-200 to-emerald-400 bg-clip-text text-4xl leading-none text-transparent drop-shadow-[0_0_10px_rgba(16,185,129,0.2)]">
        قَضَاء
      </span>
      <span className="-mt-1.5 block text-[1.3rem] leading-none text-white">
        Qadaa
      </span>
    </h1>
  )
}
