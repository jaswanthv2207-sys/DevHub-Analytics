/** Client-side mirror of the server's domain types (`server/src/types/domain.ts`). */

export type CollectionKind = 'developer' | 'repository';

export interface DevSummary {
  login: string;
  id: number;
  avatarUrl: string;
  htmlUrl: string;
  type: string;
  score?: number;
}

export interface DevProfile extends DevSummary {
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  bio: string | null;
  twitter: string | null;
  hireable: boolean | null;
  publicRepos: number;
  publicGists: number;
  followers: number;
  following: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface DevStats {
  reposAnalyzed: number;
  totalStars: number;
  totalForks: number;
  topLanguages: LanguageStat[];
  mostStarred: RepoSummary | null;
  accountAgeDays: number;
  followersPerDay: number;
  starsPerRepo: number;
}

export interface RepoOwner {
  login: string;
  avatarUrl: string;
  htmlUrl: string;
  type: string;
}

export interface RepoSummary {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  owner: RepoOwner;
  htmlUrl: string;
  homepage: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  license: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  pushedAt: string | null;
  archived: boolean;
  fork: boolean;
  private: boolean;
  size: number;
  score?: number;
}

export interface RepoDetails extends RepoSummary {
  defaultBranch: string;
  hasIssues: boolean;
  hasWiki: boolean;
  hasPages: boolean;
  subscribers: number | null;
  networkCount: number | null;
  openPullRequests: number | null;
  rawLanguage: string | null;
}

export interface Contributor {
  login: string;
  id: number;
  avatarUrl: string;
  htmlUrl: string;
  contributions: number;
  type: string;
}

export interface LanguageStat {
  name: string;
  bytes: number;
  percentage: number;
  color: string;
}

export interface ActivityPoint {
  date: string;
  value: number;
  additions?: number;
  deletions?: number;
}

export interface CommitActivity {
  total: number;
  weeks: ActivityPoint[];
  additions: number;
  deletions: number;
  codeFrequency: ActivityPoint[];
}

export interface RecentCommit {
  sha: string;
  message: string;
  author: string | null;
  authorDate: string | null;
  htmlUrl: string;
  verified: boolean;
}

export interface HeatmapDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface ContributionHeatmap {
  total: number;
  days: HeatmapDay[];
  source: 'graphql' | 'events';
}

export interface ActivityEvent {
  type: string;
  action: string;
  repo: string;
  createdAt: string;
  url: string;
}

export interface DeveloperActivity {
  heatmap: ContributionHeatmap | null;
  events: ActivityEvent[];
}

export interface RepoBundle {
  repository: RepoDetails;
  languages: LanguageStat[];
  contributors: Contributor[];
  activity: CommitActivity | null;
  recentCommits: RecentCommit[];
}

export interface DeveloperBundle {
  profile: DevProfile;
  stats: DevStats;
  repositories: RepoSummary[];
  languages: LanguageStat[];
  activity: DeveloperActivity | null;
}

export type CacheSource = 'network' | 'cache' | 'revalidated' | 'stale';

export interface RateLimit {
  limit: number | null;
  remaining: number | null;
  used: number | null;
  resetAt: string | null;
  resource: string | null;
  exhausted: boolean;
}

export interface RateLimitSummary {
  core: RateLimit;
  search: RateLimit;
  tokenConfigured: boolean;
  minRemainingBuffer: number;
}

export interface ResponseMeta {
  source: CacheSource;
  cachedAt: string | null;
  ageSeconds: number | null;
  rateLimit: RateLimit;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  displayName: string;
  createdAt: string;
}

export interface FavoriteRecord {
  id: number;
  kind: CollectionKind;
  ref: string;
  snapshot: DevProfile | RepoSummary;
  createdAt: string;
}

export interface DashboardData {
  counts: { developers: number; repositories: number; searches: number; views: number };
  favorites: FavoriteRecord[];
  recentViews: FavoriteRecord[];
  recentSearches: { id: number; kind: CollectionKind; query: string; createdAt: string }[];
  topLanguages: LanguageStat[];
  topDevelopers: { login: string; avatarUrl: string; followers: number | null }[];
}

/* ── Comparison (bonus features) ──────────────────────────────────────────── */

export interface CompareMetric {
  key: string;
  label: string;
  a: number;
  b: number;
  displayA: string;
  displayB: string;
  winner: 'a' | 'b' | 'tie';
}

export interface RadarAxis {
  key: string;
  label: string;
  a: number;
  b: number;
}

export interface DevCompareSide {
  profile: DevProfile;
  totalStars: number;
  totalForks: number;
  repoCount: number;
  followers: number;
  following: number;
  contributions: number;
  activeDays: number;
  accountAgeDays: number;
  primaryLanguage: string | null;
  topRepo: string | null;
  score: number;
}

export interface RepoCompareSide extends RepoBundle {
  score: number;
}

export interface Comparison<T> {
  a: T;
  b: T;
  metrics: CompareMetric[];
  radar: RadarAxis[];
  verdict: { winner: 'a' | 'b' | 'tie'; scoreA: number; scoreB: number; headline: string };
}
