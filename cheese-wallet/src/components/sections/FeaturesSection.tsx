import { Zap, DollarSign, TrendingUp, Globe, type LucideIcon } from "lucide-react";

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Zap,
    title: 'Username payments',
    description: 'Send $500 to @alex — no account numbers, no routing codes, no friction.',
  },
  {
    icon: DollarSign,
    title: 'USD, always',
    description: 'Your Cheese balance is always in dollars. Stable, familiar, spendable.',
  },
  {
    icon: TrendingUp,
    title: 'Earn while you hold',
    description: 'Idle dollars earn competitive yield automatically. No lockups, no minimums.',
  },
  {
    icon: Globe,
    title: 'Global by default',
    description: 'Pay anyone with a Cheese username, anywhere in the world, instantly.',
  },
];

export function FeaturesSection() {
  return (
    <section className="px-6 py-16 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <p className="text-xl text-[#d4a843] uppercase tracking-widest mb-3 font-medium">Why Cheese?</p>
        <h2 className="font-display text-4xl font-bold text-white tracking-tight">Making money is hard. Spending it should be easy.</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="bg-[#111] border border-white/[0.06] rounded-xl p-6 opacity-0 animate-fade-up hover:border-[#d4a843]/20 transition-colors group"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="w-10 h-10 rounded-xl bg-[#d4a843]/10 flex items-center justify-center mb-4 group-hover:bg-[#d4a843]/15 transition-colors">
                <Icon size={18} className="text-[#d4a843]" />
              </div>
              <h3 className="text-white font-semibold mb-1.5 text-sm">{f.title}</h3>
              <p className="text-[#666] text-sm leading-relaxed">{f.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}