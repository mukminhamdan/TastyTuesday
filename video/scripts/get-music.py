"""Pull the selected CC0 tracks out of mrfakename/cc0-music-captioned (parquet shards)."""
import os, subprocess, fsspec, pyarrow.parquet as pq
os.environ.setdefault("SSL_CERT_FILE", "/etc/ssl/certs/ca-certificates.crt")
BASE = "https://huggingface.co/datasets/mrfakename/cc0-music-captioned/resolve/main/data/train-%05d-of-00591.parquet"
# (shard, row) -> output name.  Captions are from the dataset.
TRACKS = {
    (3, 5): "pizza",       # "A funky instrumental track perfect for a sunny day."
    (80, 2): "mee",        # "A groovy, upbeat hip-hop track with a vintage vibe."
    (31, 1): "telur",      # "Positive instrumental tune featuring ukulele, whistling, and percussion"
    (36, 11): "alt-funk",  # "A funky, upbeat instrumental track featuring guitar, bass, and drums."
    (110, 12): "alt-lofi", # "Old-school vinyl crackles and a lo-fi hip-hop beat."
}
fs = fsspec.filesystem("https", client_kwargs={"trust_env": True})
for (shard, row), name in TRACKS.items():
    t = pq.ParquetFile(fs.open(BASE % shard, block_size=2**24)).read_row_group(0, columns=["audio"])
    raw = f"/tmp/{name}.src"
    open(raw, "wb").write(t.column("audio")[row].as_py()["bytes"])
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", raw, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
                    "-ar", "48000", "-ac", "2", f"public/music/{name}.wav"], check=True)
    print("music:", name)
