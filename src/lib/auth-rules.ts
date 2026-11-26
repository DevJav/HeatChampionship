/** Account rules shared by auth, forms and tests (no server dependencies). */

export const USERNAME_PATTERN = /^[a-z0-9_.]+$/;
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const PASSWORD_MIN = 8;
/** How long a "choose a new password" link works */
export const RESET_LINK_HOURS = 1;
/** Minimum wait between two reset emails for the same driver */
export const RESET_EMAIL_COOLDOWN_SECONDS = 60;
