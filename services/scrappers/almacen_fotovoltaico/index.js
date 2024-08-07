const puppeteer = require('puppeteer');
const { sendToDatabase } = require('../../../utils/db');

async function almacenFotovoltaicoMain() {
    const panels = await almacenFotovoltaicoScrapper('https://elalmacenfotovoltaico.com/22-paneles-solares', 'panel');
    const inverters = await almacenFotovoltaicoScrapper('https://elalmacenfotovoltaico.com/23-inversores-solares', 'inverter');
    const batteries = await almacenFotovoltaicoScrapper('https://elalmacenfotovoltaico.com/26-baterias-solares', 'battery');
    const kits = await almacenFotovoltaicoScrapper('https://elalmacenfotovoltaico.com/21-kit-solar', 'kit');
    const structures = await almacenFotovoltaicoScrapper('https://elalmacenfotovoltaico.com/24-estructuras-solares', 'structure');
    const car_chargers = await almacenFotovoltaicoScrapper('https://elalmacenfotovoltaico.com/68-cargadores-coche-electrico', 'car_charger');
    const pumping_systems = await almacenFotovoltaicoScrapper('https://elalmacenfotovoltaico.com/74-bombeo-solar', 'pumping_system');


    const products = panels.concat(inverters, batteries, kits, structures, car_chargers, pumping_systems);
    console.log('TOTAL PRODUCTS RETRIEVED BY TYPE:', 'panels:', panels.length, 'inverters:', inverters.length, 'batteries:', batteries.length, 'kits:', kits.length, 'structures:', structures.length, 'car_chargers:', car_chargers.length, 'pumping_systems:', pumping_systems.length);
    console.log('AlmacenFotovoltaico prices updated. Sending to database...')
    await sendToDatabase(products);

}

async function almacenFotovoltaicoScrapper(url, product_type) {
    
    try {
        let pageNum = 1;
        let products = [];
        // No sandbox mode to avoid issues with the browser
        const browser = await puppeteer.launch({ ignoreHTTPSErrors: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();

        while (true) {
            await page.goto(`${url}?page=${pageNum}`);

            let i = 1;
            let foundProductsOnPage = false;

            while (true) {
                const product_name_xpath    = `/html/body/main/section/div/div/div[2]/section/section/div[3]/div/div[1]/div/div/div[${i}]/article/div/div[2]/h5/a`;
                const product_price_xpath   = `/html/body/main/section/div/div/div[2]/section/section/div[3]/div/div[1]/div/div/div[${i}]/article/div/div[2]/div[2]/span[2]/span[2]`;
                const product_price_2_xpath = `/html/body/main/section/div/div/div[2]/section/section/div[3]/div/div[1]/div/div/div[${i}]/article/div/div[2]/div[2]/span/span[2]`;
                const product_name_inner_xpath = `/html/body/main/section/div/div/div/section/div/div[2]/h1`;

                let product_name;

                const product_name_fake = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }, product_name_xpath);

                // Process product data
                let product_url = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.href : null;
                }, product_name_xpath);
                

                // Navigate to product url to obtain full name 
                if(product_url !== null) {
                    try {
                        await page.goto(product_url);
                        product_name = await page.evaluate((xpath) => {
                            const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                            return element ? element.textContent : null;
                        }
                        , product_name_inner_xpath);

                        // Navigate back to the main page
                        try {
                            await page.goBack(); 
                        } catch (error) {
                            console.error('Error navigating back to main page', error);
                        }
                    } catch (error) {
                        console.error('Error navigating to product url', error);
                        continue;
                    }   
                } else {
                    product_name = product_name_fake;
                }

                let product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }, product_price_xpath);

                if (product_price === null) {
                    product_price = await page.evaluate((xpath) => {
                        const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        return element ? element.textContent : null;
                    }, product_price_2_xpath);
                }

                if (product_name === null && i === 1) {
                    // No products on this page
                    break;
                } else if (product_name === null) {
                    // Reached the end of the current page
                    foundProductsOnPage = true;
                    break;
                }

                if (typeof product_price === 'string') {
                    product_price = parseFloat(product_price.replace('€', '').replace('.', '').replace(',', '.'));
                }

                // Eliminar palabras que no sean el modelo y codigos de producto en el nombre del producto y eliminar espacios al principio y al final , cualquier palabra que este en el diccionario español : Inversor, Panel, Bateria, Regulador, Cargador, Kit, Estructura, Bomba, Solar, Fotovoltaico, Placa
                product_name = product_name.replace(/(Inversor|Panel|Bateria|Regulador|Cargador|Kit|Estructura|Bomba|Solar|Fotovoltaico|Placa|Fotovoltaica|Años|de|Garantía)/gi, '').trim();

                // Eliminar espacios al principio y al final
                product_name = product_name.trim();

                products.push({ product_name, product_price, product_url, product_store: 'almacen_fotovoltaico', product_type });

                i++;
            }

            if (!foundProductsOnPage) {
                break;
            }

            pageNum++;
        }

        await browser.close();
        return products;
    } catch (error) {
        console.error('Error in almacenFotovoltaicoScrapper', error);
    }
}

module.exports = almacenFotovoltaicoMain;
