// Njofton serverin pas një veprimi. Nuk e ndalon kurrë faqen nëse dështon.
export function notify(event: string, id: string, kind?: "business" | "professional") {
  try {
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, id, kind }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* asgjë */ }
}
