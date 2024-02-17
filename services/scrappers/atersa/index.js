const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');
const { DEV_DB } = process.env;
const mongodb = require('mongodb');
const { send } = require('process');
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

    console.log('Atersa prices updated. Sending to database...')

    await sendToDatabase(products);
}

async function atersaScrapper(url, product_type) {

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);

    let i = 1;
    let products = [];
    while (true) {
        const product_name_xpath =              `/html/body/div[2]/div[2]/div[3]/main/div[2]/div/div[2]/ul/div/div[${i}]/div/a[2]/h3`;
        const product_price_xpath =             `/html/body/div[2]/div[2]/div[3]/main/div[2]/div/div[2]/ul[2]/div/div[${i}]/div/div[1]/ins/span/bdi`;
        const product_price_xpath_fallback =    `/html/body/div[2]/div[2]/div[3]/main/div[2]/div/div[2]/ul[2]/div/div[${i}]/div/div[1]/span/bdi`;
        const product_price_xpath_fallback_2 =  `/html/body/div[2]/div[2]/div[3]/main/div[2]/div/div[2]/ul/div/div[${i}]/div/div[1]/span/bdi`;
        const product_price_xpath_fallback_3 =  `/html/body/div[2]/div[2]/div[3]/main/div[2]/div/div[2]/ul/div/div[${i}]/div/div[1]/ins/span/bdi`;
        
        const product_name = await page.evaluate((xpath) => {
            const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            return element ? element.textContent : null;
        }, product_name_xpath);

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
        

        if (!product_name) {
            break;
        }

        products.push({ product_name, product_price });

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

        return product;
    });

    await browser.close();
    return products;
}

module.exports = atersaMain;