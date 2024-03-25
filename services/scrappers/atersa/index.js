const puppeteer = require('puppeteer');
const { sendToDatabase } = require('../../../utils/db');

async function atersaMain() {
    const panels = await atersaScrapper('https://atersa.shop/paneles-solares-fotovoltaicos/', 'panel');
    const inverters = await atersaScrapper('https://atersa.shop/inversores-solares/', 'inverter');
    const batteries = await atersaScrapper('https://atersa.shop/baterias-solares/', 'battery');
    const car_chargers = await atersaScrapper('https://atersa.shop/cargadores-coche-electrico/', 'car_charger');
    const kits = await atersaScrapper('https://atersa.shop/kits-solares-fotovoltaicos/', 'kit');
    const charge_regulators = await atersaScrapper('https://atersa.shop/regulacion-y-control/', 'charge_regulator');
    const structures = await atersaScrapper('https://atersa.shop/estructuras-soporte-paneles-solares/', 'structure');
    const pumping_systems = await atersaScrapper('https://atersa.shop/sistemas-de-bombeo/', 'pumping_system');

    const products = panels.concat(inverters, batteries, car_chargers, kits, charge_regulators, structures, pumping_systems);

    console.log('TOTAL PRODUCTS RETRIEVED BY TYPE:', 'panels:', panels.length, 'inverters:', inverters.length, 'batteries:', batteries.length, 'car_chargers:', car_chargers.length, 'kits:', kits.length, 'charge_regulators:', charge_regulators.length, 'structures:', structures.length, 'pumping_systems:', pumping_systems.length);

    console.log('Atersa prices updated. Sending to database...')

    await sendToDatabase(products);
}

async function atersaScrapper(url, product_type) {
    // no sandbox mode to avoid issues with the browser
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto(url);

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
        const product_price_xpath_fallback_7 =   `/html/body/div[2]/div[2]/div[3]/main/div[2]/div/div[2]/ul/div/div[${i}]/div/div[1]/ins/span/bdi`;
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

        // Get the href linked to the product
        let product_url = await page.evaluate((i) => {
            const element = document.evaluate(`/html/body/div[3]/div[2]/div[3]/main/div[2]/div/div[2]/ul/div/div[${i}]/div/a[2]`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            return element ? element.href : null;
        }, i);
        
        if (!product_url) {
            product_url = await page.evaluate((i) => {
                const element = document.evaluate(`/html/body/div[3]/div[2]/div[3]/main/div[2]/div/div[2]/ul[2]/div/div[${i}]/div/a[2]`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.href : null;
            }
            , i);
        }

        if (!product_url) {
            product_url = await page.evaluate((i) => {
                const element = document.evaluate(`/html/body/div[2]/div[2]/div[3]/main/div[2]/div/div[2]/ul/div/div[${i}]/div/a[2]`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.href : null;
            }
            , i);
        }

        if (!product_url) {
            product_url = await page.evaluate((i) => {
                const element = document.evaluate(`/html/body/div[2]/div[2]/div[3]/main/div[2]/div/div[2]/ul[2]/div/div[${i}]/div/a[2]`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.href : null;
            }
            , i);
        }


        if (!product_name) {
            break;
        }

        products.push({ product_name, product_price, product_url });

        i++;
    }

    // Añadir a cada elemento de products el campo "product_store" con el valor "atersa" y eliminar el signo de euro del precio y eliminar el punto de los miles y las comas de los decimales y convertirlo a float
    products = products.map(product => {
        product.product_store = 'atersa';
        product.product_type = product_type;
        if (typeof product.product_price === 'string') {
            product.product_price = parseFloat(product.product_price.replace('€', '').replace('.', '').replace(',', '.'));
        }

        // Si queda cualquier producto sin product_type, asignarle el valor correspondiente
        if (!product.product_type) {
            product.product_type = product_type;
        }

        if (product.product_url) {
            product.product_url = product.product_url;
        }

        // Eliminar palabras que no sean el modelo y codigos de producto en el nombre del producto y eliminar espacios al principio y al final , cualquier palabra que este en el diccionario español : Inversor, Panel, Bateria, Regulador, Cargador, Kit, Estructura, Bomba, Solar, Fotovoltaico, Placa
        product.product_name = product.product_name.replace(/(Inversor|Panel|Bateria|Batería|Batería  |Regulador|Cargador|Kit|Estructura|Bomba|Solar|Fotovoltaico|Placa|Fotovoltaica)/gi, '').trim();

        // Eliminar espacios al principio y al final
        product.product_name = product.product_name.trim();  

        return product;
    });

    await browser.close();
    return products;
}

module.exports = atersaMain;