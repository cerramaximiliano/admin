const chromeOptions =
{
    headless:true,
    slowMo:18,
    defaultViewport: null,
    args: ['--no-sandbox'],
    ignoreDefaultArgs: ["--disable-extensions"],
  };

module.exports = chromeOptions;