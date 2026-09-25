import { PricingBreakdown, PricingRates } from '../types';

/**
 * Calculates rental charge based on tiered pricing rules:
 * - 1 to firstDurationMinutes: First base charge
 * - > firstDurationMinutes: First base charge + continuing interval rate for each additional continuingDurationMinutes block (or fraction thereof)
 */
export function calculateRentalBreakdown(
  startTime: number,
  endTime: number,
  rates: PricingRates
): PricingBreakdown {
  const elapsedMs = Math.max(0, endTime - startTime);
  // Rental duration in minutes (round up to nearest minute, minimum 1 min if active)
  const totalMinutes = Math.max(1, Math.ceil(elapsedMs / (1000 * 60)));

  const firstDurationMinutes = rates.firstDurationMinutes && rates.firstDurationMinutes > 0
    ? rates.firstDurationMinutes
    : 60;
  const continuingDurationMinutes = rates.continuingDurationMinutes && rates.continuingDurationMinutes > 0
    ? rates.continuingDurationMinutes
    : 30;

  const firstHourAmount = rates.firstHour || 0;
  const ratePerBlock = rates.every30Min ?? rates.next30Min ?? 0;
  
  let every30MinCount = 0;
  let every30MinAmount = 0;

  if (totalMinutes > firstDurationMinutes) {
    const additionalMinutes = totalMinutes - firstDurationMinutes;
    // Each continuing interval block or fraction thereof
    every30MinCount = Math.ceil(additionalMinutes / continuingDurationMinutes);
    every30MinAmount = every30MinCount * ratePerBlock;
  }

  const subtotal = firstHourAmount + every30MinAmount;
  const totalAmount = subtotal;

  return {
    totalMinutes,
    durationFormatted: formatMinutesHuman(totalMinutes),
    firstHourAmount,
    firstHourMinutes: Math.min(firstDurationMinutes, totalMinutes),
    firstDurationMinutes,
    every30MinCount,
    continuingBlocksCount: every30MinCount,
    every30MinRate: ratePerBlock,
    continuingBlockRate: ratePerBlock,
    every30MinAmount,
    continuingBlockAmount: every30MinAmount,
    continuingDurationMinutes,
    subtotal,
    totalAmount,
    // Backward compatibility fallbacks
    next30MinAmount: every30MinAmount,
    continuingHoursCount: Math.ceil(every30MinCount / 2),
    continuingHoursAmount: every30MinAmount,
  };
}

export function formatMinutesHuman(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours === 0) {
    return `${mins} min${mins === 1 ? '' : 's'}`;
  }
  if (mins === 0) {
    return `${hours} hr${hours === 1 ? '' : 's'}`;
  }
  return `${hours} hr${hours === 1 ? '' : 's'} ${mins} min${mins === 1 ? '' : 's'}`;
}

export function formatDurationTimer(elapsedMs: number): string {
  const totalSecs = Math.max(0, Math.floor(elapsedMs / 1000));
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

export function formatCurrency(amount: number, symbol: string = '$', position: 'prefix' | 'suffix' = 'prefix'): string {
  const formatted = Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return position === 'prefix' ? `${symbol}${formatted}` : `${formatted} ${symbol}`;
}

export const SRI_LANKA_TIMEZONE = 'Asia/Colombo';

export function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('en-GB', {
    timeZone: SRI_LANKA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-GB', {
    timeZone: SRI_LANKA_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(timestamp: number): string {
  return `${formatDate(timestamp)} at ${formatTime(timestamp)}`;
}

// Audio Feedback utility using Web Audio API
export function playSoundEffect(type: 'start' | 'stop' | 'click' | 'alert') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'start') {
      // Ascending two-tone chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'stop') {
      // Completed bell chime
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.35);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.35);
      });
    } else if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch (e) {
    // Ignore audio error if user hasn't interacted yet
  }
}

/**
 * Formats an integer rental number into the standard 7-digit zero-padded format:
 * e.g. 1 -> 'REN-0000001', 2 -> 'REN-0000002'
 */
export function formatRentalNumber(num: number, prefix: string = 'REN'): string {
  const cleanPrefix = (prefix || 'REN').trim();
  const safeNum = Math.max(1, Math.floor(num));
  return `${cleanPrefix}-${String(safeNum).padStart(7, '0')}`;
}

/**
 * Computes the next rental number monotonically in 7-digit zero-padded format (e.g. REN-0000001, REN-0000002).
 * Inspects all active and completed rentals to find the highest integer suffix.
 * Starts at 1 (REN-0000001) if no rentals exist.
 */
export function getNextRentalNumber(
  activeRentals: { rentalNumber?: string }[] = [],
  completedRentals: { rentalNumber?: string }[] = [],
  prefix: string = 'REN'
): string {
  const all = [...(activeRentals || []), ...(completedRentals || [])];
  let maxNum = 0;

  for (const r of all) {
    if (!r || !r.rentalNumber) continue;
    const rn = String(r.rentalNumber).trim();
    const matches = rn.match(/\d+/g);
    if (matches && matches.length > 0) {
      const lastDigits = matches[matches.length - 1];
      const n = parseInt(lastDigits, 10);
      if (!isNaN(n) && n < 10000000 && n > maxNum) {
        maxNum = n;
      }
    }
  }

  return formatRentalNumber(maxNum + 1, prefix);
}
