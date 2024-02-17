const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');
const { DEV_DB } = process.env;
const mongodb = require('mongodb');
const { send } = require('process');
const { sendToDatabase } = require('../../../utils/db');



async function autosolarMain() {
    try {
        const panels = await autosolarScrapper('https://autosolar.es/paneles-solares', 'panel');
        const inverters = await autosolarScrapper('https://autosolar.es/inversores', 'inverter');
        const batteries = await autosolarScrapper('https://autosolar.es/baterias', 'battery');
        const car_chargers = await autosolarScrapper('https://autosolar.es/cargador-coche-electrico', 'car_charger');
        const charge_regulators = await autosolarScrapper('https://autosolar.es/reguladores-de-carga', 'charge_regulator');
        const structures = await autosolarScrapper('https://autosolar.es/estructura-paneles-solares', 'structure');
        const kits = await autosolarScrapper('https://autosolar.es/kits-solares', 'kit');

        // Si hay algun panel inverter o batería sin type aplicarlo a todos los productos con su product_type correspondiente
        if (panels.some(panel => !panel.product_type) || inverters.some(inverter => !inverter.product_type) || batteries.some(battery => !battery.product_type) || car_chargers.some(car_charger => !car_charger.product_type) || charge_regulators.some(charge_regulator => !charge_regulator.product_type) || structures.some(structure => !structure.product_type) || kits.some(kit => !kit.product_type)) {
            panels.forEach(panel => panel.product_type = 'panel');
            inverters.forEach(inverter => inverter.product_type = 'inverter');
            batteries.forEach(battery => battery.product_type = 'battery');
            car_chargers.forEach(car_charger => car_charger.product_type = 'car_charger');
            charge_regulators.forEach(charge_regulator => charge_regulator.product_type = 'charge_regulator');
            structures.forEach(structure => structure.product_type = 'structure');
            kits.forEach(kit => kit.product_type = 'kit');
        }



        const products = panels.concat(inverters, batteries, car_chargers, charge_regulators,structures, kits);

        console.log('Autosolar prices updated. Sending to database...')

        await sendToDatabase(products);
    } catch (error) {
        console.error('Error in autosolarMain', error);
    }
}

async function autosolarScrapper(url, product_type) {

    const products = [];

    let pageNum = 1;
    let isLastPage = false;
    const browser = await puppeteer.launch();

    while (!isLastPage) {
        const page = await browser.newPage();
        await page.goto(`${url}?page=${pageNum}`);

        for (let i = 1; ; i++) {
            // If product_type is inverter, the xpath is different
            let productNameXPath;
            let productPriceXPath;
            if (product_type === 'inverter') {
                productNameXPath =          `/html/body/main/div/div[2]/div[1]/div[${i}]/a/div[2]`;
                productPriceXPath =         `/html/body/main/div/div[2]/div[1]/div[${i}]/a/div[1]/div[2]`;
                productPriceFallbackXPath = `/html/body/main/div/div[2]/div[1]/div[${i}]/a/div[1]`;
                productPriceFallbackXPath2 = `/html/body/main/div/div[2]/div[1]/div[${i}]/a/div[1]/div[1]`;
                productPriceFallbackXPath3 = `/html/body/main/div/div[2]/div[1]/div[${i}]/a/div[2]`;
                productPriceFallbackXPath4 = `/html/body/main/div/div[2]/div[1]/div[${i+1}]/a/div[1]/div[1]`;
                productPriceFallbackXPath5 = `/html/body/main/div/div[3]/div[1]/div[${i}]/a/div[1]/div[2]`;
            } else {
                productNameXPath =          `/html/body/main/div/div[3]/div[1]/div[${i}]/a/div[2]`;
                productPriceXPath =           `/html/body/main/div/div[3]/div[1]/div[${i}]/a/div[1]/div[2]`;
                productPriceFallbackXPath = `/html/body/main/div/div[3]/div[1]/div[${i}]/a/div[1]/div`;
                productPriceFallbackXPath2 = `/html/body/main/div/div[3]/div[1]/div[${i}]/a/div[1]/div[1]`;
                productPriceFallbackXPath3 = `/html/body/main/div/div[3]/div[1]/div[${i}]/a/div[2]`;
                productPriceFallbackXPath4 = `/html/body/main/div/div[3]/div[1]/div[${i+1}]/a/div[1]/div[1]`;
                productPriceFallbackXPath5 = `/html/body/main/div/div[3]/div[1]/div[${i}]/a/div[1]/div[2]`;

                
            }

            let product_name = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent : null;
            }, productNameXPath);

            if (product_name === null && i === 1) {
                isLastPage = true; // Si el nombre del producto es null y estamos en el primer producto de la página, marcamos que estamos en la última página
                break;
            } else if (product_name === null) {
                break; // Si el nombre del producto es null pero no estamos en el primer producto, simplemente hemos llegado al final de la página actual
            }
            

            let product_price = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent : null;
            }
            , productPriceXPath);

            if (!product_price) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }
                , productPriceFallbackXPath);
            }

            if (!product_price) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }
                , productPriceFallbackXPath2);
            }

            if (!product_price) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }
                , productPriceFallbackXPath3);
            }

            if (!product_price) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }
                , productPriceFallbackXPath4);
            }

            if (!product_price) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }
                , productPriceFallbackXPath5);
            }

            // Si hay un precio que no tiene un signo de euro se redefinira usando productPriceFallbackXPath2
            if (product_price && !product_price.includes('€')) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }
                , productPriceFallbackXPath2);
            }

            if (product_name === null) {
                isLastPage = true; // Si el nombre del producto es null, marcamos que estamos en la última página
                break;
            } else {

                
                products.push({ product_name, product_price });

                // Añadir a cada elemento de products el campo "product_store" con el valor "autosolar" y eliminar el signo de euro del precio y sea un integer pero manteniendo los decimales
                for (const product of products) {
                    product.product_store = 'autosolar';
                    product.product_type = product_type;
                    if (typeof product.product_price === 'string') {
                        product.product_price = parseFloat(product.product_price.replace('€', '').replace('.', '').replace(',', '.'));
                    }

                    // Si queda cualquier producto sin product_type, asignarle el valor correspondiente
                    if (!product.product_type) {
                        product.product_type = product_type;
                    }
                }
            }
        }

        if (!isLastPage) {
            pageNum++;
        }

        await page.close();
    }
    await browser.close();
    return products;
}

module.exports = autosolarMain;