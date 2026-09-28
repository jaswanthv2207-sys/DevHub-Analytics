import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { asyncHandler, notFound } from '../lib/errors.js';
import { ok, parseBody, parseQuery, routeParam } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimitSummary } from '../services/cache.js';
import {
  addFavorite,
  buildDashboard,
  isFavorite,
  listFavorites,
  recordSearch,
  recordView,
  removeFavorite,
} from '../services/collections.service.js';
import {
  getDeveloper,
  getDeveloperActivity,
  getDeveloperBundle,
  getDeveloperRepos,
  searchDevelopers,
} from '../services/github/developers.js';
import { normaliseRepoSummary } from '../services/github/normalise.js';
import {
  getIssueBreakdown,
  getRepository,
  getRepositoryBundle,
  getRepositoryLanguages,
  trendingRepositories,
} from '../services/github/repositories.js';
import { searchRepositories } from '../services/github/search.js';
import type { DevProfile, RepoSummary } from '../types/domain.js';

export const collectionsRouter = Router();
export const dashboardRouter = Router();
export const githubRouter = Router();

/* ── Shared schemas ──────────────────────────────────────────────────────── */

const kindSchema = z.enum(['developer', 'repository']);

const snapshotSchema = z.record(z.string(), z.any()).optional().default({});

const favoriteSchema = z.object({
  kind: kindSchema,
  ref: z.string().trim().min(1, 'A reference is required.').max(140),
  snapshot: snapshotSchema,
});

const viewSchema = z.object({
  kind: kindSchema,
  ref: z.string().trim().min(1).max(140),
  snapshot: snapshotSchema,
});

const searchHistorySchema = z.object({
  kind: kindSchema,
  query: z.string().trim().min(1, 'Search text is required.').max(200),
});

const searchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Provide a search query.'),
  page: z.coerce.number().int().min(1).max(50).default(1),
  perPage: z.coerce.number().int().min(1).max(50).default(12),
  sort: z.string().trim().max(30).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

/* ── Collections (favourite developers & repositories) ───────────────────── */

collectionsRouter.get(
  '/favorites',
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, listFavorites(req.user!));
  }),
);

collectionsRouter.post(
  '/favorites',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = parseBody(favoriteSchema, req.body);
    const record = addFavorite(
      req.user!,
      input.kind,
      input.ref,
      input.snapshot as DevProfile | RepoSummary,
    );
    ok(res, { favorite: record }, undefined, 201);
  }),
);

collectionsRouter.delete(
  '/favorites',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = parseQuery(
      z.object({ kind: kindSchema, ref: z.string().trim().min(1) }),
      req.query,
    );
    const removed = removeFavorite(req.user!, input.kind, input.ref);
    if (!removed) throw notFound('That entry is not in your collection.');
    ok(res, { removed: true });
  }),
);

collectionsRouter.get(
  '/favorites/check',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = parseQuery(
      z.object({ kind: kindSchema, ref: z.string().trim().min(1) }),
      req.query,
    );
    ok(res, { favorite: isFavorite(req.user!, input.kind, input.ref) });
  }),
);

/* ── Dashboard ───────────────────────────────────────────────────────────── */

dashboardRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, buildDashboard(req.user!));
  }),
);

dashboardRouter.post(
  '/views',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = parseBody(viewSchema, req.body);
    recordView(req.user!, input.kind, input.ref, input.snapshot as DevProfile | RepoSummary);
    ok(res, { recorded: true });
  }),
);

dashboardRouter.post(
  '/searches',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = parseBody(searchHistorySchema, req.body);
    recordSearch(req.user!, input.kind, input.query);
    ok(res, { recorded: true });
  }),
);

/* ── GitHub search ───────────────────────────────────────────────────────── */

githubRouter.get(
  '/search/users',
  asyncHandler(async (req, res) => {
    const query = parseQuery(searchQuerySchema, req.query);
    const result = await searchDevelopers(query.q, {
      page: query.page,
      perPage: query.perPage,
      ...(query.sort ? { sort: query.sort } : {}),
    });
    ok(res, result.data, result.meta);
  }),
);

githubRouter.get(
  '/search/repositories',
  asyncHandler(async (req, res) => {
    const query = parseQuery(searchQuerySchema, req.query);
    const result = await searchRepositories(query.q, {
      page: query.page,
      perPage: query.perPage,
      ...(query.sort ? { sort: query.sort } : {}),
      ...(query.order ? { order: query.order } : {}),
    });
    ok(res, result.data, result.meta);
  }),
);

githubRouter.get(
  '/trending',
  asyncHandler(async (req, res) => {
    const query = parseQuery(
      z.object({ period: z.enum(['daily', 'weekly', 'monthly']).default('weekly') }),
      req.query,
    );
    const result = await trendingRepositories(query.period);
    ok(res, result.data, result.meta);
  }),
);

/* ── Developer endpoints ─────────────────────────────────────────────────── */

githubRouter.get(
  '/users/:username',
  asyncHandler(async (req, res) => {
    const bundle = await getDeveloperBundle(routeParam(req, 'username'));
    ok(res, bundle, bundle.meta);
  }),
);

githubRouter.get(
  '/users/:username/profile',
  asyncHandler(async (req, res) => {
    const result = await getDeveloper(routeParam(req, 'username'));
    ok(res, result.data, result.meta);
  }),
);

githubRouter.get(
  '/users/:username/repos',
  asyncHandler(async (req, res) => {
    const query = parseQuery(
      z.object({
        sort: z.enum(['pushed', 'updated', 'created', 'full_name']).default('pushed'),
      }),
      req.query,
    );
    const result = await getDeveloperRepos(routeParam(req, 'username'), { sort: query.sort });
    ok(res, { items: result.data.map(normaliseRepoSummary) }, result.meta);
  }),
);

githubRouter.get(
  '/users/:username/activity',
  asyncHandler(async (req, res) => {
    const activity = await getDeveloperActivity(routeParam(req, 'username'));
    ok(res, activity);
  }),
);

/* ── Repository endpoints ────────────────────────────────────────────────── */

githubRouter.get(
  '/repos/:owner/:repo',
  asyncHandler(async (req, res) => {
    const bundle = await getRepositoryBundle(routeParam(req, 'owner'), routeParam(req, 'repo'));
    ok(res, bundle);
  }),
);

/** Narrow payload for cards and comparisons (skips commits/contributors). */
githubRouter.get(
  '/repos/:owner/:repo/summary',
  asyncHandler(async (req, res) => {
    const owner = routeParam(req, 'owner');
    const repo = routeParam(req, 'repo');
    const details = await getRepository(owner, repo);
    const fullName = details.data.fullName || `${owner}/${repo}`;
    const [languages, breakdown] = await Promise.all([
      getRepositoryLanguages(owner, repo).catch(() => ({ data: [], meta: null })),
      getIssueBreakdown(fullName),
    ]);
    ok(res, {
      repository: {
        ...details.data,
        openIssues: breakdown.openIssues,
        openPullRequests: breakdown.openPullRequests,
      },
      languages: languages.data,
    });
  }),
);

/* ── Diagnostics ─────────────────────────────────────────────────────────── */

githubRouter.get(
  '/rate-limit',
  asyncHandler(async (_req, res) => {
    ok(res, {
      ...rateLimitSummary(),
      tokenConfigured: Boolean(config.github.token),
      minRemainingBuffer: config.github.minRemainingBuffer,
    });
  }),
);
