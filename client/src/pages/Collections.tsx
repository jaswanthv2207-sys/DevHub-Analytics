import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFavorites } from '@/lib/hooks';
import type { DevProfile, DevSummary, RepoSummary } from '@/lib/types';
import { PageHeader } from '@/components/layout/AppShell';
import { DevCard } from '@/components/github/DevCard';
import { RepoCard } from '@/components/github/RepoCard';
import { EmptyState } from '@/components/ui/States';
import { GridSkeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Chip';

type CollectionTab = 'developers' | 'repositories';

export function Collections() {
  const { favorites, isLoading } = useFavorites();
  const [tab, setTab] = useState<CollectionTab>('developers');

  const developers = favorites.filter((entry) => entry.kind === 'developer');
  const repositories = favorites.filter((entry) => entry.kind === 'repository');
  const visible = tab === 'developers' ? developers : repositories;

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        eyebrow="collections"
        title={
          <>
            Your <span className="text-gradient">saved orbit</span>.
          </>
        }
        description="Developers and repositories you starred, persisted to your DevHub account and instantly available on every device."
        align="between"
        actions={
          <div className="flex items-center gap-2">
            <Badge tone="cyan">{developers.length} devs</Badge>
            <Badge tone="pink">{repositories.length} repos</Badge>
            <Link to="/explore" className="btn btn-primary">
              + Add more
            </Link>
          </div>
        }
      />

      <Tabs
        items={[
          { value: 'developers', label: 'Developers', icon: '◍', badge: developers.length },
          { value: 'repositories', label: 'Repositories', icon: '⛁', badge: repositories.length },
        ]}
        value={tab}
        onChange={setTab}
      />

      {isLoading ? (
        <GridSkeleton count={6} />
      ) : favorites.length === 0 ? (
        <EmptyState
          icon="★"
          title="Your collection is empty"
          description="Head to Explore, open a profile or repository and hit the star — everything you save lands here."
          action={
            <div className="flex gap-2">
              <Link to="/explore?type=devs" className="btn btn-ghost">
                Find developers
              </Link>
              <Link to="/explore?type=repos" className="btn btn-primary">
                Find repositories
              </Link>
            </div>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={tab === 'developers' ? '◍' : '⛁'}
          title={tab === 'developers' ? 'No developers saved yet' : 'No repositories saved yet'}
          description={
            tab === 'developers'
              ? 'Star a developer profile to pin it here.'
              : 'Star a repository card to pin it here.'
          }
          action={
            <Link
              to={`/explore?type=${tab === 'developers' ? 'devs' : 'repos'}`}
              className="btn btn-ghost"
            >
              Browse {tab === 'developers' ? 'developers' : 'repositories'}
            </Link>
          }
        />
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tab === 'developers'
            ? developers.map((entry) => (
                <DevCard key={entry.ref} dev={entry.snapshot as DevProfile | DevSummary} />
              ))
            : repositories.map((entry) => (
                <RepoCard key={entry.ref} repo={entry.snapshot as RepoSummary} />
              ))}
        </div>
      )}

      {favorites.length > 0 ? (
        <p className="text-center text-xs text-ink-600">
          Collections are stored server-side in SQLite — remove any entry with its star button.
        </p>
      ) : null}
    </div>
  );
}
