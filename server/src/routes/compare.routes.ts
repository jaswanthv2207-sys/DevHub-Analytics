import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/errors.js';
import { ok, parseQuery } from '../lib/http.js';
import { compareDevelopers, compareRepositories } from '../services/compare.js';

export const compareRouter = Router();

const namesSchema = z.object({
  a: z.string().trim().min(1, 'Pick a first option.'),
  b: z.string().trim().min(1, 'Pick a second option.'),
});

/** Bonus feature: repository vs repository scoring. */
compareRouter.get(
  '/repositories',
  asyncHandler(async (req, res) => {
    const { a, b } = parseQuery(namesSchema, req.query);
    const result = await compareRepositories(a, b);
    ok(res, result);
  }),
);

/** Bonus feature: developer vs developer scoring. */
compareRouter.get(
  '/developers',
  asyncHandler(async (req, res) => {
    const { a, b } = parseQuery(namesSchema, req.query);
    const result = await compareDevelopers(a, b);
    ok(res, result);
  }),
);
