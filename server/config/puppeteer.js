const chromeOptions =
{
    headless:true,
    slowMo:18,
    defaultViewport: null,
    args: ['--no-sandbox'],
    ignoreDefaultArgs: ["--disable-extensions"],
    executablePath: '/usr/bin/google-chrome-stable',
  };

module.exports = chromeOptions;