/**
 * WorkerFinder - Services Carousel
 * ================================
 * jQuery-powered infinite-loop carousel for the Services section.
 *
 * Features:
 *  - Infinite loop (cloned slides)
 *  - Responsive: 3 cards (desktop) → 2 (tablet ≤992px) → 1 (mobile ≤600px)
 *  - Previous / Next buttons (jQuery click handlers)
 *  - Live slide counter: "Showing X of 6"
 *  - AI-Enhanced auto-play every 5 seconds
 *  - Auto-play pauses on mouse-enter, resumes on mouse-leave
 */

$(document).ready(function () {

    /* ─── Configuration ─────────────────────────────────────────── */
    const AUTOPLAY_INTERVAL = 5000;   // ms between auto-advances
    const SLIDE_DURATION    = 420;    // CSS transition duration in ms
    const BREAKPOINTS = {
        desktop: { minWidth: 993, visible: 3 },
        tablet:  { minWidth: 601, visible: 2 },
        mobile:  { minWidth: 0,   visible: 1 },
    };

    /* ─── State ──────────────────────────────────────────────────── */
    let currentIndex  = 0;    // logical index (0-based, refers to original slides)
    let isAnimating   = false;
    let autoPlayTimer = null;
    let isPaused      = false;

    /* ─── DOM references ─────────────────────────────────────────── */
    const $section    = $('.services');
    const $track      = $('#carouselTrack');
    const $slides     = $track.children('.service-card');   // original slides
    const totalSlides = $slides.length;                     // 6

    const $prevBtn    = $('#carouselPrev');
    const $nextBtn    = $('#carouselNext');
    const $counter    = $('#slideCounter');
    const $current    = $('#slideCurrentNum');
    const $total      = $('#slideTotalNum');

    /* ─── Helpers ────────────────────────────────────────────────── */

    /** Return the number of visible cards for the current viewport width. */
    function getVisible() {
        const w = $(window).width();
        if (w >= BREAKPOINTS.desktop.minWidth) return BREAKPOINTS.desktop.visible;
        if (w >= BREAKPOINTS.tablet.minWidth)  return BREAKPOINTS.tablet.visible;
        return BREAKPOINTS.mobile.visible;
    }

    /** Width of a single card slot (track width / visible cards). */
    function getCardWidth() {
        return $track.parent().width() / getVisible();
    }

    /** Update slide counter text. */
    function updateCounter() {
        const display = ((currentIndex % totalSlides) + totalSlides) % totalSlides + 1;
        $current.text(display);
        $total.text(totalSlides);
    }

    /* ─── Clone slides for infinite loop ───────────────────────────
     *  Prepend clones of the LAST `visible` cards  (for prev wrap-around)
     *  Append  clones of the FIRST `visible` cards (for next wrap-around)
     *  We rebuild clones whenever viewport changes.
     */
    function buildClones() {
        // Remove any existing clones
        $track.find('.clone').remove();

        const vis = getVisible();

        // Append clones of first `vis` originals  → shown when we go past the end
        $slides.slice(0, vis).each(function () {
            $(this).clone(true).addClass('clone').appendTo($track);
        });

        // Prepend clones of last `vis` originals → shown when we go before start
        $slides.slice(-vis).each(function () {
            $(this).clone(true).addClass('clone').prependTo($track);
        });
    }

    /** Set all card widths to match viewport. */
    function setCardWidths() {
        const w = getCardWidth();
        $track.find('.service-card').css('width', w + 'px');
    }

    /**
     * Jump the track to the correct position WITHOUT animation.
     * Called after a clone-jump so the user never sees the seam.
     */
    function jumpToIndex(index, silent) {
        const vis     = getVisible();
        const cardW   = getCardWidth();
        const offset  = (index + vis) * cardW;   // +vis accounts for prepended clones

        if (silent) {
            $track.css('transition', 'none');
        }
        $track.css('transform', `translateX(-${offset}px)`);
        currentIndex = index;
        updateCounter();
    }

    /** Slide the track to a new index with CSS transition animation. */
    function goTo(index) {
        if (isAnimating) return;
        isAnimating = true;

        const vis      = getVisible();
        const cardW    = getCardWidth();
        const offset   = (index + vis) * cardW;

        $track.css({
            transition: `transform ${SLIDE_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
            transform:  `translateX(-${offset}px)`
        });

        currentIndex = index;
        updateCounter();

        // After animation: if we slid into a clone zone, jump silently to the real slide
        setTimeout(function () {
            if (currentIndex >= totalSlides) {
                jumpToIndex(0, true);
            } else if (currentIndex < 0) {
                jumpToIndex(totalSlides - 1, true);
            }
            // Re-enable transitions
            $track.css('transition', '');
            isAnimating = false;
        }, SLIDE_DURATION + 10);
    }

    /* ─── Navigation ─────────────────────────────────────────────── */

    function slideNext() { goTo(currentIndex + 1); }
    function slidePrev() { goTo(currentIndex - 1); }

    $nextBtn.on('click', function () {
        slideNext();
        resetAutoPlay();
    });

    $prevBtn.on('click', function () {
        slidePrev();
        resetAutoPlay();
    });

    /* ─── Keyboard navigation ─────────────────────────────────────── */
    $(document).on('keydown', function (e) {
        if (e.key === 'ArrowRight') { slideNext(); resetAutoPlay(); }
        if (e.key === 'ArrowLeft')  { slidePrev(); resetAutoPlay(); }
    });

    /* ─── Touch / swipe support ──────────────────────────────────── */
    let touchStartX = 0;
    let touchEndX   = 0;

    $track[0].addEventListener('touchstart', function (e) {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    $track[0].addEventListener('touchend', function (e) {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 40) {   // minimum swipe distance
            if (diff > 0) slideNext();
            else          slidePrev();
            resetAutoPlay();
        }
    }, { passive: true });

    /* ─── AI-Enhanced Auto-play ──────────────────────────────────── */

    function startAutoPlay() {
        if (autoPlayTimer) return;
        autoPlayTimer = setInterval(function () {
            if (!isPaused) slideNext();
        }, AUTOPLAY_INTERVAL);
    }

    function stopAutoPlay() {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
    }

    function resetAutoPlay() {
        stopAutoPlay();
        startAutoPlay();
    }

    // Pause when mouse enters any card, resume when it leaves
    $section.on('mouseenter', '.service-card', function () {
        isPaused = true;
        $(this).addClass('carousel-hovered');
    });

    $section.on('mouseleave', '.service-card', function () {
        isPaused = false;
        $(this).removeClass('carousel-hovered');
    });

    // Also pause on track mouseenter (catches gaps between cards)
    $track.on('mouseenter', function () { isPaused = true; })
          .on('mouseleave', function () { isPaused = false; });

    /* ─── Responsive resize handler ──────────────────────────────── */
    let resizeTimer;
    $(window).on('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            const savedIndex = currentIndex;
            buildClones();
            setCardWidths();
            jumpToIndex(savedIndex, true);
        }, 150);
    });

    /* ─── Initialise ─────────────────────────────────────────────── */
    function init() {
        buildClones();
        setCardWidths();
        jumpToIndex(0, true);   // start at first real slide without animation
        updateCounter();
        startAutoPlay();
    }

    init();
});
