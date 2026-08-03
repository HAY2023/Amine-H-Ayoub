export function getDeviceId(): string {
  let id = localStorage.getItem("mushaf:deviceId");
  if (!id) {
    // Generate a simple UUID-like string
    id = "dev_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem("mushaf:deviceId", id);
  }
  return id;
}
