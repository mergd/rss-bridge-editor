"use server";
import { parseString } from "xml2js";
export async function fetchFeedServer(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "Cache-Control": "no-cache",
      },
    });
    const xmlText = await response.text();
    return xmlText;
  } catch (error) {
    console.error("Server fetch error:", error);
    throw error;
  }
}

export async function fetchChannelInfo(channelId: string) {
  try {
    const response = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
    );
    const xmlText = await response.text();

    return new Promise((resolve, reject) => {
      parseString(xmlText, (err, result) => {
        if (err) reject(err);

        const channelInfo = {
          title: result?.feed?.title?.[0] || "Unknown Channel",
          link: result?.feed?.author?.[0]?.uri?.[0] || "",
          thumbnail: `https://www.youtube.com/channel/${channelId}`,
        };
        resolve(channelInfo);
      });
    });
  } catch (error) {
    console.error("Error fetching channel info:", error);
    return null;
  }
}
