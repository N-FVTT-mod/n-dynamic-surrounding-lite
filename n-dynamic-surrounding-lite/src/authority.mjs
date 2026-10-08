// Same single-active-GM policy as the full module; prevents duplicate chat messages.
export function isAuthorityGM() {
  if (!game.user?.isGM) return false;
  const gm = game.users.filter(user => user.active && user.isGM).sort((a, b) => a.id.localeCompare(b.id))[0];
  return gm?.id === game.user.id;
}
