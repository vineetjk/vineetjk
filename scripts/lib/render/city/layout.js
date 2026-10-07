// Where things sit in the Commit City frame. The metro parts are drawn in Commit Metro's own
// coordinates and shifted down by SHIFT, so its near rail lands on RAIL_Y here. Everything below
// the viaduct is a strip of street seen from the side, back to front: compound walls, the far
// footpath, the far carriageway (traffic heading right, since India drives on the left), the
// median under the pillars, the near carriageway (heading left), the near footpath and a verge.

import { RAIL, DECK } from '../metro.js';

export const W = 880;
export const H = 504;
export const RAIL_Y = 290;
export const SHIFT = RAIL_Y - RAIL;
export const ANCHOR = 480; // x in the frame where the week in focus sits, and the zoom pivot

export const Y = {
  deck: RAIL_Y + DECK, // underside of the viaduct
  ground: 268, // the city stands just behind the viaduct, so the train never hides it
  wall: 334, // top of the compound walls along the road
  backWalk: 352, // far footpath
  backFeet: 360,
  road: 362,
  lanes: { farOuter: 371, farInner: 382, nearInner: 398.5, nearOuter: 409.5 }, // wheel lines
  median: 384,
  medianBottom: 389,
  nearWalk: 411,
  nearFeet: 421,
  verge: 425,
  route: 446, // the route map band starts here
};

export const PARALLAX = { far: 0.3, mid: 0.75 };
export const ZOOM = { rest: 1, start: 1.18, pass: 1.08, fastest: 0.82 };
