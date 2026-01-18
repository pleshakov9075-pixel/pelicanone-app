export function getVkLaunchParams(): string {
  return window.location.search.replace("?", "");
}
