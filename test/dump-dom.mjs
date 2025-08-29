import puppeteer from 'puppeteer';
import os from 'os';

let browserInstance = null;

/**
 * dumps the DOM content from a given URL using the specified browser
 * @param {string} url - The URL to navigate to and dump DOM from
 * @param {string} browser - The browser to use ('chrome' or 'firefox')
 * @returns {Promise<string>} - The DOM content as a string
 */
export async function dumpDOM(url, browser = 'firefox') {
  let page;
  
  try {
    const browserInstance = await getBrowserInstance(browser);
    page = await browserInstance.newPage();

    await page.setViewport({ width: 1440, height: 900 });

    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 5 * 1000,
    });

    // await new Promise(resolve => setTimeout(resolve, 2000));

    return await page.content();

  } catch (error) {
    console.error(`error during ${browser} DOM dump:`, error);
    throw error;
  } finally {
    if (page) {
      await page.close();
    }
  }
}

async function getBrowserInstance(browser) {
  if (!browserInstance) {
    const launchOptions = {
      headless: true,
      browser: browser
    };

    if (browser === 'firefox') {
      if (os.platform() === 'darwin') {
        launchOptions.executablePath = '/Applications/Firefox.app/Contents/MacOS/firefox';
      }
    } else if (browser === 'chrome') {
      if (os.platform() === 'darwin') {
        launchOptions.executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      }
    } else {
      throw new Error(`unsupported browser: ${browser}. supported browsers: firefox, chrome`);
    }

    browserInstance = await puppeteer.launch(launchOptions);
  }

  return browserInstance;
}

export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}