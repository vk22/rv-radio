<template>
  <main v-if="channel" class="grid h-full grid-cols-2 bg-[linear-gradient(145deg,var(--accent),#050505_72%)] max-[900px]:block max-[900px]:h-auto max-[900px]:min-h-full max-[900px]:overflow-y-auto" :style="{ '--accent': channel.accentColor }">
    <section class="flex min-w-0 flex-col justify-between  p-[clamp(24px,4.5vw,48px)] max-[900px]:min-h-[calc(100dvh-70px)] max-[900px]:gap-16">
      <RouterLink to="/" class="self-start font-mono text-xs text-[#aaa]">← All channels</RouterLink>
      <div>
        <h1 class="max-w-[10ch] text-[clamp(64px,9.2vw,182px)] font-semibold leading-[0.88] tracking-[0.001px]">{{ channel.name }}</h1>
        <p class="mt-9 max-w-2xl font-mono text-[clamp(14px,1.25vw,22px)] leading-[1.35]">{{ channel.description }}</p>
      </div>

      <div class="flex items-center gap-[22px]">
        <button class="relative aspect-square w-[clamp(112px,11vw,210px)] cursor-pointer overflow-hidden border-0 bg-[#222] p-0 text-white" type="button" @click="togglePlay" :aria-label="loading ? 'Cancel loading' : playing ? 'Pause' : 'Play'" :aria-busy="loading">
          <img v-if="track.imageUrl" class="h-full w-full object-cover" :src="track.imageUrl" alt="" />
          <span v-else class="block h-full w-full"></span>
          <LoaderCircle v-if="loading" class="absolute top-1/2 left-1/2 h-[42px] w-[42px] -translate-x-1/2 -translate-y-1/2 animate-spin drop-shadow-[0_2px_8px_#000]" />
          <Pause v-else-if="playing" class="absolute top-1/2 left-1/2 h-[42px] w-[42px] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_2px_8px_#000]" />
          <Play v-else class="absolute top-1/2 left-1/2 h-[42px] w-[42px] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_2px_8px_#000]" />
        </button>
        <div class="flex min-w-0 font-sans flex-col text-[clamp(15px,3.5vw,35px)] leading-[1.2]">
          <strong>{{ track.artist || "Live stream" }}</strong>
          <span class="opacity-70">{{ track.title || "Now playing" }}</span>
          <button class="mt-[10px] flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0" type="button" :class="channel.likedByCurrentUser ? 'text-[#ff7777]' : 'text-white'" @click="toggleLike">
            <Heart class="w-6" :fill="channel.likedByCurrentUser ? 'currentColor' : 'none'" /> {{ channel.likesCount }}
          </button>
        </div>
      </div>
    </section>

    <section class="m-[clamp(28px,4vw,70px)] flex min-w-0 flex-col overflow-hidden border border-[#383838] p-[clamp(26px,3vw,54px)] max-[900px]:m-0 max-[900px]:min-h-[70dvh] max-[900px]:border-x-0">
      <h2 class="font-mono text-[15px] tracking-[0.12em] uppercase mb-4">Comments <span class="opacity-45">{{ comments.length }}</span></h2>
      <div class="mt-auto mb-7 flex flex-col gap-7 overflow-y-auto">
        <article v-for="comment in comments" :key="comment.id" class="grid grid-cols-[48px_1fr] gap-4 font-mono text-sm leading-[1.45]">
          <div class="grid h-12 w-12 place-items-center rounded-full bg-[#333]">{{ comment.user.username.slice(0, 1).toUpperCase() }}</div>
          <div><strong>{{ comment.user.username }}</strong><p class="mt-1 [overflow-wrap:anywhere] whitespace-pre-wrap text-[#d0d0d0]">{{ comment.body }}</p></div>
        </article>
        <p v-if="!comments.length" class="font-mono text-sm text-[#777]">Be the first to comment.</p>
      </div>

      <form v-if="auth.user" class="flex items-center gap-[14px]" @submit.prevent="sendComment">
        <div class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#333]">{{ auth.user.username.slice(0, 1).toUpperCase() }}</div>
        <input class="w-full rounded-full border border-[#444] bg-transparent px-5 py-[14px] text-white outline-none focus:border-[#999]" v-model.trim="commentBody" maxlength="2000" placeholder="Do you like it?" aria-label="Comment" />
      </form>
      <RouterLink v-else class="rounded-full border border-[#444] px-5 py-[14px] text-center text-[#aaa]" :to="`/login?redirect=/channel/${channel.id}`">Sign in to like and comment</RouterLink>
    </section>
  </main>
  <main v-else class="grid h-full place-items-center">{{ error || "Loading channel…" }}</main>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Howl } from "howler";
import { Heart, LoaderCircle, Pause, Play } from "lucide-vue-next";
import { apiRequest, auth } from "../auth";

const route = useRoute();
const router = useRouter();
const channel = ref(null);
const track = ref({});
const comments = ref([]);
const commentBody = ref("");
const error = ref("");
const playing = ref(false);
const loading = ref(false);
let player;
let interval;

const loadChannel = async () => { channel.value = (await apiRequest(`/channels/${route.params.id}`)).data; };
const loadTrack = async () => { track.value = await apiRequest(`/channels/${route.params.id}/nowplaying`); };
const loadComments = async () => { comments.value = (await apiRequest(`/channels/${route.params.id}/comments`)).data; };

const togglePlay = () => {
  if (playing.value || loading.value) {
    player?.unload();
    player = null;
    playing.value = false;
    loading.value = false;
    return;
  }

  loading.value = true;
  const howl = new Howl({
    src: [channel.value.streamUrl],
    html5: true,
    volume: .5,
    onplay: () => {
      if (player !== howl) return;
      loading.value = false;
      playing.value = true;
    },
    onend: () => {
      if (player !== howl) return;
      loading.value = false;
      playing.value = false;
    },
    onloaderror: () => {
      if (player !== howl) return;
      player = null;
      loading.value = false;
      playing.value = false;
    },
    onplayerror: () => {
      if (player !== howl) return;
      player = null;
      loading.value = false;
      playing.value = false;
    },
  });
  player = howl;
  howl.play();
};

const toggleLike = async () => {
  if (!auth.user) return router.push(`/login?redirect=/channel/${channel.value.id}`);
  const method = channel.value.likedByCurrentUser ? "DELETE" : "PUT";
  const result = await apiRequest(`/channels/${channel.value.id}/like`, { method });
  Object.assign(channel.value, result.data);
};

const sendComment = async () => {
  if (!commentBody.value) return;
  const result = await apiRequest(`/channels/${channel.value.id}/comments`, { method: "POST", body: JSON.stringify({ body: commentBody.value }) });
  comments.value.unshift(result.data);
  commentBody.value = "";
};

onMounted(async () => {
  try {
    await Promise.all([loadChannel(), loadTrack(), loadComments()]);
    interval = window.setInterval(loadTrack, 5000);
  } catch (requestError) { error.value = requestError.message; }
});
onBeforeUnmount(() => {
  window.clearInterval(interval);
  player?.unload();
  player = null;
  loading.value = false;
  playing.value = false;
});
</script>
