// Modificaciones para mejorar la navegación en CPACFScraper

/**
 * Espera un tiempo aleatorio para simular comportamiento humano
 * @param {number} min - Tiempo mínimo en ms
 * @param {number} max - Tiempo máximo en ms
 * @returns {Promise<void>}
 */
const waitRandom = async (min = 1000, max = 3000) => {
    const delay = Math.floor(Math.random() * (max - min + 1) + min);
    await new Promise(resolve => setTimeout(resolve, delay));
  };
  
  /**
   * Realiza una escritura más humana, con pausas entre teclas
   * @param {Page} page - Instancia de la página de Puppeteer
   * @param {string} selector - Selector del elemento donde escribir
   * @param {string} text - Texto a escribir
   */
  const typeHuman = async (page, selector, text) => {
    // Primero haz clic en el elemento para asegurar que tiene el foco
    await page.click(selector);
    
    // Pequeña pausa después de hacer clic
    await waitRandom(300, 800);
    
    // Limpia el campo primero
    await page.evaluate((sel) => {
      document.querySelector(sel).value = '';
    }, selector);
    
    // Escribe el texto caracter por caracter con pausas aleatorias
    for (let i = 0; i < text.length; i++) {
      await page.type(selector, text[i], { delay: Math.floor(Math.random() * 150) + 50 });
      await waitRandom(10, 100);
    }
  };
  
  
  module.exports = {
    waitRandom,
    typeHuman,
  };