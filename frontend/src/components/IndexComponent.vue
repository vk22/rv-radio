<template>
  <section class="flex max-[800px]:flex-col h-full w-full overflow-x-auto bg-[#050505] [scrollbar-width:thin]" aria-label="Radio channels">
    <article
      v-for="(channel, index) in channels"
      :key="channel.id"
      class="group relative isolate h-full min-w-0 basis-1/3 shrink-0 overflow-hidden bg-cover bg-center text-white max-[800px]:basis-full bg-[var(--accent)] "
      :style="{ '--accent': channel.accentColor }"
    >
      <div class="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(0,0,0,0.1)_25%,rgba(0,0,0,0.88)_100%)] backdrop-saturate-[0.85] transition-colors duration-300 group-hover:bg-black/10"></div>
      <RouterLink class="absolute inset-0 z-0 p-0" :to="`/channel/${channel.id}`" :aria-label="`Open ${channel.name}`"></RouterLink>

      <button
        class="absolute top-[4rem] right-[0rem] z-[2] grid h-[74px] w-[74px] -translate-x-1/2 -translate-y-[42%] cursor-pointer place-items-center rounded-full  bg-black/25 p-0 text-white opacity-0 transition-all duration-200 group-hover:-translate-y-1/2 group-hover:opacity-100 hover:bg-black/50 focus-visible:-translate-y-1/2 focus-visible:opacity-100 max-[800px]:opacity-100"
        type="button"
        :aria-label="loadingChannelId === channel.id ? `Cancel loading ${channel.name}` : isPlaying(channel.id) ? `Pause ${channel.name}` : `Play ${channel.name}`"
        :aria-busy="loadingChannelId === channel.id"
        @click="toggleChannel(channel)"
      >
        <LoaderCircle v-if="loadingChannelId === channel.id" class="h-[42px] w-[42px] animate-spin drop-shadow-[0_2px_8px_#000]" />
        <Pause v-else-if="isPlaying(channel.id)" class="h-8 w-8" :stroke-width="1.5" />
        <Play v-else class="h-8 w-8" :stroke-width="1.5" />
      </button>

      <div class="pointer-events-none absolute right-[clamp(24px,3vw,58px)] bottom-[clamp(28px,5vh,68px)] left-[clamp(24px,3vw,58px)] z-[1]">

        <h2 class="max-w-[9ch] text-[clamp(48px,10vw,180px)] leading-[0.84] font-semibold tracking-[1px] max-[800px]:text-[clamp(52px,90vw,120px)]">{{ channel.name }}</h2>
        <div class="mt-[clamp(22px,4vh,42px)] flex flex-col font-mono text-[clamp(12px,1vw,17px)] leading-[1.45]" v-if="nowPlaying[channel.id]?.title">
          <!-- <span>{{ nowPlaying[channel.id].artist }}</span>
          <span class="opacity-65">{{ nowPlaying[channel.id].title }}</span> -->
              <p class="mt-0 max-w-2xl font-mono text-[clamp(14px,1.25vw,22px)] leading-[1.35]">{{ channel.description }}</p>
        </div>
        <p class="mt-[clamp(22px,4vh,42px)] font-mono text-[clamp(12px,1vw,17px)] leading-[1.45] opacity-65" v-else>
          Live radio stream
        </p>
      </div>
    </article>

    <div v-if="!channels.length" class="grid h-full w-full place-items-center">
      Channels are loading…
    </div>
  </section>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { RouterLink } from "vue-router";
import { Howl } from "howler";
import { LoaderCircle, Pause, Play } from "lucide-vue-next";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const STREAM_BASE_URL =
  import.meta.env.VITE_STREAM_BASE_URL ||
  (import.meta.env.VITE_STREAM_URL || "http://localhost:8001/main.mp3").replace(
    /\/[^/]*$/,
    "",
  );

const channels = ref([]);
const nowPlaying = reactive({});
const playingChannelId = ref(null);
const loadingChannelId = ref(null);
let player = null;
let trackInterval;

const streamUrl = (channel) => {
  const mount = channel.mount || `/${channel.id}.mp3`;
  return `${STREAM_BASE_URL.replace(/\/$/, "")}${mount.startsWith("/") ? mount : `/${mount}`}`;
};

const fetchNowPlaying = async (channel) => {
  try {
    const response = await fetch(`${API_URL}/channels/${channel.id}/nowplaying`);
    const data = await response.json();
    nowPlaying[channel.id] = data;
  } catch (error) {
    console.error(`Failed to fetch ${channel.id}`, error);
  }
};

const fetchChannels = async () => {
  try {
    const response = await fetch(`${API_URL}/channels`);
    const data = await response.json();
    channels.value = data.data.filter((channel) => channel.enabled);
    await Promise.all(channels.value.map(fetchNowPlaying));
  } catch (error) {
    console.error("Failed to fetch channels", error);
  }
};

const fallbackColors = ["#111111", "#174f28", "#49325b", "#783323"];

const coverStyle = (channelId, index) => {
  const imageUrl = nowPlaying[channelId]?.imageUrl;
  return {
    backgroundColor: fallbackColors[index % fallbackColors.length],
    ...(imageUrl ? { backgroundImage: `url("${imageUrl}")` } : {}),
  };
};

const isPlaying = (channelId) => playingChannelId.value === channelId;

const stopPlayer = () => {
  const currentPlayer = player;
  player = null;
  currentPlayer?.unload();
  playingChannelId.value = null;
  loadingChannelId.value = null;
};

const toggleChannel = (channel) => {
  if (isPlaying(channel.id) || loadingChannelId.value === channel.id) {
    stopPlayer();
    return;
  }

  stopPlayer();
  loadingChannelId.value = channel.id;
  const howl = new Howl({
    src: [streamUrl(channel)],
    html5: true,
    volume: 0.5,
    onplay: () => {
      if (player !== howl) return;
      playingChannelId.value = channel.id;
      loadingChannelId.value = null;
    },
    onend: () => {
      if (player !== howl) return;
      stopPlayer();
    },
    onloaderror: () => {
      if (player !== howl) return;
      stopPlayer();
    },
    onplayerror: () => {
      if (player !== howl) return;
      stopPlayer();
    },
  });
  player = howl;
  howl.play();
};

onMounted(() => {
  fetchChannels();
  trackInterval = window.setInterval(
    () => Promise.all(channels.value.map(fetchNowPlaying)),
    5000,
  );
});

onBeforeUnmount(() => {
  window.clearInterval(trackInterval);
  stopPlayer();
});
</script>
