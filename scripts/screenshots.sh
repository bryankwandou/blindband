#!/usr/bin/env bash
# Capture the screenshots in docs/images from a running build.
#
#   cd web && npx next build && npx next start -p 3114
#   bash scripts/screenshots.sh http://localhost:3114
#
# Headless Chrome, no Playwright and no browser download — the only dependency
# beyond Chrome is Pillow, used to check that a shot actually caught something.
#
# The check is not decoration. The entrance animations are driven by an
# IntersectionObserver, and under Chrome's virtual time budget the callback
# sometimes never lands, leaving a page that is structurally complete and
# entirely invisible. Roughly one capture in two comes back as an empty
# gradient, so every shot is measured for ink and retried until it has some.
set -euo pipefail

BASE="${1:-http://localhost:3114}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/docs/images"
CHROME="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
# A cold Chrome profile loses the race described below every single time, so
# the profile is kept between runs and warmed once before the first capture.
PROFILE="${TMPDIR:-/tmp}/blindband-shots-profile"
mkdir -p "$OUT" "$PROFILE"

# $1 file  $2 path  $3 WxH  $4 colour scheme (1 light, 2 dark)
shot() {
  local file="$1" path="$2" size="$3" scheme="$4" nojs="${5:-}" budget js=""
  # With scripting off there is nothing to wait for and nothing to race:
  # the noscript rule paints the page at full opacity on the first frame.
  # `--run-all-compositor-stages-before-draw` has to come off with it —
  # together the two produce a blank capture every time.
  local stages="--run-all-compositor-stages-before-draw"
  if [ "$nojs" = nojs ]; then js="--disable-javascript"; stages=""; fi
  # There is no single budget that works for every page. A short one loses
  # the race on a tall viewport, where thirty sections start animating at
  # once; a long one loses it on any viewport, because virtual time can run
  # past the observer callback entirely. The attempts walk a ladder rather
  # than repeating the same wager six times.
  for budget in 9000 20000 14000 20000 9000 20000; do
    [ -n "$js" ] && budget=6000
    "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
      $stages --virtual-time-budget="$budget" \
      --blink-settings=preferredColorScheme="$scheme" \
      $js --force-device-scale-factor=2 --window-size="$size" \
      --screenshot="$OUT/$file" --user-data-dir="$PROFILE" \
      "$BASE$path" >/dev/null 2>&1 || true
    # Checked from inside $OUT with a bare filename: this script runs under Git
    # Bash on Windows, where $OUT is a POSIX path that the native Python cannot
    # open. Chrome gets the path translated for it; a quoted -c string does not.
    if (cd "$OUT" && python -c "
import sys
from PIL import Image
g = Image.open('$file').convert('L')
# Measured below the header: the nav renders even when every animated section
# has stayed at zero opacity, so its text alone is enough ink to pass a check
# on the whole image. The band that matters is the body underneath it.
w, h = g.size
lo, hi = g.crop((0, int(h * 0.16), w, int(h * 0.85))).getextrema()
# A page that rendered has both ink and ground; an empty one is all ground.
sys.exit(0 if hi - lo > 120 else 1)
") 2>/dev/null; then
      echo "  ok   $file  (budget $budget)"
      return 0
    fi
    echo "  ...  $file came back blank, retrying"
  done
  echo "  FAIL $file" >&2
  return 1
}

echo "warming the browser profile"
"$CHROME" --headless=new --disable-gpu --virtual-time-budget=4000   --user-data-dir="$PROFILE" --dump-dom "$BASE/en" >/dev/null 2>&1 || true

echo "capturing from $BASE"
shot 00-hero-en.png      /en           1440,900   2
# The full-page shot is captured with scripting off. Every other viewport
# settles within one of the budgets above; a 6900-pixel one starts thirty
# reveals at once and loses the race at all of them. With no JavaScript
# the noscript rule in the layout renders the page at full opacity, which
# is deterministic — and is also the page a crawler sees.
shot 01-landing-en.png   /en           1440,6900  2  nojs
shot 02-landing-id.png   /id           1440,900   2
shot 03-landing-zh.png   /zh           1440,900   2
shot 04-round-en.png     /en/round     1440,1664  2
shot 05-verify-en.png    /en/verify    1440,1094  2
shot 09-mobile-en.png    /en           585,1266   2
shot 11-light-en.png     /en           1440,900   1
shot 12-light-round.png  /en/round     1440,1500  1
shot 06-docs-en.png      /en/docs      1440,4900  2  nojs
shot 10-mobile-round.png /en/round     585,3845   2  nojs

# Not captured here: 07-walkthrough-replay.png is a crop of the terminal
# player and 08-verifier-match.png is the verifier after its button has been
# pressed. Both are states rather than pages, and faking the interaction from
# a command line would cost more than taking two screenshots by hand.
echo "done — $OUT"
