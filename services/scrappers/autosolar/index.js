const puppeteer = require('puppeteer');
const { sendToDatabase } = require('../../../utils/db');
const axios = require('axios');

// Lista de User-Agents para rotar
const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/91.0.864.59 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
];


async function autosolarMain() {
    // Check the IP address
    await ipcheckercall();

    try {
        const panels = await autosolarScrapper('https://autosolar.es/paneles-solares', 'panel');
        const inverters = await autosolarScrapper('https://autosolar.es/inversores', 'inverter');
        const batteries = await autosolarScrapper('https://autosolar.es/baterias', 'battery');
        const car_chargers = await autosolarScrapper('https://autosolar.es/cargador-coche-electrico', 'car_charger');
        const charge_regulators = await autosolarScrapper('https://autosolar.es/reguladores-de-carga', 'charge_regulator');
        const structures = await autosolarScrapper('https://autosolar.es/estructura-paneles-solares', 'structure');
        const kits = await autosolarScrapper('https://autosolar.es/kits-solares', 'kit');

        // Si hay algún producto sin type, aplicarlo
        if (panels.some(panel => !panel.product_type) || inverters.some(inverter => !inverter.product_type) || batteries.some(battery => !battery.product_type) || car_chargers.some(car_charger => !car_charger.product_type) || charge_regulators.some(charge_regulator => !charge_regulator.product_type) || structures.some(structure => !structure.product_type) || kits.some(kit => !kit.product_type)) {
            panels.forEach(panel => panel.product_type = 'panel');
            inverters.forEach(inverter => inverter.product_type = 'inverter');
            batteries.forEach(battery => battery.product_type = 'battery');
            car_chargers.forEach(car_charger => car_charger.product_type = 'car_charger');
            charge_regulators.forEach(charge_regulator => charge_regulator.product_type = 'charge_regulator');
            structures.forEach(structure => structure.product_type = 'structure');
            kits.forEach(kit => kit.product_type = 'kit');
        }

        const products = panels.concat(inverters, batteries, car_chargers, charge_regulators, structures, kits);

        console.log('TOTAL PRODUCTS RETRIEVED BY TYPE:', 'panels:', panels.length, 'inverters:', inverters.length, 'batteries:', batteries.length, 'car_chargers:', car_chargers.length, 'kits:', kits.length, 'charge_regulators:', charge_regulators.length, 'structures:', structures.length);

        console.log('Autosolar prices updated. Sending to database...');

        await sendToDatabase(products);
    } catch (error) {
        console.error('Error in autosolarMain', error);
    }
}

async function autosolarScrapper(url, product_type) {
    const products = [];
    let pageNum = 1;
    let isLastPage = false;
    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });

    while (!isLastPage) {
        const page = await browser.newPage();
        const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
        const proxy = proxies[Math.floor(Math.random() * proxies.length)];

        await page.setUserAgent(userAgent);
        await page.authenticate({username: 'user', password: 'pass'}); // Si el proxy requiere autenticación

        try {
            await page.goto(`${url}?page=${pageNum}`, { 
                waitUntil: 'networkidle2',
                timeout: 30000 // 30 segundos de timeout para la carga de la página
            });
        } catch (error) {
            console.error('Error loading page with proxy:', proxy, error);
            await page.close();
            // Retry with otro proxy
            continue;
        }

        for (let i = 1; ; i++) {
            // Wait 5 minutes for the page to load
            await page.waitForTimeout(300000); // 5 minutos
            // Si product_type es inverter, la xpath es diferente
            let productNameXPath;
            let productPriceXPath;
            if (product_type === 'inverter') {
                productNameXPath = `/html/body/main/div/div[2]/div[1]/div[${i}]/a/div[2]`;
                productNameXPath2 = `/html/body/main/div/div[2]/div[1]/div[${i}]/a/div[2]`;
                productUrlXpath = `/html/body/main/div/div[2]/div[1]/div[${i}]/a`;
                productUrlXpath2 = `/html/body/main/div/div[2]/div[1]/div[${i}]/a`;
                productPriceXPath = `/html/body/main/div/div[2]/div[1]/div[${i}]/a/div[1]/div[2]`;
                productPriceFallbackXPath = `/html/body/main/div/div[2]/div[1]/div[${i}]/a/div[1]`;
                productPriceFallbackXPath2 = `/html/body/main/div/div[2]/div[1]/div[${i}]/a/div[1]/div[1]`;
                productPriceFallbackXPath3 = `/html/body/main/div/div[2]/div[1]/div[${i}]/a/div[2]`;
                productPriceFallbackXPath4 = `/html/body/main/div/div[2]/div[1]/div[${i+1}]/a/div[1]/div[1]`;
                productPriceFallbackXPath5 = `/html/body/main/div/div[3]/div[1]/div[${i}]/a/div[1]/div[2]`;
            } else {
                productNameXPath = `/html/body/main/div/div[3]/div[1]/div[${i}]/a/div[2]`;
                productNameXPath2 = `/html/body/main/div/div[2]/div[1]/div[${i}]/a/div[2]`;
                productUrlXpath = `/html/body/main/div/div[3]/div[1]/div[${i}]/a`;
                productUrlXpath2 = `/html/body/main/div/div[2]/div[1]/div[${i}]/a`;
                productPriceXPath = `/html/body/main/div/div[3]/div[1]/div[${i}]/a/div[1]/div[2]`;
                productPriceXPath2 = `/html/body/main/div/div[2]/div[1]/div[${i}]/a/div[1]/div[2]`;
                productPriceFallbackXPath = `/html/body/main/div/div[3]/div[1]/div[${i}]/a/div[1]/div`;
                productPriceFallbackXPath2 = `/html/body/main/div/div[3]/div[1]/div[${i}]/a/div[1]/div[1]`;
                productPriceFallbackXPath3 = `/html/body/main/div/div[3]/div[1]/div[${i}]/a/div[2]`;
                productPriceFallbackXPath4 = `/html/body/main/div/div[3]/div[1]/div[${i+1}]/a/div[1]/div[1]`;
                productPriceFallbackXPath5 = `/html/body/main/div/div[3]/div[1]/div[${i}]/a/div[1]/div[2]`;
                productPriceFallbackXPathExtra2 = `/html/body/main/div/div[2]/div[1]/div[${i}]/a/div[1]/div[1]`;
                productPriceFallbackXPathExtra3 = `/html/body/main/div/div[2]/div[1]/div[${i}]/a/div[2]`;
                productPriceFallbackXPathExtra4 = `/html/body/main/div/div[2]/div[1]/div[${i+1}]/a/div[1]/div[1]`;
                productPriceFallbackXPathExtra5 = `/html/body/main/div/div[2]/div[1]/div[${i}]/a/div[1]/div[2]`;
            }

            let product_name = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent : null;
            }, productNameXPath);

            if (!product_name) {
                product_name = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }, productNameXPath2);
            }

            if (product_name === null && i === 1) {
                isLastPage = true;
                break;
            } else if (product_name === null) {
                break;
            }

            let product_price = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent : null;
            }, productPriceXPath);

            if (!product_price) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }, productPriceFallbackXPath);
            }

            if (!product_price) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }, productPriceFallbackXPath2);
            }

            if (!product_price) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }, productPriceFallbackXPath3);
            }

            if (!product_price) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }, productPriceFallbackXPath4);
            }

            if (!product_price) {
                product_price = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent : null;
                }, productPriceFallbackXPath5);
            }

            // Si no hay símbolo de Euro en el precio, redefinir usando XPaths de fallback
            if (product_price && !product_price.includes('€')) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }, productPriceFallbackXPath2);
            }

            if (!product_price) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }, productPriceXPath2);
            }

            if (!product_price) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }, productPriceFallbackXPathExtra2);
            }

            if (!product_price) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }, productPriceFallbackXPathExtra3);
            }

            if (!product_price) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }, productPriceFallbackXPathExtra4);
            }

            if (!product_price) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }, productPriceFallbackXPathExtra5);
            }

            let product_url = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.href : null;
            }, productUrlXpath);  

            if (!product_url) {
                product_url = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.href : null;
                }, productUrlXpath2);
            }
            
            console.log('Product:', product_name, 'Price:', product_price, 'URL:', product_url);

            if (product_name === null) {
                isLastPage = true;
                break;
            } else {
                // Limpiar nombre del producto
                const listaPalabrasEliminar = [
                    'Inversor',
                    'Hibrido',
                    'Híbrido',
                    'Batería',
                    'Bateria',
                    'Litio',
                    'Ion',
                    '(HC)',
                ];
                for (const palabra of listaPalabrasEliminar) {
                    product_name = product_name.replace(palabra, '');
                }
                product_name = product_name.replace(/(Inversor|Panel|Bateria|Regulador|Cargador|Kit|Estructura|Bomba|Solar|Fotovoltaico|Placa|Fotovoltaica)/gi, '').trim();
                product_name = product_name.trim();

                products.push({ product_name, product_price, product_url });

                // Añadir detalles adicionales al producto
                for (const product of products) {
                    product.product_store = 'autosolar';
                    product.product_type = product_type;
                    if (typeof product.product_price === 'string') {
                        product.product_price = parseFloat(product.product_price.replace('€', '').replace('.', '').replace(',', '.'));
                    }
                }
            }
        }

        if (!isLastPage) {
            pageNum++;
        }

        await page.close();
        // Esperar un tiempo aleatorio entre solicitudes para evitar detección de scraping
        await new Promise(resolve => setTimeout(resolve, Math.random() * (60000 - 30000) + 30000));
    }
    await browser.close();
    return products;
}

// Tiempo máximo para intentar el proxy antes de pasar al siguiente (en milisegundos)
const maxRetryTime = 30000;

async function ipcheckercall() {
    let attempts = 0;
    const maxAttempts = proxies.length; // Intentar con todos los proxies disponibles
    let success = false;

    while (attempts < maxAttempts && !success) {

        attempts++;

        try {
            const response = await axios.get('https://api.bigdatacloud.net/data/client-ip', {
                timeout: maxRetryTime // Tiempo máximo de espera para una respuesta
            });

            console.log('IP Check response:', response.data);
            success = true;
        } catch (error) {
            // Esperar antes de intentar con otro proxy
            await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5 segundos
        }
    }

    if (!success) {
        console.error('Failed to get a valid response from all proxies');
    }
}

module.exports = autosolarMain;
