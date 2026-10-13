/** Account rules shared by auth, forms and tests (no server dependencies). */

export const USERNAME_PATTERN = /^[a-z0-9_.]+$/;
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const PASSWORD_MIN = 8;
