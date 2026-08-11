"use client";

import {
  VideoPlayer,
  VideoPlayerContent,
  VideoPlayerControlBar,
  VideoPlayerMuteButton,
  VideoPlayerPlayButton,
  VideoPlayerTimeDisplay,
  VideoPlayerTimeRange,
} from "@/components/kibo-ui/video-player";

export const title = "Basic video player";

const Example = () => (
  <VideoPlayer className="aspect-video w-full max-w-2xl overflow-hidden rounded-xl border border-border">
    <VideoPlayerContent
      preload="metadata"
      slot="media"
      src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/video-1.mp4"
    />
    <VideoPlayerControlBar>
      <VideoPlayerPlayButton />
      <VideoPlayerTimeRange />
      <VideoPlayerTimeDisplay />
      <VideoPlayerMuteButton />
    </VideoPlayerControlBar>
  </VideoPlayer>
);

export default Example;
