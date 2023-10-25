const chromeOptions =
{
    headless:true,
    slowMo:18,
    defaultViewport: null,
    args: ['--no-sandbox'],
    ignoreDefaultArgs: ["--disable-extensions"],
    // executablePath: '/admin/node_modules/puppeteer/.local-chromium/linux-982053/chrome-linux/chrome',
  };

module.exports = chromeOptions;