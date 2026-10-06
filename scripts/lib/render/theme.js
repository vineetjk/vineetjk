// Two palettes; the README swaps between them with <picture> and prefers-color-scheme.
// Saffron is the accent: this market keeps Indian hours.

export const THEMES = {
  dark: {
    scheme: 'dark',
    panel: '#0f151d',
    panel2: '#17202b',
    border: '#253140',
    grid: '#1b2531',
    text: '#e6edf3',
    muted: '#8d99a6',
    faint: '#4f5b69',
    up: '#2bd47d',
    down: '#ff5d6c',
    accent: '#ff9933',
    onAccent: '#0f151d',
  },
  light: {
    scheme: 'light',
    panel: '#fbfcfd',
    panel2: '#f0f3f6',
    border: '#d5dce3',
    grid: '#e8ecf0',
    text: '#1f2328',
    muted: '#5b6670',
    faint: '#a3adb7',
    up: '#13a058',
    down: '#e2304a',
    accent: '#e47e0b',
    onAccent: '#ffffff',
  },
};

export const changeColor = (n, theme) => (n > 0 ? theme.up : n < 0 ? theme.down : theme.muted);
