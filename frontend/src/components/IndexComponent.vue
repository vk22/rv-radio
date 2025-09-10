<template>
  <div class="index" ref="main" :class="{ blur: formModalOpened }">
    <!-- <Sunrise></Sunrise> -->
    <!-- <div class="slider-background">
      <AnimatedComponent delay="0" animation-type="slideup">
          <img :src="'/' + imgBack" alt="">
      </AnimatedComponent>
    </div> -->
    <div class="projects-index">
      <AnimatedComponent delay="250" animation-type="slideup">
        <div class="top-title">Now playing</div>
        <div class="radio-controls-wrap">
          <div
            class="radioBtn play"
            v-if="!playing && !loading"
            @click="play"
            :class="{ loading: loading }"
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
          <div class="radioBtn pause" v-if="playing" @click="pause">
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
          <div class="radioBtn loadingBtn" v-if="loading">
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
            <img :src="'/covers/' + currentItem.img" alt="" />
          </template>
          <template #title>{{ currentItem.title }}</template>
          <template #artist>{{ currentItem.artist }}</template>
          <template #media>{{ currentItem.media }}</template>
          <template #sleeve>{{ currentItem.sleeve }}</template>
          <template #price>{{ currentItem.price }}</template>
        </ProjectItem>
      </AnimatedComponent>
    </div>
  </div>
</template>


<script setup>
import { onMounted, computed, ref } from 'vue';
import { Howl, Howler } from "howler";
import AnimatedComponent from './AnimatedComponent.vue';
import ProjectItem from './ProjectItem.vue'
import Sunrise from './Sunrise.vue'
import { useReservationStore } from "../store/reservation";
const store = useReservationStore();
const formModalOpened = computed(() => store.getFormModalState)
// import gsap from 'gsap-trial';
// import { ScrollTrigger } from 'gsap-trial/ScrollTrigger';
// import { ScrollSmoother } from 'gsap-trial/ScrollSmoother';

// gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
const currentItem = ref({
  img: "cover.jpg",
  title: "",
  artist: "",
  media: "",
  sleeve: "",
  price: "",
  link: "https://discogs.com/",
});

const track = ref({});


const fetchTrack = async () => {
  const res = await fetch("http://localhost:3000/api/nowplaying");
  const data = await res.json();
  console.log('fetchTrack ', data)
  if (data.title) {
    currentItem.value = data;
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
    src: "http://localhost:8000/radio.mp3",
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
  setInterval(fetchTrack, 5000);
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

<style>
.index {
  padding-bottom: 2rem;
}
.blur {
  opacity: 0.5;
}

.slider-background {
  position: fixed;
  width: 100vw;
  height: 100vh;
  top: 0;
  left: 0;
  z-index: -1;
  display: flex;
  align-items: center;
}

.projects-index {
  margin-top: 2rem;
  position: relative;
  z-index: 99;
  width: 400px;
}

.top-title {
  width: 100%;
  display: flex;
  justify-content: center;
  color: #ddd;
  text-transform: uppercase;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 1px;
}

.radio-controls-wrap {
  position: absolute;
  top: 50px;
  z-index: 999;
  width: 100%;
  height: 400px;
  display: flex;
  /* align-items: center; */
  justify-content: center;
  padding-top: 45%;
}

.radio-controls-wrap .radioBtn {
  cursor: pointer;
  transition: 0.15s ease-in-out all;
}

.radio-controls-wrap .radioBtn:hover {
  opacity: 0.85;
}

.radio-controls-wrap .radioBtn.loading {
  opacity: 0.5;
}

@media (max-width: 600px) {
  h1 {
    font-size: 2.5em;
    font-weight: 700;
    line-height: 2.75rem;
    margin-bottom: 1rem;
  }
  .projects-index {
    margin-top: 2rem;
  }
  p {
    font-size: 1.1rem;
  }
}

@media (min-width: 600px) {
  h1 {
    font-size: 4.5em;
    font-weight: 700;
    line-height: 4.85rem;
    margin-bottom: 1rem;
  }
  .projects-index {
    margin-top: 2rem;
  }
  p {
    font-size: 1.15rem;
  }
}
</style>
