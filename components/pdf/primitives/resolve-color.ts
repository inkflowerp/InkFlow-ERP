import type { ColorTokens } from"../themes/types";

export const THEME_COLOR_KEYS = ["foreground","background","muted","mutedForeground","primary","primaryForeground","border","accent","destructive","success","warning","info",
] as const satisfies (keyof ColorTokens)[];

export const resolveColor = (value: string, colors: ColorTokens): string => {
 const key = value as (typeof THEME_COLOR_KEYS)[number];
 return THEME_COLOR_KEYS.includes(key) ? colors[key] : value;
};
