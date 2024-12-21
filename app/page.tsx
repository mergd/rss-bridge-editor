"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { fetchChannelInfo, fetchFeedServer } from "@/lib/fetchFeed";
import { Clipboard, Copy, Loader2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { parseString } from "xml2js";

interface FeedLink {
  $: {
    rel: string;
    href: string;
  };
}

interface FeedEntry {
  title: [{ _: string }];
  link: FeedLink[];
  published: string[];
  author: [{ name: string[] }];
}

interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  channelTitle: string;
}

export default function YouTubeFeedEditor() {
  const [feeds, setFeeds] = useState<string[]>(Array(10).fill(""));
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rssBridgeLink, setRssBridgeLink] = useState("");

  const { toast } = useToast();

  const handleFeedChange = (index: number, value: string) => {
    const newFeeds = [...feeds];
    newFeeds[index] = value;
    setFeeds(newFeeds);
  };

  const addFeed = () => {
    if (feeds.length < 10) {
      setFeeds([...feeds, ""]);
    }
  };

  const removeFeed = (index: number) => {
    const newFeeds = feeds.filter((_, i) => i !== index);
    setFeeds(newFeeds);
  };

  const fetchFeed = async () => {
    setIsLoading(true);
    try {
      const feedUrl = generateRssBridgeLink();
      const xmlText = await fetchFeedServer(feedUrl);

      parseString(xmlText, (err, result) => {
        if (err) {
          console.error("Error parsing XML:", err);
          toast({
            variant: "destructive",
            title: "Error parsing feed",
            description: "Please check your RSS Bridge link and try again.",
          });
          return;
        }

        if (!result.feed?.entry) {
          console.error("No entries found in feed");
          return;
        }

        const items = result.feed.entry.map((item: FeedEntry) => {
          const videoLink =
            item.link.find((link) => link.$.rel === "alternate")?.$.href || "";

          return {
            title: item.title?.[0]?._,
            link: videoLink,
            pubDate: new Date(item.published[0]).toLocaleString(),
            channelTitle: item.author?.[0]?.name?.[0],
          };
        });
        setFeedItems(items);
      });
    } catch (error) {
      console.error("Error fetching feed:", error);
      toast({
        variant: "destructive",
        title: "Error fetching feed",
        description: "Please check your YouTube channel IDs and try again.",
      });
    }
    setIsLoading(false);
  };

  const generateRssBridgeLink = () => {
    const baseUrl =
      "https://rss-bridge.org/bridge01/?action=display&bridge=FeedMergeBridge&feed_name=yt";
    const feedParams = feeds
      .filter((feed) => feed.trim() !== "")
      .map(
        (feed, index) =>
          `&feed_${index + 1}=${encodeURIComponent(
            `https://www.youtube.com/feeds/videos.xml?channel_id=${feed}`
          )}`
      )
      .join("");
    return `${baseUrl}${feedParams}&format=Atom`;
  };

  const copyRssBridgeLink = () => {
    const link = generateRssBridgeLink();
    navigator.clipboard.writeText(link);
    toast({
      title: "RSS Bridge link copied to clipboard!",
    });
  };

  const parseRssBridgeLink = (link: string) => {
    const url = new URL(link);
    const newFeeds = Array(10).fill("");
    for (let i = 1; i <= 10; i++) {
      const feedParam = url.searchParams.get(`feed_${i}`);
      if (feedParam) {
        const channelId = new URL(feedParam).searchParams.get("channel_id");
        if (channelId) {
          newFeeds[i - 1] = channelId;
        }
      }
    }
    setFeeds(newFeeds);
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  // Update your channel ID input component
  const ChannelIdInput = ({
    value,
    onChange,
    onRemove,
  }: {
    value: string;
    onChange: (value: string) => void;
    onRemove: () => void;
    index: number;
  }) => {
    const [channelInfo, setChannelInfo] = useState<{
      title: string;
      link: string;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
      const getChannelInfo = async () => {
        if (!value) {
          setChannelInfo(null);
          return;
        }
        setIsLoading(true);
        const info = await fetchChannelInfo(value);
        setChannelInfo(info as { title: string; link: string });
        setIsLoading(false);
      };

      getChannelInfo();
    }, [value]);

    return (
      <div className="flex items-center gap-2 group">
        <div className="flex-1">
          <Input
            placeholder="Channel ID"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="font-mono"
          />
          {channelInfo && (
            <div className="text-xs mt-1 flex items-center gap-2">
              <span className="text-muted-foreground">→</span>
              <a
                href={channelInfo.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline truncate"
              >
                {channelInfo.title}
              </a>
            </div>
          )}
          {isLoading && (
            <div className="text-xs mt-1 flex items-center gap-2">
              <span className="text-muted-foreground">Loading...</span>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>YouTube Feed Editor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Paste RSS Bridge link here"
                  value={rssBridgeLink}
                  onChange={(e) => setRssBridgeLink(e.target.value)}
                />
                <Button onClick={() => parseRssBridgeLink(rssBridgeLink)}>
                  <Clipboard className="mr-2 h-4 w-4" /> Parse Link
                </Button>
              </div>
              {feeds.map((feed, index) => (
                <ChannelIdInput
                  key={index}
                  value={feed}
                  onChange={(value) => handleFeedChange(index, value)}
                  onRemove={() => removeFeed(index)}
                  index={index}
                />
              ))}
              {feeds.length < 10 && (
                <Button onClick={addFeed} className="w-full">
                  <Plus className="mr-2 h-4 w-4" /> Add Feed
                </Button>
              )}
              <Button onClick={copyRssBridgeLink} className="w-full">
                <Copy className="mr-2 h-4 w-4" /> Copy RSS Bridge Link
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feed Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchFeed} disabled={isLoading} className="mb-4">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Refresh Feed"
              )}
            </Button>
            <ScrollArea className="h-[400px]">
              {feedItems.map((item, index) => (
                <div
                  key={index}
                  className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow"
                >
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {item.channelTitle}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {item.pubDate}
                  </p>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Watch Video
                  </a>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
