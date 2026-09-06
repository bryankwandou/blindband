import type { Dictionary } from "@/lib/i18n";

/**
 * The demo video, on the page rather than only at a URL.
 *
 * It shipped for a while as a file under `/demo/` that nothing linked to, which
 * meant a reader who wanted to watch something before reading nine sections had
 * no way to find it. It sits beside the terminal replay because the two answer
 * the same question at different speeds: the video is sixty-three seconds and
 * shows the shape, the replay is the five real commands and can be paused on
 * the line you care about.
 *
 * `preload="none"` on purpose. The file is 7 MB against a page that is
 * otherwise a few hundred kilobytes, and most readers will never press play —
 * so nothing is fetched until one of them does. The poster frame is what they
 * see until then, and it is a still of the round rather than a title card.
 */
export function DemoVideo({ t, className = "" }: { t: Dictionary; className?: string }) {
  return (
    <figure className={className}>
      <h3 className="text-[16.5px] font-medium leading-snug text-ivory">{t.how.videoTitle}</h3>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-ink">
        <video
          controls
          muted
          playsInline
          preload="none"
          poster="/demo/poster.png"
          className="block aspect-video w-full"
        >
          <source src="/demo/blindband-demo.mp4" type="video/mp4" />
          {t.how.videoFallback}
        </video>
      </div>

      <figcaption className="mt-4 max-w-2xl text-[13.5px] leading-relaxed text-faint">
        {t.how.videoCaption}
      </figcaption>
    </figure>
  );
}
