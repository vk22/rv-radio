<template>
  <main class="h-full w-full overflow-y-auto py-12 text-white">
    <section class="mx-auto w-full max-w-5xl px-4">
      <div class="mb-8 flex items-center justify-between gap-4">
        <div>
          <p class="font-mono text-xs tracking-[0.15em] uppercase text-white/45">Administration</p>
          <h1 class="mt-2 text-4xl font-semibold">Channels</h1>
        </div>
        <button class="rounded border border-white/20 px-3 py-2 text-sm hover:bg-white/10" @click="loadChannels">Refresh</button>
      </div>

      <form class="mb-10 grid gap-4 border border-white/10 bg-white/[0.025] p-5 sm:grid-cols-2" @submit.prevent="createChannel">
        <h2 class="sm:col-span-2 text-lg font-semibold">New channel</h2>
        <label class="grid gap-1 text-xs text-white/55">ID<input class="w-full bg-white/10 px-3 py-2 text-sm text-white outline-none" v-model.trim="newChannel.id" placeholder="channel-id" required /></label>
        <label class="grid gap-1 text-xs text-white/55">Name<input class="w-full bg-white/10 px-3 py-2 text-sm text-white outline-none" v-model.trim="newChannel.name" placeholder="Channel name" required /></label>
        <label class="grid gap-1 text-xs text-white/55 sm:col-span-2">Description<textarea class="min-h-24 w-full resize-y bg-white/10 px-3 py-2 text-sm text-white outline-none" v-model.trim="newChannel.description"></textarea></label>
        <label class="grid gap-1 text-xs text-white/55">Cover URL<input class="w-full bg-white/10 px-3 py-2 text-sm text-white outline-none" v-model.trim="newChannel.cover" placeholder="/channels/cover.jpg" /></label>
        <label class="grid gap-1 text-xs text-white/55">Accent color<div class="flex gap-2"><input class="h-10 w-12 bg-transparent" type="color" v-model="newChannel.accentColor" /><input class="w-full flex-1 bg-white/10 px-3 py-2 text-sm text-white outline-none" v-model.trim="newChannel.accentColor" /></div></label>
        <label class="grid gap-1 text-xs text-white/55">Mount<input class="w-full bg-white/10 px-3 py-2 text-sm text-white outline-none" v-model.trim="newChannel.mount" placeholder="/channel.mp3" required /></label>
        <label class="grid gap-1 text-xs text-white/55">MPD port<input class="w-full bg-white/10 px-3 py-2 text-sm text-white outline-none" v-model.number="newChannel.mpdPort" type="number" min="1024" max="65535" required /></label>
        <label class="grid gap-1 text-xs text-white/55">Sort order<input class="w-full bg-white/10 px-3 py-2 text-sm text-white outline-none" v-model.number="newChannel.sortOrder" type="number" /></label>
        <label class="flex items-center gap-2 self-end py-2 text-sm"><input v-model="newChannel.enabled" type="checkbox" /> Enabled</label>
        <label class="grid gap-1 text-xs text-white/55 sm:col-span-2">Track IDs (comma separated)<input class="w-full bg-white/10 px-3 py-2 text-sm text-white outline-none" v-model="newChannel.trackIdsText" placeholder="Leave empty to use all channel tracks" /></label>
        <button class="bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-white/85 sm:col-span-2" type="submit">Add channel</button>
      </form>

      <div class="grid gap-5">
        <form class="grid gap-4 border border-white/10 p-5 sm:grid-cols-2" v-for="channel in channels" :key="channel.id" @submit.prevent="saveChannel(channel)">
          <div class="flex items-center justify-between gap-4 sm:col-span-2">
            <div><strong class="text-lg">{{ channel.name }}</strong><p class="font-mono text-xs text-white/40">{{ channel.id }} · ID cannot be changed</p></div>
            <span class="h-6 w-6 rounded-full border border-white/20" :style="{ backgroundColor: channel.accentColor }"></span>
          </div>
          <label class="grid gap-1 text-xs text-white/55">Name<input class="w-full bg-white/10 px-3 py-2 text-sm text-white outline-none" v-model.trim="channel.name" required /></label>
          <label class="grid gap-1 text-xs text-white/55">Cover URL<input class="w-full bg-white/10 px-3 py-2 text-sm text-white outline-none" v-model.trim="channel.cover" /></label>
          <label class="grid gap-1 text-xs text-white/55 sm:col-span-2">Description<textarea class="min-h-24 w-full resize-y bg-white/10 px-3 py-2 text-sm text-white outline-none" v-model.trim="channel.description"></textarea></label>
          <label class="grid gap-1 text-xs text-white/55">Accent color<div class="flex gap-2"><input class="h-10 w-12 bg-transparent" type="color" v-model="channel.accentColor" /><input class="w-full flex-1 bg-white/10 px-3 py-2 text-sm text-white outline-none" v-model.trim="channel.accentColor" /></div></label>
          <label class="grid gap-1 text-xs text-white/55">Mount<input class="w-full bg-white/10 px-3 py-2 text-sm text-white outline-none" v-model.trim="channel.mount" required /></label>
          <label class="grid gap-1 text-xs text-white/55">MPD port<input class="w-full bg-white/10 px-3 py-2 text-sm text-white outline-none" v-model.number="channel.mpdPort" type="number" min="1024" max="65535" required /></label>
          <label class="grid gap-1 text-xs text-white/55">Sort order<input class="w-full bg-white/10 px-3 py-2 text-sm text-white outline-none" v-model.number="channel.sortOrder" type="number" /></label>
          <label class="flex items-center gap-2 self-end py-2 text-sm"><input v-model="channel.enabled" type="checkbox" /> Enabled</label>
          <label class="grid gap-1 text-xs text-white/55 sm:col-span-2">Track IDs (comma separated)<input class="w-full bg-white/10 px-3 py-2 text-sm text-white outline-none" v-model="channel.trackIdsText" /></label>
          <div class="flex justify-end gap-3 sm:col-span-2">
            <button class="border border-red-300/40 px-4 py-2 text-sm text-red-200 hover:bg-red-500/10" type="button" @click="deleteChannel(channel)">Delete</button>
            <button class="bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-white/85" type="submit">Save</button>
          </div>
        </form>
      </div>

      <p class="sticky bottom-4 mt-6 border border-white/10 bg-[#151515] p-3 text-sm" v-if="message">{{ message }}</p>
    </section>
  </main>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { apiRequest } from "../auth";

const channels = ref([]);
const message = ref("");
const emptyChannel = () => ({
  id: "", name: "", description: "", cover: "", accentColor: "#111111",
  enabled: true, mount: "", mpdPort: 6600, sortOrder: 0, trackIdsText: "",
});
const newChannel = reactive(emptyChannel());

const toPayload = (channel) => ({
  name: channel.name,
  description: channel.description,
  cover: channel.cover || null,
  accentColor: channel.accentColor,
  enabled: channel.enabled,
  mount: channel.mount,
  mpdPort: channel.mpdPort,
  sortOrder: channel.sortOrder,
  trackIds: channel.trackIdsText.split(",").map((id) => id.trim()).filter(Boolean),
});

const loadChannels = async () => {
  try {
    const result = await apiRequest("/admin/channels");
    channels.value = result.data.map((channel) => ({ ...channel, trackIdsText: (channel.trackIds || []).join(", ") }));
  } catch (error) { message.value = error.message; }
};

const createChannel = async () => {
  try {
    await apiRequest("/admin/channels", { method: "POST", body: JSON.stringify({ id: newChannel.id, ...toPayload(newChannel) }) });
    Object.assign(newChannel, emptyChannel());
    message.value = "Channel created. MPD will apply the change automatically.";
    await loadChannels();
  } catch (error) { message.value = error.message; }
};

const saveChannel = async (channel) => {
  try {
    await apiRequest(`/admin/channels/${channel.id}`, { method: "PATCH", body: JSON.stringify(toPayload(channel)) });
    message.value = `${channel.name} saved. MPD will apply the change automatically.`;
    await loadChannels();
  } catch (error) { message.value = error.message; }
};

const deleteChannel = async (channel) => {
  if (!window.confirm(`Delete ${channel.name}? Likes and comments for this channel will also be deleted.`)) return;
  try {
    await apiRequest(`/admin/channels/${channel.id}`, { method: "DELETE" });
    message.value = `${channel.name} deleted.`;
    await loadChannels();
  } catch (error) { message.value = error.message; }
};

onMounted(loadChannels);
</script>
