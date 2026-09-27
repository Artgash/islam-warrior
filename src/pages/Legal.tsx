import { Link } from 'react-router-dom';
import { PageShell } from '@/components/common/Layout';
import { StarDivider } from '@/components/common/StarDivider';
import { Button } from '@/components/ui/button';

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="panel space-y-3 p-5 text-sm leading-relaxed text-muted [&_h2]:font-display [&_h2]:text-base [&_h2]:text-bone [&_strong]:text-bone">
      {children}
    </div>
  );
}

export function TermsPage() {
  return (
    <PageShell title="Terms of service" subtitle="Last updated 24 September 2026">
      <Prose>
        <h2>What this is</h2>
        <p>
          ISLAM WARRIOR is a habit tracker presented as a role-playing game. It is a tool for
          building discipline. It is <strong>not</strong> religious instruction, a source of
          fatwa, or a substitute for scholarship, community or medical care.
        </p>

        <h2>Your account</h2>
        <p>
          You are responsible for what happens under your account and for the accuracy of what you
          log. The game only works if you are honest with it — nobody is checking but you.
        </p>

        <h2>Conduct</h2>
        <p>
          Guild chat and player names are public to other players. Harassment, impersonation and
          content that mocks any faith will get an account removed.
        </p>

        <h2>Purchases</h2>
        <p>
          The season pass and shop sell <strong>cosmetics only</strong>. Nothing purchasable with
          money affects damage, XP, coins or progression. Where local law grants refund rights,
          those rights apply.
        </p>

        <h2>Availability</h2>
        <p>
          The service is provided as-is. Seasons, balance numbers and zone content may change.
          Progress along the road is preserved across seasons.
        </p>
      </Prose>

      <StarDivider className="my-5" />
      <Link to="/">
        <Button variant="secondary" size="block">
          Back to the fight
        </Button>
      </Link>
    </PageShell>
  );
}

export function PrivacyPage() {
  return (
    <PageShell title="Privacy policy" subtitle="Last updated 24 September 2026">
      <Prose>
        <h2>What is stored</h2>
        <p>
          Your email address, your character, your habits and their completion history, your
          inventory, and your guild membership. Habit history is the whole product — it is what
          the game is made of.
        </p>

        <h2>Where it is stored</h2>
        <p>
          In local mode, everything stays in your browser and never leaves the device. With a
          configured backend, data is stored in Supabase (Postgres) under row-level security, so
          your rows are readable only by you, except where you have deliberately made them public:
          your name, avatar, rank and leaderboard scores.
        </p>

        <h2>What is public</h2>
        <p>
          Your display name, avatar, rank, level, weekly XP, monsters slain and furthest zone
          appear on leaderboards. Your individual habits are <strong>never</strong> shown to other
          players.
        </p>

        <h2>What is never collected</h2>
        <p>
          No advertising identifiers, no third-party trackers, no selling of data to anyone, ever.
        </p>

        <h2>Deleting your data</h2>
        <p>
          Settings → Delete account removes every row you own. It is immediate and cannot be
          undone.
        </p>
      </Prose>

      <StarDivider className="my-5" />
      <Link to="/">
        <Button variant="secondary" size="block">
          Back to the fight
        </Button>
      </Link>
    </PageShell>
  );
}

export function NotFoundPage() {
  return (
    <PageShell>
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="font-display text-6xl text-gold">404</p>
        <h1 className="font-display text-xl text-bone">This path is not on the road</h1>
        <p className="max-w-sm text-sm text-muted">
          Sixty-six zones, and none of them are here.
        </p>
        <Link to="/">
          <Button>Return to the battle</Button>
        </Link>
      </div>
    </PageShell>
  );
}
