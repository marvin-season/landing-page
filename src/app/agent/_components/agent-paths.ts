export function isWorldsPath(pathname: string) {
  return pathname === "/agent/worlds" || pathname.startsWith("/agent/worlds/");
}
