import { Link } from 'react-router-dom';
import { cn, formatCompact, relativeTime } from '@/lib/format';
import type { RepoSummary } from '@/lib/types';
import { FavoriteButton } from './FavoriteButton';
import { Avatar } from '@/components/layout/Navbar';

interface RepoCardProps {
  repo: RepoSummary;
  className?: string;
  compact?: boolean;
}

export function RepoCard({ repo, className, compact }: RepoCardProps) {
  const [owner, name] = repo.fullName.includes('/')
    ? repo.fullName.split('/')
    : [repo.owner.login, repo.name];

  return (
    <article
      className={cn(
        'glass card card-hover lit group relative flex h-full flex-col gap-3 p-5',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar name={repo.owner.login} src={repo.owner.avatarUrl} size={36} />
        <div className="min-w-0 flex-1">
          <Link
            to={`/repo/${owner}/${name}`}
            className="block truncate font-display text-[15px] font-bold text-ink-100 transition group-hover:text-energy-cyan"
          >
            <span className="text-ink-500">{owner}/</span>
            {name}
          </Link>
          <p className="mono mt-0.5 text-[11px] text-ink-600">
            updated {relativeTime(repo.pushedAt ?? repo.updatedAt)}
          </p>
        </div>
        <FavoriteButton
          kind="repository"
          reference={repo.fullName}
          snapshot={repo}
          className="relative z-10"
        />
      </div>

      <p
        className={cn(
          'text-[13px] leading-relaxed text-ink-400',
          compact ? 'line-clamp-2' : 'line-clamp-3',
        )}
      >
        {repo.description ?? 'No description provided.'}
      </p>

      {repo.topics.length > 0 ? (
        <div
          className="flex flex-wrap gap-1.5 overflow-hidden"
          style={{ maxHeight: compact ? 44 : 66 }}
        >
          {repo.topics.slice(0, 4).map((topic) => (
            <span key={topic} className="chip mono truncate px-2 py-0.5 text-[10px]">
              {topic}
            </span>
          ))}
          {repo.topics.length > 4 ? (
            <span className="chip px-2 py-0.5 text-[10px] text-ink-500">
              +{repo.topics.length - 4}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/6 pt-3">
        <Metric icon="★" value={repo.stars} label="stars" tone="text-energy-amber" />
        <Metric icon="⑂" value={repo.forks} label="forks" tone="text-energy-cyan" />
        <Metric icon="◇" value={repo.openIssues} label="issues" tone="text-energy-indigo" />
        {repo.language ? (
          <span className="flex items-center gap-1.5 text-[12px] text-ink-400">
            <span className="h-2.5 w-2.5 rounded-full bg-energy-pink" />
            {repo.language}
          </span>
        ) : null}
        {repo.license ? (
          <span className="mono ml-auto text-[10px] text-ink-600">{repo.license}</span>
        ) : null}
        {repo.archived ? (
          <span className="chip border-energy-amber/40 bg-energy-amber/10 text-energy-amber">
            archived
          </span>
        ) : null}
      </div>
    </article>
  );
}

function Metric({
  icon,
  value,
  label,
  tone,
}: {
  icon: string;
  value: number;
  label: string;
  tone: string;
}) {
  return (
    <span className="flex items-center gap-1.5" title={`${formatCompact(value)} ${label}`}>
      <span aria-hidden className={tone}>
        {icon}
      </span>
      <span className="num text-[13px] font-semibold text-ink-200">{formatCompact(value)}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
