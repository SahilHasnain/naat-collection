import AsyncStorage from "@react-native-async-storage/async-storage";

export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.owaisrazaqadri";

const REVIEW_KEY = "@naat_review";

const MIN_DAYS_ACTIVE = 3;
const SNOOZE_DAYS = 7;
const MAX_SHOWNS = 3;
const MIN_INTERVAL_MS = 14 * 24 * 60 * 60 * 1000;

type ReviewDecision = "none" | "rated" | "never";

interface ReviewState {
  installDate: number;
  daysActive: number;
  lastActiveDate: string;
  eligibleDate: string | null;
  shownCount: number;
  lastShownAt: number | null;
  snoozedUntil: number | null;
  decided: ReviewDecision;
}

const DEFAULT_STATE: ReviewState = {
  installDate: 0,
  daysActive: 0,
  lastActiveDate: "",
  eligibleDate: null,
  shownCount: 0,
  lastShownAt: null,
  snoozedUntil: null,
  decided: "none",
};

const getDayKey = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};

class ReviewPromptService {
  private cache: ReviewState | null = null;

  private async load(): Promise<ReviewState> {
    if (this.cache) return this.cache;
    let state: ReviewState = { ...DEFAULT_STATE };
    try {
      const raw = await AsyncStorage.getItem(REVIEW_KEY);
      if (raw) {
        state = { ...DEFAULT_STATE, ...JSON.parse(raw) };
      }
    } catch {}
    this.cache = state;
    return state;
  }

  private async save(state: ReviewState): Promise<void> {
    this.cache = state;
    try {
      await AsyncStorage.setItem(REVIEW_KEY, JSON.stringify(state));
    } catch {}
  }

  /**
   * Called once per app open/foreground. Counts distinct active days.
   * When the user first reaches MIN_DAYS_ACTIVE, records the eligible date.
   */
  async recordAppOpen(): Promise<void> {
    const state = await this.load();
    const now = Date.now();
    const today = getDayKey(now);

    if (state.installDate === 0) {
      state.installDate = now;
    }

    if (state.lastActiveDate !== today) {
      state.daysActive += 1;
      state.lastActiveDate = today;
    }

    if (state.daysActive >= MIN_DAYS_ACTIVE && !state.eligibleDate) {
      state.eligibleDate = today;
    }

    await this.save(state);
  }

  /**
   * Whether the review prompt should be shown right now.
   * Requires the user to have returned on a day after becoming eligible.
   */
  async shouldShowReview(): Promise<boolean> {
    const state = await this.load();
    const now = Date.now();

    if (state.decided !== "none") return false;
    if (state.shownCount >= MAX_SHOWNS) return false;
    if (state.snoozedUntil && now < state.snoozedUntil) return false;
    if (state.lastShownAt && now - state.lastShownAt < MIN_INTERVAL_MS) return false;
    if (state.daysActive < MIN_DAYS_ACTIVE) return false;
    if (!state.eligibleDate) return false;
    if (state.eligibleDate === getDayKey(now)) return false;

    return true;
  }

  /** Mark that the prompt has been shown (called right before displaying). */
  async markShown(): Promise<void> {
    const state = await this.load();
    state.shownCount += 1;
    state.lastShownAt = Date.now();
    state.snoozedUntil = null;
    await this.save(state);
  }

  /** User chose "Maybe later": remind again after the snooze window. */
  async snooze(): Promise<void> {
    const state = await this.load();
    state.snoozedUntil = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
    await this.save(state);
  }

  /** User chose "No thanks": never ask again. */
  async dismissForever(): Promise<void> {
    const state = await this.load();
    state.decided = "never";
    await this.save(state);
  }

  /** User rated in the Play Store: never ask again. */
  async markRated(): Promise<void> {
    const state = await this.load();
    state.decided = "rated";
    await this.save(state);
  }

  /** Dev-only: make the user eligible immediately so the prompt can be tested. */
  async debugForceEligible(): Promise<void> {
    const state = await this.load();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    state.daysActive = Math.max(state.daysActive, MIN_DAYS_ACTIVE);
    state.eligibleDate = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;
    state.decided = "none";
    state.shownCount = 0;
    state.lastShownAt = null;
    state.snoozedUntil = null;
    state.installDate = state.installDate || Date.now();
    await this.save(state);
  }
}

export const reviewPromptService = new ReviewPromptService();
