const puppeteer = require('puppeteer');
const { sendToDatabase } = require('../../../utils/db');

async function atersaMain() {
    const panels = await atersaScrapper('https://atersa.shop/paneles-solares-fotovoltaicos/', 'panel');
    const inverters = await atersaScrapper('https://atersa.shop/inversores-solares/', 'inverter');
    const batteries = await atersaScrapper('https://atersa.shop/baterias-solares/', 'battery');
    const car_chargers = await atersaScrapper('https://atersa.shop/cargadores-coche-electrico/', 'car_charger');
    const kits = await atersaScrapper('https://atersa.shop/kits-solares-fotovoltaicos/', 'kit');
    const mppt_regulators = await atersaScrapper('https://atersa.shop/reguladores-de-carga-mppt/', 'mppt_regulator');
    const pwm_regulators = await atersaScrapper('https://atersa.shop/reguladores-de-carga-pwm/', 'pwm_regulator');
    
    const charge_regulators = mppt_regulators.concat(pwm_regulators).map(charge_regulator => {
        charge_regulator.product_type = 'charge_regulator';
        return charge_regulator;
    });
    
    const structures = await atersaScrapper('https://atersa.shop/estructuras-soporte-paneles-solares/', 'structure');
    const pumping_systems = await atersaScrapper('https://atersa.shop/sistemas-de-bombeo/', 'pumping_system');

    const products = panels.concat(inverters, batteries, car_chargers, kits, charge_regulators, structures, pumping_systems);

    console.log('TOTAL PRODUCTS RETRIEVED BY TYPE:', 'panels:', panels.length, 'inverters:', inverters.length, 'batteries:', batteries.length, 'car_chargers:', car_chargers.length, 'kits:', kits.length, 'charge_regulators:', charge_regulators.length, 'structures:', structures.length, 'pumping_systems:', pumping_systems.length);

    console.log('Atersa prices updated. Sending to database...');

    await sendToDatabase(products);
}

async function atersaScrapper(url, product_type) {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        protocolTimeout: 450000 // 45 segundos
    });

    try {
        const page = await browser.newPage();
        console.log(`Navigating to ${url}`);
        
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (req.resourceType() === 'image' || req.resourceType() === 'stylesheet' || req.resourceType() === 'font') {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }); // 60 segundos

        let i = 1;
        let products = [];
        while (true) {
            const product_name_xpath =              `/html/body/div[3]/div[2]/div[3]/main/div[2]/div/div[2]/ul/div/div[${i}]/div/a[2]/h3`;
            const product_name_xpath_fallback =     `/html/body/div[3]/div[2]/div[3]/main/div[2]/div/div[2]/ul[2]/div/div[${i}]/div/a[2]/h3`;
            const product_name_xpath_fallback_2 =   `/html/body/div[2]/div[2]/div[3]/main/div[2]/div/div[2]/ul[2]/div/div[${i}]/div/a[2]/h3`;
            const product_name_xpath_fallback_3 =   `/html/body/div[2]/div[2]/div[3]/main/div[2]/div/div[2]/ul/div/div[${i}]/div/a[2]/h3`;
            const product_price_xpath =             `/html/body/div[3]/div[2]/div[3]/main/div[2]/div/div[2]/ul[2]/div/div[${i}]/div/div[1]/ins/span/bdi`;
            const product_price_xpath_fallback =    `/html/body/div[3]/div[2]/div[3]/main/div[2]/div/div[2]/ul[2]/div/div[${i}]/div/div[1]/span/bdi`;
            const product_price_xpath_fallback_2 =  `/html/body/div[3]/div[2]/div[3]/main/div[2]/div/div[2]/ul/div/div[${i}]/div/div[1]/span/bdi`;
            const product_price_xpath_fallback_3 =  `/html/body/div[3]/div[2]/div[3]/main/div[2]/div/div[2]/ul/div/div[${i}]/div/div[1]/ins/span/bdi`;
            const product_price_xpath_fallback_4 =  `/html/body/div[2]/div[2]/div[3]/main/div[2]/div/div[2]/ul[2]/div/div[${i}]/div/div[1]/ins/span/bdi`;
            const product_price_xpath_fallback_5 =  `/html/body/div[2]/div[2]/div[3]/main/div[2]/div/div[2]/ul[2]/div/div[${i}]/div/div[1]/span/bdi`;
            const product_price_xpath_fallback_6 =  `/html/body/div[2]/div[2]/div[3]/main/div[2]/div/div[2]/ul/div/div[${i}]/div/div[1]/span/bdi`;
            const product_price_xpath_fallback_7 =  `/html/body/div[2]/div[2]/div[3]/main/div[2]/div/div[2]/ul/div/div[${i}]/div/div[1]/ins/span/bdi`;
            
            let product_name = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent : null;
            }, product_name_xpath);

            if (!product_name) {
                product_name = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }, product_name_xpath_fallback);
            }

            if (!product_name) {
                product_name = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }, product_name_xpath_fallback_2);
            }

            if (!product_name) {
                product_name = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }, product_name_xpath_fallback_3);
            }

            let product_price = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent : null;
            }, product_price_xpath);

            if (!product_price) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }, product_price_xpath_fallback);
            }
            if (!product_price) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }, product_price_xpath_fallback_2);
            }
            if (!product_price) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }, product_price_xpath_fallback_3);
            }

            if (!product_price) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }, product_price_xpath_fallback_4);
            }

            if (!product_price) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }, product_price_xpath_fallback_5);
            }

            if (!product_price) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }, product_price_xpath_fallback_6);
            }

            if (!product_price) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }, product_price_xpath_fallback_7);
            }

            if (product_name && product_price) {
                let product = {
                    product_type,
                    product_name,
                    product_price
                };
                console.log(product);
                products.push(product);
                i++;
            } else {
                break;
            }
        }
        return products;
    } catch (error) {
        console.error(`Error scraping ${url}:`, error);
    } finally {
        await browser.close();
    }
}

module.exports = atersaMain;