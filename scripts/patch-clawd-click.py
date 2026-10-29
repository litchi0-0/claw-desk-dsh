#!/usr/bin/env python3
"""为 Clawd 1.4.0 补上单击回应，保留连续点击累积窗口。"""

def patch_hit(source):
    old = '''      clickCount = 0;
      firstClickDir = null;
    }, CLICK_WINDOW_MS);
  }
}

function playReaction'''
    new = '''      clickCount = 0;
      const dir = firstClickDir;
      firstClickDir = null;
      if (!canPlayReactionNow()) return;
      const react = dir === "left" ? leftReact : rightReact;
      if (react) playReaction(react.file, react.duration || 2500);
    }, CLICK_WINDOW_MS);
  }
}

function playReaction'''
    if source.count(old) != 1:
        raise ValueError('Unsupported Clawd click handler')
    return source.replace(old, new)
