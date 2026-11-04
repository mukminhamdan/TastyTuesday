import {Config} from '@remotion/cli/config';
Config.setVideoImageFormat('jpeg');
Config.setConcurrency(4);
Config.setOffthreadVideoCacheSizeInBytes(1024 * 1024 * 1024);
// use the machine's Chromium (no download)
Config.setBrowserExecutable(process.env.REMOTION_CHROME ?? '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell');
Config.setChromiumOpenGlRenderer('swangle');
