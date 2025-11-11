import puppeteer, { type Browser, type LaunchOptions } from 'puppeteer';

const baseArgs = ['--no-sandbox', '--disable-setuid-sandbox'];

if (process.env.PUPPETEER_ARGS) {
  baseArgs.push(
    ...process.env.PUPPETEER_ARGS.split(',')
      .map((arg) => arg.trim())
      .filter(Boolean),
  );
}

const headlessSetting = process.env.PUPPETEER_HEADLESS === 'false' ? false : 'new';

const defaultLaunchOptions: LaunchOptions = {
  headless: headlessSetting,
  args: baseArgs,
};

if (process.env.PUPPETEER_EXECUTABLE_PATH) {
  defaultLaunchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
}

let browserPromise: Promise<Browser> | null = null;

export const getBrowser = async (): Promise<Browser> => {
  if (!browserPromise) {
    browserPromise = puppeteer.launch(defaultLaunchOptions).catch((error) => {
      browserPromise = null;
      throw error;
    });
  }

  return browserPromise;
};

export const closeBrowser = async (): Promise<void> => {
  if (!browserPromise) {
    return;
  }

  try {
    const browser = await browserPromise;
    await browser.close();
  } finally {
    browserPromise = null;
  }
};

export const getLaunchOptions = (): LaunchOptions => ({ ...defaultLaunchOptions });
