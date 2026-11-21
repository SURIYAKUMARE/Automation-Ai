export async function readMetaPermissions(accessToken: string, required: string[]) {
  const version = process.env.META_GRAPH_VERSION || 'v23.0';
  const response = await fetch('https://graph.facebook.com/' + version + '/me/permissions', {
    headers: { Authorization: 'Bearer ' + accessToken }, signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('Meta permissions could not be checked');
  const result = await response.json();
  const granted = (result.data as { permission: string; status: string }[])
    .filter((entry) => entry.status === 'granted').map((entry) => entry.permission);
  if (required.some((permission) => !granted.includes(permission))) throw new Error('Required Meta permissions were not granted');
  return granted;
}
