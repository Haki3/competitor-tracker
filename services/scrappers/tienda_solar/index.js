const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');
const { DEV_DB } = process.env;
const mongodb = require('mongodb');
const { send } = require('process');
const { sendToDatabase } = require('../../../utils/db');

async function tiendaSolarMain() {
    const panels = await tiendaSolarScrapper('https://tienda-solar.es/es/1923-paneles-solares', 'panel');
    const inverters = await tiendaSolarScrapper('https://tienda-solar.es/es/1924-inversores-solares', 'inverter');
    const batteries = await tiendaSolarScrapper('https://tienda-solar.es/es/1895-baterias-placas-solares', 'battery');
    const car_chargers = await tiendaSolarScrapper('https://tienda-solar.es/es/1970-cargadores-electricos', 'car_charger');
    const kits = await tiendaSolarScrapper('https://tienda-solar.es/es/1922-kit-solar', 'kit');
    const charge_regulators = await tiendaSolarScrapper('https://tienda-solar.es/es/1925-regulador-solar', 'charge_regulator');
    const structures = await tiendaSolarScrapper('https://tienda-solar.es/es/1936-estructura-paneles-solares', 'structure');
    const pumping_systems = await tiendaSolarScrapper('https://tienda-solar.es/es/1974-bombeo-solar', 'pumping_system');

    const products = panels.concat(inverters, batteries, car_chargers, kits, charge_regulators, structures, pumping_systems);

    console.log('TiendaSolar prices updated. Sending to database...')
    await sendToDatabase(products);
}

async function tiendaSolarScrapper(url, product_type) {
    const products = [];

    let pageNum = 1;
    const browser = await puppeteer.launch();

    while (true) {
        const page = await browser.newPage();
        await page.goto(`${url}?page=${pageNum}`);

        let hasProducts = false;  // Variable para verificar si hay productos en la página actual

        for (let i = 1; ; i++) {
            const productNameXPath = `/html/body/main/section/div[2]/div/div[2]/section/section/div[3]/div/div[1]/div/div[${i}]/div/article/div/div[2]/h3/a`;
            const productPriceXPath = `/html/body/main/section/div[2]/div/div[2]/section/section/div[3]/div/div[1]/div/div[${i}]/div/article/div/div[2]/div[1]/div[1]/div/span`;

            let product_name = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent : null;
            }, productNameXPath);

            // Si no hay producto, salir del bucle y saltar a la siguiente página
            if (!product_name) {
                break;
            }



            let product_price = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent : null;
            }, productPriceXPath);

            products.push({ product_name, product_price, product_type, product_store: 'tienda_solar' });
            hasProducts = true;
        }

        await page.close();

        // Si no hay productos en la página, salir del bucle principal
        if (!hasProducts) {
            break;
        }

        pageNum++;
    }

    // Eliminar duplicados
    const uniqueProducts = products.filter(
        (product, index, self) =>
            index ===
            self.findIndex((p) => p.product_name === product.product_name && p.product_price === product.product_price)
    );

    // Añadir a cada elemento de uniqueProducts el campo "product_store" con el valor "Tienda Solar" y eliminar el signo de euro del precio y sea un integer pero manteniendo los decimales
    for (const product of uniqueProducts) {
        product.product_store = 'tienda_solar';
        product.product_type = product_type;
        if (typeof product.product_price === 'string') {
            product.product_price = parseFloat(product.product_price.replace('€', '').replace('.', '').replace(',', '.'));
        }

        // Si queda cualquier producto sin product_type, asignarle el valor correspondiente
        if (!product.product_type) {
            product.product_type = product_type;
        }
    }

    await browser.close();
    return uniqueProducts;
}



module.exports = tiendaSolarMain;