<template>
  <div class="pb-8" ref="main">
    <div class="relative z-[99] mt-8 w-[300px] max-w-full">
      <AnimatedComponent delay="250" animation-type="slideup">
        <div class="flex w-full justify-center text-[0.7rem] font-semibold uppercase tracking-[1px] text-[#555]">Now playing</div>
        <div class="absolute top-[50px] z-[999] flex h-[400px] w-full justify-center pt-[45%]">
          <div
            class="cursor-pointer transition-opacity duration-150 ease-in-out hover:opacity-[0.85]"
            v-if="!playing && !loading"
            @click="play"
            :class="{ 'opacity-50': loading }"
          >
            <svg
              width="50px"
              height="60px"
              viewBox="0 0 26 32"
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              xmlns:xlink="http://www.w3.org/1999/xlink"
            >
              <g
                id="Page-1"
                stroke="none"
                stroke-width="1"
                fill="none"
                fill-rule="evenodd"
                opacity="0.900928442"
              >
                <g
                  id="Desktop-HD-Copy-3"
                  transform="translate(-97.000000, -1135.000000)"
                  fill="#ffffff"
                >
                  <g id="player" transform="translate(0.000000, 1112.000000)">
                    <g id="Group-4" transform="translate(49.000000, 23.000000)">
                      <polygon
                        id="Triangle"
                        points="74 16 48 32 48 0"
                      ></polygon>
                    </g>
                  </g>
                </g>
              </g>
            </svg>
          </div>
          <div class="cursor-pointer transition-opacity duration-150 ease-in-out hover:opacity-[0.85]" v-if="playing" @click="pause">
            <svg
              width="40px"
              height="60px"
              viewBox="0 0 22 30"
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              xmlns:xlink="http://www.w3.org/1999/xlink"
            >
              <g
                id="Page-1"
                stroke="none"
                stroke-width="1"
                fill="none"
                fill-rule="evenodd"
                opacity="0.900928442"
              >
                <g id="pauseBtn" fill="#ffffff">
                  <g id="Page-1">
                    <g id="Desktop-HD-Copy-3">
                      <g id="player">
                        <g id="Group-4">
                          <g id="Group-6">
                            <rect
                              id="Rectangle"
                              x="0"
                              y="0"
                              width="8"
                              height="30"
                            ></rect>
                            <rect
                              id="Rectangle"
                              x="14"
                              y="0"
                              width="8"
                              height="30"
                            ></rect>
                          </g>
                        </g>
                      </g>
                    </g>
                  </g>
                </g>
              </g>
            </svg>
          </div>
          <div class="cursor-pointer transition-opacity duration-150 ease-in-out hover:opacity-[0.85]" v-if="loading">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="60px">
              <radialGradient
                id="a12"
                cx=".66"
                fx=".66"
                cy=".3125"
                fy=".3125"
                gradientTransform="scale(1.5)"
              >
                <stop offset="0" stop-color="#FFFFFF"></stop>
                <stop offset=".3" stop-color="#FFFFFF" stop-opacity=".9"></stop>
                <stop offset=".6" stop-color="#FFFFFF" stop-opacity=".6"></stop>
                <stop offset=".8" stop-color="#FFFFFF" stop-opacity=".3"></stop>
                <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"></stop>
              </radialGradient>
              <circle
                transform-origin="center"
                fill="none"
                stroke="url(#a12)"
                stroke-width="10"
                stroke-linecap="round"
                stroke-dasharray="200 1000"
                stroke-dashoffset="0"
                cx="100"
                cy="100"
                r="70"
              >
                <animateTransform
                  type="rotate"
                  attributeName="transform"
                  calcMode="spline"
                  dur="2"
                  values="360;0"
                  keyTimes="0;1"
                  keySplines="0 0 1 1"
                  repeatCount="indefinite"
                ></animateTransform>
              </circle>
              <circle
                transform-origin="center"
                fill="none"
                opacity=".2"
                stroke="#FFFFFF"
                stroke-width="10"
                stroke-linecap="round"
                cx="100"
                cy="100"
                r="70"
              ></circle>
            </svg>
          </div>
        </div>
        <ProjectItem :link="currentItem.link">
          <template #image>
            <img v-if="currentItem.imageUrl" :src="currentItem.imageUrl" alt="" @error="useFallbackImage" />
          </template>
          <template #title>{{ currentItem.title }}</template>
          <template #artist>{{ currentItem.artist }}</template>
        </ProjectItem>
      </AnimatedComponent>
    </div>
  </div>
</template>


<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { Howl, Howler } from "howler";
import AnimatedComponent from './AnimatedComponent.vue';
import ProjectItem from './ProjectItem.vue'
// import gsap from 'gsap-trial';
// import { ScrollTrigger } from 'gsap-trial/ScrollTrigger';
// import { ScrollSmoother } from 'gsap-trial/ScrollSmoother';

// gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
const currentItem = ref({
  imageUrl: "/cover.jpg",
  fallbackImageUrl: null,
  title: "",
  artist: "",
  media: "",
  sleeve: "",
  price: "",
  link: "https://discogs.com/",
});

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const STREAM_URL = import.meta.env.VITE_STREAM_URL || "http://localhost:8001/radio.mp3";
let trackInterval;

const fetchTrack = async () => {
  try {
    const res = await fetch(`${API_URL}/nowplaying`);
    const data = await res.json();
    if (data.title) {
      currentItem.value = data;
    }
  } catch (err) {
    console.error("Failed to fetch current track", err);
  }
};

const useFallbackImage = () => {
  const fallbackImageUrl = currentItem.value.fallbackImageUrl;
  if (fallbackImageUrl && currentItem.value.imageUrl !== fallbackImageUrl) {
    currentItem.value.imageUrl = fallbackImageUrl;
  }
};

const playlist = ref([]);
const playerIndex = ref(0);
const playing = ref(false);
const loop = ref(false);
const shuffle = ref(false);
const seek = ref(0);
const loading = ref(false);
const playerIsActive = ref(false);
const currentTrack = ref(null);
const source = ref(undefined);
const player = ref(undefined);

const play = (index) => {
  let track = {
    freq: "81.4",
    title: "Revibed Radio",
    src: STREAM_URL,
    howl: null,
  };

  loading.value = true;
  /// if track is playing now - play from pause
  if (track.howl) {
    console.log("from pause");
    player.value = track.howl;

    /// new track
  } else {
    player.value = track.howl = new Howl({
      src: [track.src],
      html5: true,
      volume: 0.5,
      onend: () => {},
      onplay: () => {
        playing.value = true;
        currentTrack.value = track;
        loading.value = false;
      },
    });
  }

  //console.log('player.value', player.value)
  player.value.play();
  /// selectedTrack, currentTrack
};
const pause = (index) => {
  //console.log('pause', currentTrack.value.title)
  currentTrack.value.howl.pause();
  playing.value = false;
  console.log("currentTrack.value.howl ", currentTrack.value.howl);
};
const stop = (index) => {
  Howler.unload();
  playing.value = false;
  //this.$store.commit('player/setPlaying', false)
};


onMounted(() => {
  fetchTrack();
  trackInterval = setInterval(fetchTrack, 5000);
});

onBeforeUnmount(() => {
  clearInterval(trackInterval);
});


// const main = ref();
// let smoother;
// let ctx;

// onMounted(() => {
//   ctx = gsap.context(() => {
//     // create the smooth scroller FIRST!
//     // smoother = ScrollSmoother.create({
//     //   smooth: 2, // seconds it takes to "catch up" to native scroll position
//     //   effects: true, // look for data-speed and data-lag attributes on elements and animate accordingly
//     // });
//     // ScrollTrigger.create({
//     //   trigger: '.circle',
//     //   pin: false,
//     //   // start: 'center center',
//     //   // end: '+=300',
//     //   markers: false,
//     // });

//     // let tl = gsap.timeline({
//     //   // yes, we can add it to an entire timeline!
//     //   scrollTrigger: {
//     //     trigger: '.index',
//     //     pin: true, // pin the trigger element while active
//     //     start: 'top top', // when the top of the trigger hits the top of the viewport
//     //     end: '+=500', // end after scrolling 500px beyond the start
//     //     scrub: 1, // smooth scrubbing, takes 1 second to "catch up" to the scrollbar
//     //     snap: {
//     //       snapTo: 'labels', // snap to the closest label in the timeline
//     //       duration: { min: 0.2, max: 3 }, // the snap animation should be at least 0.2 seconds, but no more than 3 seconds (determined by velocity)
//     //       delay: 0.2, // wait 0.2 seconds from the last scroll event before doing the snapping
//     //       ease: 'power1.inOut' // the ease of the snap animation ("power3" by default)
//     //     }
//     //   }
//     // });

//     // add animations and labels to the timeline
//     tl
//     .addLabel('start')
//     .from('.circle', { scale: 0.3, rotation: 45, autoAlpha: 0 })



//   }, main.value);
//   // 
// });

</script>
