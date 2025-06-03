export async function getFollows() {
  const response = await fetch('https://raw.githubusercontent.com/proc07/chrome-extension-rss/refs/heads/main/public/follow.json');
  const data = await response.json();
  return data
}