export interface AvatarPreset {
  id: string;
  label: string;
  gender: 'MALE' | 'FEMALE' | 'NONBINARY';
  url: string;
}

// Placeholder character portraits (placehold.co, same pattern used by
// MockGenerationProvider) - stand-ins for real curated character art, not
// meant to look finished. Public URLs, so no S3/presign is needed at all:
// Companion.avatarUrl just stores one of these directly.
export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'preset-a', label: '角色 A', gender: 'FEMALE', url: 'https://placehold.co/400x500/FF1680/0B070A.png?text=A' },
  { id: 'preset-b', label: '角色 B', gender: 'FEMALE', url: 'https://placehold.co/400x500/8B2FA9/0B070A.png?text=B' },
  { id: 'preset-c', label: '角色 C', gender: 'MALE', url: 'https://placehold.co/400x500/E90070/0B070A.png?text=C' },
  { id: 'preset-d', label: '角色 D', gender: 'MALE', url: 'https://placehold.co/400x500/1A0A19/FF1680.png?text=D' },
  { id: 'preset-e', label: '角色 E', gender: 'NONBINARY', url: 'https://placehold.co/400x500/8B2FA9/FF1680.png?text=E' },
  { id: 'preset-f', label: '角色 F', gender: 'NONBINARY', url: 'https://placehold.co/400x500/0B070A/8B2FA9.png?text=F' },
];

export function findAvatarPreset(url: string | null | undefined): AvatarPreset | undefined {
  return AVATAR_PRESETS.find((p) => p.url === url);
}
