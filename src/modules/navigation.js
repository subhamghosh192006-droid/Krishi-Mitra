/**
 * Krishi Mitra — Step Navigation & Flow Validation Controller
 * Enforces strict workflow prerequisites to prevent invalid-step navigation
 * and crashes from uninitialized dependencies.
 */

export const STEP_METADATA = {
  1: { id: 1, label: 'Sign In', title: 'Sign in to begin', sub: 'Authentication' },
  2: { id: 2, label: 'Location', title: 'Confirm your field', sub: 'We start from the village. Everything after this is measured from your plot.' },
  3: { id: 3, label: 'Trace', title: 'Trace the exact plot', sub: 'Tap the corners of your field. We measure area and coordinates as you go.' },
  4: { id: 4, label: 'Scan', title: 'Scan the plot, then plan', sub: 'Weather, soil and satellite signals for this exact point — then tell us how you farm.' },
  5: { id: 5, label: 'Water', title: 'Water today, or wait?', sub: 'One clear answer, with the soil moisture, rain and crop demand behind it.' },
  6: { id: 6, label: 'Crops', title: 'What fits this field best', sub: 'Crops ranked for this soil and season, with profit per acre and the reasoning.' },
  7: { id: 7, label: 'Market', title: 'Mandi arbitrage & market intelligence', sub: 'Real-time price discovery, transport deductions, MSP spreads, and storage timing.' }
};

/**
 * Validates whether the user can navigate to the requested target step.
 * Prevents invalid step jumps when prerequisites are unmet.
 */
export function canNavigateToStep(targetStep, state) {
  const stepNum = Number(targetStep);

  // Bounds check
  if (!Number.isInteger(stepNum) || stepNum < 1 || stepNum > 7) {
    return { allowed: false, reason: 'Invalid step number.', suggestedStep: state.step || 2 };
  }

  // Step 1: Login is always allowed
  if (stepNum === 1) {
    return { allowed: true };
  }

  // Step 2+: Requires authenticated session or guest access
  if (!state.user && !state.guest) {
    return { allowed: false, reason: 'Please sign in or continue as guest first.', suggestedStep: 1 };
  }

  if (stepNum === 2) {
    return { allowed: true };
  }

  // Step 3: Requires confirmed location
  if (!state.location || typeof state.location.lat !== 'number' || typeof state.location.lon !== 'number') {
    return { allowed: false, reason: 'Please confirm your field location first.', suggestedStep: 2 };
  }

  if (stepNum === 3) {
    return { allowed: true };
  }

  // Step 4: Requires plot boundary (at least 3 vertices)
  const hasValidPlot = (state.plot && Array.isArray(state.plot.points) && state.plot.points.length >= 3) ||
                       (Array.isArray(state.draft) && state.draft.length >= 3);
  if (!hasValidPlot) {
    return { allowed: false, reason: 'Please mark or estimate at least 3 corners of your plot.', suggestedStep: 3 };
  }

  if (stepNum === 4) {
    return { allowed: true };
  }

  // Step 5: Requires completed farm setup (crop, acres > 0, sowDate)
  if (!state.setup || !state.setup.crop || !(state.setup.acres > 0) || !state.setup.sowDate) {
    return { allowed: false, reason: 'Please complete your farm setup details.', suggestedStep: 4 };
  }

  if (stepNum === 5) {
    return { allowed: true };
  }

  // Step 6: Requires weather and decision context
  if (!state.weather) {
    return { allowed: false, reason: 'Please wait for field data to finish loading.', suggestedStep: 4 };
  }

  return { allowed: true };
}

/**
 * Computes the maximum accessible step based on current application state.
 */
export function calculateMaxStep(state) {
  if (!state.user && !state.guest) return 1;
  if (!state.location || typeof state.location.lat !== 'number') return 2;
  const hasValidPlot = (state.plot && state.plot.points && state.plot.points.length >= 3) ||
                       (state.draft && state.draft.length >= 3);
  if (!hasValidPlot) return 3;
  if (!state.setup || !state.setup.crop || !(state.setup.acres > 0)) return 4;
  if (!state.weather) return 5;
  return 7;
}

