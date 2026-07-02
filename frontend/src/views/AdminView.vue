<template>
  <main class="min-h-screen w-full pt-24 text-white">
    <section class="mx-auto w-full max-w-3xl px-4">
      <div class="mb-6 flex items-center justify-between gap-4">
        <h1 class="text-xl font-semibold">Channels</h1>
        <button class="rounded border border-white/20 px-3 py-2 text-sm hover:bg-white/10" @click="loadChannels">
          Refresh
        </button>
      </div>

      <form class="mb-8 grid gap-3 border-b border-white/10 pb-6 sm:grid-cols-[1fr_1fr_auto]" @submit.prevent="createChannel">
        <input
          class="bg-white/10 px-3 py-2 text-sm outline-none placeholder:text-white/40"
          v-model="newChannel.id"
          placeholder="channel-id"
        />
        <input
          class="bg-white/10 px-3 py-2 text-sm outline-none placeholder:text-white/40"
          v-model="newChannel.name"
          placeholder="Channel name"
        />
        <button class="bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/85" type="submit">
          Add
        </button>
      </form>

      <div class="grid gap-3">
        <article
          class="grid gap-3 border border-white/10 p-4 sm:grid-cols-[1fr_auto_auto]"
          v-for="channel in channels"
          :key="channel.id"
        >
          <div>
            <div class="font-semibold">{{ channel.name }}</div>
            <div class="text-sm text-white/50">{{ channel.id }} · {{ channel.mount }} · MPD {{ channel.mpdPort }}</div>
          </div>

          <button
            class="border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
            @click="toggleChannel(channel)"
          >
            {{ channel.enabled ? 'Disable' : 'Enable' }}
          </button>

          <button class="border border-red-300/40 px-3 py-2 text-sm text-red-200 hover:bg-red-500/10" @click="deleteChannel(channel)">
            Delete
          </button>
        </article>
      </div>

      <p class="mt-6 text-sm text-white/50" v-if="message">{{ message }}</p>
    </section>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const channels = ref([]);
const message = ref("");
const newChannel = ref({
  id: "",
  name: "",
});

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
};

const loadChannels = async () => {
  const data = await request("/admin/channels");
  channels.value = data.data;
};

const createChannel = async () => {
  const id = newChannel.value.id.trim();
  const name = newChannel.value.name.trim() || id;

  if (!id) {
    message.value = "Channel id is required.";
    return;
  }

  const mpdPort = 6600 + channels.value.length;
  await request("/admin/channels", {
    method: "POST",
    body: JSON.stringify({
      id,
      name,
      enabled: true,
      mount: `/${id}.mp3`,
      mpdPort,
    }),
  });

  newChannel.value = { id: "", name: "" };
  message.value = "Channel saved. MPD manager will apply it automatically.";
  await loadChannels();
};

const toggleChannel = async (channel) => {
  await request(`/admin/channels/${channel.id}`, {
    method: "PATCH",
    body: JSON.stringify({ enabled: !channel.enabled }),
  });
  message.value = "Channel updated. MPD manager will apply it automatically.";
  await loadChannels();
};

const deleteChannel = async (channel) => {
  await request(`/admin/channels/${channel.id}`, { method: "DELETE" });
  message.value = "Channel deleted. MPD manager will apply it automatically.";
  await loadChannels();
};

onMounted(loadChannels);
</script>
