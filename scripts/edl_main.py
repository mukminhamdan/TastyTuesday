"""Edit decision list: main cooking video (cooking-only cut)."""

# EDIT DECISION LIST
# voice: (src_in, src_out, caption text) — caption text is hand-corrected
# shots: dict(src, dur | None (fills), speed, sync=True to lock to voice[i])
# ----------------------------------------------------------------------------
BEATS = [
    # Cooking-only cut (v2): no talking-head shots, voice only as VO over food.
    dict(id="hook", pre=0.9, lead=0.0, tail=0.45,
         voice=[(738.55, 739.98, "Tak payah|nak tukar bekas")],
         shots=[dict(src=1920.6, dur=1.6, speed=0.8, zoom=1.4, origin="85% 95%"),
                dict(src=1690.0, dur=None, speed=1.2)]),
    dict(id="s1", pre=4.0, lead=0.0, tail=0.0, voice=[],          # goreng ikan (Aircrisp)
         shots=[dict(src=1096.0, dur=1.3, speed=3.0, label="3x"),
                dict(src=1200.0, dur=1.2, speed=4.0, label="4x"),
                dict(src=1181.0, dur=None, speed=1.3)]),
    dict(id="s2", pre=2.0, lead=0.0, tail=0.0, voice=[],          # ketepikan ikan
         shots=[dict(src=1255.5, dur=None, speed=1.4)]),
    dict(id="s3", pre=1.8, lead=0.0, tail=0.0, voice=[],          # masukkan minyak
         shots=[dict(src=1270.9, dur=None, speed=1.0)]),
    dict(id="s4", pre=3.2, lead=0.0, tail=0.0, voice=[],          # ibu sambal
         shots=[dict(src=1325.0, dur=1.6, speed=1.6),
                dict(src=1341.0, dur=None, speed=3.0, label="3x")]),
    dict(id="s5", pre=0.0, lead=0.15, tail=0.35,                 # jintan putih
         voice=[(596.60, 598.00, "Yang beza ni,|jintan")],
         shots=[dict(src=1358.3, dur=None, speed=1.0)]),
    dict(id="s6", pre=0.0, lead=0.15, tail=0.3,                  # kicap sikit
         voice=[(598.20, 600.80, "Taruk kicap sikit,|nanti jadi sambal")],
         shots=[dict(src=1454.3, dur=1.7, speed=1.0),
                dict(src=1498.0, dur=None, speed=1.5)]),
    dict(id="s7", pre=2.6, lead=0.0, tail=0.4,                   # gaul dengan ikan
         voice=[(600.85, 602.35, "Sambal hitam")],
         shots=[dict(src=1484.0, dur=1.3, speed=1.5),
                dict(src=1512.0, dur=1.2, speed=2.0),
                dict(src=1560.0, dur=None, speed=2.0)]),
    dict(id="s8", pre=2.6, lead=0.0, tail=0.0, voice=[],          # tutup, biar meresap
         shots=[dict(src=1636.0, dur=1.1, speed=4.0, label="4x"),
                dict(src=1692.0, dur=None, speed=1.0)]),
    dict(id="end", pre=0.0, lead=0.1, tail=3.6,
         voice=[(1813.45, 1814.25, "Siap!")],
         shots=[dict(src=1812.8, voice=0, speed=1.0),
                dict(src=1920.4, dur=None, speed=0.75, zoom=1.4, origin="85% 95%")]),
]
