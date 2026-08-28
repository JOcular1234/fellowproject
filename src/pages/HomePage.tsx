import { useEffect, useState, useRef } from 'react';
import {
  Search as SearchIcon, ArrowRight, Users, Rocket,
  Code2, Lightbulb, Users2, Trophy, Target,
} from 'lucide-react';
import { useRouter } from '@/lib/router';
import { fetchPublishedRound, fetchLevelGroupCounts, fetchPublishedRoundMilestones, type LevelGroupCount } from '@/lib/queries';
import { LEVEL_ORDER, LEVEL_LABELS, type FellowLevel, type Milestone } from '@/lib/types';
import { MilestoneCountdown } from '@/components/MilestoneCountdown';
import { LiveNowBanner } from '@/components/LiveNowBanner';
import { RecentPresentations } from '@/components/RecentPresentations';
import { HomeShowcase } from '@/components/HomeShowcase';
import heroImage from '@/public/fellowsworkingonproject.jpeg';

const BENEFITS = [
  {
    icon: Code2,
    title: 'Apply What You Learn',
    description: 'Turn Python lessons into real, working applications. Building projects bridges the gap between theory and practice.',
  },
  {
    icon: Users2,
    title: 'Collaborate with Peers',
    description: 'Work in teams, share ideas, and learn from fellow Python learners at your level. Group projects teach you real-world collaboration.',
  },
  {
    icon: Lightbulb,
    title: 'Solve Real Problems',
    description: 'Design solutions from scratch — define the problem, plan the architecture, and build something that actually works.',
  },
  {
    icon: Trophy,
    title: 'Build a Portfolio',
    description: 'Every project you ship becomes a showcase of your skills. Stand out with tangible proof of what you can build.',
  },
];

const STEPS = [
  {
    icon: Target,
    title: 'Find Your Group',
    description: 'Search your name or browse by level to see your assigned project team.',
  },
  {
    icon: Users,
    title: 'Meet Your Team',
    description: 'View your group members, connect with your team leader, and start collaborating.',
  },
  {
    icon: Rocket,
    title: 'Build Together',
    description: 'Plan your project, divide the work, and build something you can be proud of.',
  },
];

export function HomePage() {
  const { navigate } = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [counts, setCounts] = useState<LevelGroupCount[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const round = await fetchPublishedRound();
        if (round) {
          const [c, m] = await Promise.all([
            fetchLevelGroupCounts(round.id),
            fetchPublishedRoundMilestones(),
          ]);
          if (!cancelled) {
            setCounts(c);
            setMilestones(m);
          }
        }
      } catch {
        // ignore — counts are non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = searchQuery.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  };

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim()) {
      debounceRef.current = setTimeout(() => {
        navigate(`/search?q=${encodeURIComponent(val.trim())}`);
      }, 400);
    }
  };

  const getCount = (level: FellowLevel) =>
    counts.find((c) => c.level === level)?.count ?? 0;

  return (
    <div>
      {/* Hero */}
      <section className="relative border-b border-slate-200">
        <img
          src={heroImage}
          alt="Fellows working on a project"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-900/70" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              Python Fellows Project Hub
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-base text-slate-200 sm:text-lg">
              Find your project group, teammates, and project information. Learn by building — because reading code is good, writing it is better.
            </p>
          </div>

          <form onSubmit={handleSearch} className="mx-auto mt-8 max-w-xl">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchInput}
                placeholder="Search your name to find your group"
                className="w-full rounded-lg border border-white/20 bg-white/95 py-3.5 pl-12 pr-28 text-base text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                autoComplete="off"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Live Presentation Banner */}
      <LiveNowBanner />

      {/* Milestones / Deadlines */}
      {milestones.length > 0 && (
        <section className="mx-auto max-w-4xl px-4 pt-10 sm:px-6 sm:pt-12">
          <MilestoneCountdown milestones={milestones} />
        </section>
      )}

      {/* Recent Presentations */}
      <RecentPresentations />

      {/* Project Showcase */}
      <HomeShowcase />

 {/* Browse by Level */}
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
        {!loading && counts.every((c) => c.count === 0) ? (
          <div className="card p-8 text-center">
            <Users className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm text-slate-600">
              No project groups have been published yet. Please check back soon.
            </p>
          </div>
        ) : (
        <>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Browse by Python Level
          </h2>
          <button
            onClick={() => navigate('/groups')}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LEVEL_ORDER.map((level) => {
            const count = getCount(level);
            return (
              <button
                key={level}
                onClick={() => navigate(`/groups/${level}`)}
                className="group flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
                    <Users className="h-5 w-5 text-brand-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {LEVEL_LABELS[level]}
                    </p>
                    <p className="text-xs text-slate-500">
                      {loading
                        ? 'Loading...'
                        : `${count} Project Group${count !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-brand-600" />
              </button>
            );
          })}
        </div>
        </>
        )}
      </section>

      {/* Why Build Projects */}
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-slate-900">
            Why Build Projects?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
            Projects are where Python goes from something you learn to something you do.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {BENEFITS.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div
                key={benefit.title}
                className="card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
                  <Icon className="h-5 w-5 text-brand-600" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">
                  {benefit.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white border-y border-slate-200">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">
              How It Works
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
              Three simple steps to go from lessons to your first project.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="relative text-center">
                  <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white">
                    <Icon className="h-6 w-6" />
                    <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-brand-600 shadow-sm ring-1 ring-slate-200">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-slate-900">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

     
    </div>
  );
}
