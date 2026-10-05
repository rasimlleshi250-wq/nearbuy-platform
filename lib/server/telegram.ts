// Dërgon mesazh te Telegram-i i adminit (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID në Vercel).
export const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function sendTelegram(html: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) { console.error("Telegram: mungojnë çelësat në Vercel"); return false; }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  if (!res.ok) console.error("Telegram:", res.status, await res.text());
  return res.ok;
}
