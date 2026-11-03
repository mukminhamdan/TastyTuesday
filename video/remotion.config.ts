import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(88);
Config.setOverwriteOutput(true);
Config.setBrowserExecutable('/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell');
Config.setChromiumOpenGlRenderer('swangle');
Config.setOffthreadVideoCacheSizeInBytes(1024 * 1024 * 1024);
