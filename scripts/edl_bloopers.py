"""Edit decision list: bloopers (face + live-stream moments)."""

FACE = "70% 42%"

BEATS = [
    # hook: the punchline first — cooking video with no face… then smash to the face
    dict(id="hook", lead=0.15, tail=0.05,
         voice=[(1815.40, 1818.75, "Sorry, siapa yang|tak dapat tengok muka tu")],
         shots=[dict(src=1815.4 - 0.15, voice=0, speed=1.0)]),
    dict(id="reveal", pre=1.5, lead=0.0, tail=0.0, voice=[],
         shots=[dict(src=790.3, dur=None, speed=0.9, zoom=1.12, origin="88% 55%")]),
    # camera chaos while setting up the live
    dict(id="cam", pre=2.6, lead=0.05, tail=0.35,
         voice=[(358.45, 359.40, "Tak ada bunyi pun?")],
         shots=[dict(src=320.0, dur=1.3, speed=3.0, label="3x"),
                dict(src=364.0, dur=1.3, speed=3.0, label="3x"),
                dict(sync=0)]),
    dict(id="tv", lead=0.05, tail=0.3,
         voice=[(381.55, 382.30, "Bunyi suara orang?"),
                (382.20, 384.95, "Oh, ada anak buah|kat rumah ni|tengah tengok TV")],
         shots=[dict(sync=0), dict(sync=1)]),
    # reading live comments
    dict(id="komen", lead=0.1, tail=0.3,
         voice=[(486.80, 488.95, "Eh, orang dekat ofis.|TikTok ke?"),
                (507.35, 508.55, "Auni balik dah ke?"),
                (509.95, 511.05, "Oh, nak balik dah")],
         shots=[dict(sync=0), dict(sync=1), dict(sync=2)]),
    # take 1 / take 2
    dict(id="take", lead=0.1, tail=0.3,
         voice=[(716.95, 719.25, "Masak guna apa tu ni?"),
                (720.00, 722.85, "Masak guna apa ni?|Food Engine Cooven")],
         shots=[dict(sync=0), dict(sync=1)]),
    # said it twice
    dict(id="ulang", lead=0.1, tail=0.3,
         voice=[(778.30, 781.30, "Senang, tak payah|nak tukar bekas"),
                (783.65, 785.60, "Senang, tak payah|tukar bekas")],
         shots=[dict(sync=0), dict(sync=1)]),
    dict(id="salam", lead=0.1, tail=0.3,
         voice=[(955.05, 956.72, "Assalamualaikum, Anas.|Pulang balik.")],
         shots=[dict(sync=0)]),
    dict(id="hello", lead=0.1, tail=0.3,
         voice=[(1540.95, 1543.35, "Hello, siapa yang|ada kat dalam ni?")],
         shots=[dict(sync=0)]),
    dict(id="outro", lead=0.1, tail=2.6,
         voice=[(1937.85, 1941.00, "Sambung dah balik.|Nak solat")],
         shots=[dict(sync=0),
                dict(src=892.0, dur=None, speed=0.8, zoom=1.08, origin="92% 55%")]),
]
