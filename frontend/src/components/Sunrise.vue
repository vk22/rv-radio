<template>
    <div class="sunrise-wrap">
        <div ref="main" class="sunrise">
            <div class="hero-text">
                <h1>Development of digital products</h1>
                <p>We create websites, apps and branding. Our primary focus are start-ups, real estate and eCommerce
                    projects.
                </p>
            </div>
            <div class="sunrise-container">
                <div class="ball" ref="ball" data-speed="0.25"></div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';

gsap.registerPlugin(ScrollTrigger, Flip);


const main = ref();
const ball = ref();
const content = ref();
let ctx;

onMounted(() => {
    ctx = gsap.context(() => {
        // create the smooth scroller FIRST!
        gsap.to(".ball", { duration: 2, yPercent: -10, delay: 0 });

        const tl = gsap
            .timeline({
                scrollTrigger: {
                    trigger: '.sunrise-wrap',
                    start: "bottom 95%",
                    end: "bottom 25%",
                    scrub: 1,
                    immediateRender: false
                }
            })
            .to('.ball', { scale: 2, duration: 1.5 })
            .to('.ball', { y: 0, ease: "none" })
            .to('.ball', { x: 0, ease: "none" });

        // gsap.to("[data-speed]", {
        //     y: (i, el) => (1 - parseFloat(el.getAttribute("data-speed"))) * ScrollTrigger.maxScroll(window),
        //     ease: "none",
        //     scrollTrigger: {
        //         start: 0,
        //         end: "max",
        //         invalidateOnRefresh: true,
        //         scrub: 0
        //     }
        // });


    }, main.value);
    // 
});

</script>

<style>
.sunrise-wrap {
    height: 100vh;
}
.sunrise {
    background: #242424;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
    padding: 2rem;
}

.hero-text {
    position: fixed;
    top: 10rem;
    left: 1.5rem;
    font-size: 2.5rem;
    color: #fff;
    z-index: 999;
}

.ball {
    position: absolute;
    left: 15%;
    top: 70%;
    width: 70vw;
    height: 70vw;
    border-radius: 9999px;
    background: linear-gradient(168.89deg,
            #fee0c5 -21.3%,
            #e20000 89.88%);
}
</style>