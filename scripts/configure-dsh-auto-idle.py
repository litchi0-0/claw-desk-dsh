"""Configure the already-imported safe idle categories without re-encoding media."""
WEIGHTS = {'日常生活': 30, '玩耍互动': 25, '音乐舞蹈': 15, '吃喝美食': 20, '节日庆祝': 10}

def configure_theme(theme):
    excluded = {'idle.webp', 'sleeping.webp'}
    theme['idleAnimations'] = [{'file': a['file'], 'duration': a['duration']}
        for a in theme['manualAnimations']
        if a.get('category', [None])[0] in WEIGHTS and a['file'] not in excluded]
    theme['autoIdleCategoryWeights'] = WEIGHTS.copy()
    theme['infoBubbles'] = True
    theme['version'] = '1.4.0'
    return theme

if __name__ == '__main__':
    import json, sys
    from pathlib import Path
    p = Path(sys.argv[1])
    p.write_text(json.dumps(configure_theme(json.loads(p.read_text())), ensure_ascii=False, indent=2) + '\n')
