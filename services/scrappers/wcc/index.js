const puppeteer = require('puppeteer');
const { sendToDatabase } = require('../../../utils/db');

async function wccSolarMain() {
    const panels = await panelScrapper('https://www.wccsolar.net/paneles-solares', 'panel');
    const inverters = await inverterScrapper('https://www.wccsolar.net/inversor-solar', 'inverter');
    const batteries = await batterySolarScrapper('https://www.wccsolar.net/bateria-solar', 'battery');
    const kits = await kitsSolarScrapper('https://www.wccsolar.net/kit-solar', 'kit');
    const charge_regulators = await chargeRegulatorSolarScrapper('https://www.wccsolar.net/regulador-solar', 'charge_regulator');
    const structures = await structuresSolarScrapper('https://www.wccsolar.net/estructura-y-soporte-para-panel', 'structure');
    const pumping_systems = await pumpingSystemsSolarScrapper('https://www.wccsolar.net/bombas-de-agua-solar', 'pumping_system');

    const products = panels.concat(inverters, batteries, kits, charge_regulators, structures, pumping_systems);
    console.log('TOTAL PRODUCTS RETRIEVED BY TYPE:', 'panels:', panels.length, 'inverters:', inverters.length, 'batteries:', batteries.length, 'kits:', kits.length, 'charge_regulators:', charge_regulators.length, 'structures:', structures.length, 'pumping_systems:', pumping_systems.length);
    console.log('wccSolar prices updated. Sending to database...');

    await sendToDatabase(products);
}

async function panelScrapper(url, product_type) {
    const products = [];

    let pageNum = 1;
    const browser = await puppeteer.launch();

    while (true) {
        const page = await browser.newPage();
        await page.goto(`${url}?page=${pageNum}`);

        let hasProducts = false;  // Inicializar hasProducts en false

        for (let i = 1; ; i++) {
            const productNameXPath = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section/div[2]/div/div[3]/div/div/div/div/section/div/ul[1]/li[${i}]/div/div/div/a/div/div/div[1]/h3`;
            const productPriceXPath = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section[4]/div[2]/div/div[2]/div/div/div/div/section/div/ul/li[${i}]/div/div/div/a/div/div/div[2]/div/div/span[2]`;
            const innerProductPriceXPath = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section/div[2]/div/div[1]/div/div/article/div[1]/section[2]/div[5]/div/div/div/span[1]`
            const innerProductPriceXPath2 = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section/div[2]/div/div[1]/div/div/article/div[1]/section[2]/div[5]/div/div/div[2]/span[1]`;
            const productPriceXPath2 = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section/div[2]/div/div[3]/div/div/div/div/section/div/ul[1]/li[${i}]/div/div/div/a/div/div/div[2]/div/div/span[2]`;
            const productUrlXPath = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section/div[2]/div/div[3]/div/div/div/div/section/div/ul[1]/li[${i}]/div/div/div/a`;

            let product_name = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent.trim() : null;
            }, productNameXPath);

            let product_price = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent.trim() : null;
            }, productPriceXPath);

            if (product_price === null) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent.trim() : null;
                }, productPriceXPath2);
            }

            // Eliminar la palabra Desde del precio
            if (product_price != null && product_price.includes('Desde')) {
                product_price = product_price.replace('Desde', '');
            }

            let product_url = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.getAttribute('href') : null;
            }, productUrlXPath);

            if((product_price === null || product_price == undefined || product_price == '') && product_url) {
                // Navigate to the url of the product to get the price from the inner page using the innerProductPriceXPath2 first and if it fails, use the innerProductPriceXPath
                await page.goto(product_url);
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent.trim() : null;
                }, innerProductPriceXPath2);

                if (product_price === null) {
                    product_price = await page.evaluate((xpath) => {
                        const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        return element ? element.textContent.trim() : null;
                    }, innerProductPriceXPath);
                }

            }

            if(!product_name) {
                // Salir del bucle si no hay un nombre de producto
                break;
            }

            products.push({
                product_name,
                product_price,
                product_url,
            });

            hasProducts = true;  // Establecer hasProducts en true solo si encuentras un producto

        }
            if (!hasProducts) {
                break;
            }

            pageNum++;
    }

    // Añadir a cada elemento de products el campo "product_store" con el valor "wcc" y eliminar el signo de euro del precio y eliminar el punto de los miles y las comas de los decimales y convertirlo a float
    products.forEach(product => {
        product.product_store = 'wcc';
        product.product_type = product_type;
        if (typeof product.product_price === 'string') {
            product.product_price = parseFloat(product.product_price.replace('€', '').replace('.', '').replace(',', '.'));
        }

        //  Si queda cualquier producto sin product_type, asignarle el valor "wcc"
        if (!product.product_type) {
            product.product_type = 'wcc';
        }
    });

    await browser.close();
    return products;
}


async function inverterScrapper(url, product_type) {
    const products = [];

    let pageNum = 1;
    const browser = await puppeteer.launch();

    while (true) {
        const page = await browser.newPage();
        await page.goto(`${url}?page=${pageNum}`);

        let hasProducts = false;  // Inicializar hasProducts en false

        for (let i = 1; ; i++) {
            const productNameXPath = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section[4]/div[2]/div/div[2]/div/div/div/div/section/div/ul/li[${i}]/div/div/div/a/div/div/div[1]/h3`;
            const productPriceXPath = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section[4]/div[2]/div/div[2]/div/div/div/div/section/div/ul/li[${i}]/div/div/div/a/div/div/div[2]/div/div/span[2]`;
            const productPriceXPath2 = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section/div[2]/div/div[3]/div/div/div/div/section/div/ul[1]/li[${i}]/div/div/div/a/div/div/div[2]/div/div/span[2]`;
            const innerProductPriceXPath = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section/div[2]/div/div[1]/div/div/article/div[1]/section[2]/div[5]/div/div/div/span[1]`
            const innerProductPriceXPath2 = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section/div[2]/div/div[1]/div/div/article/div[1]/section[2]/div[5]/div/div/div[2]/span[1]`;
            const productUrlXPath = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section[4]/div[2]/div/div[2]/div/div/div/div/section/div/ul/li[${i}]/div/div/div/a`;

            let product_name = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent.trim() : null;
            }, productNameXPath);

            let product_price = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent.trim() : null;
            }, productPriceXPath);

            if (product_price === null) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent.trim() : null;
                }, productPriceXPath2);
            }

            // Eliminar la palabra Desde del precio
            if (product_price != null && product_price.includes('Desde')) {
                product_price = product_price.replace('Desde', '');
            }

            if (product_price === null) {
                product_price = 'Agotado';
            }

            let product_url = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.getAttribute('href') : null;
            }, productUrlXPath);

            if((product_price === null || product_price == undefined || product_price == '') && product_url) {
                console.log('Navigating to inner page...')
                // Navigate to the url of the product to get the price from the inner page using the innerProductPriceXPath2 first and if it fails, use the innerProductPriceXPath
                await page.goto(product_url);
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent.trim() : null;
                }, innerProductPriceXPath2);

                if (product_price === null) {
                    product_price = await page.evaluate((xpath) => {
                        const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        return element ? element.textContent.trim() : null;
                    }, innerProductPriceXPath);
                }

            }

            if (!product_name) {
                // Salir del bucle si no hay un nombre de producto
                break;
            }

            products.push({
                product_name,
                product_price,
                product_url,
            });

            hasProducts = true;  // Establecer hasProducts en true solo si encuentras un producto
        }

        if (!hasProducts) {
            break;
        }

        pageNum++;
    }

    // Añadir a cada elemento de products el campo "product_store" con el valor "wcc" y eliminar el signo de euro del precio y eliminar el punto de los miles y las comas de los decimales y convertirlo a float
    products.forEach(product => {
        product.product_store = 'wcc';
        product.product_type = product_type;
        if (typeof product.product_price === 'string') {
            product.product_price = parseFloat(product.product_price.replace('€', '').replace(',', '.'));
        }

        //  Si queda cualquier producto sin product_type, asignarle el valor "wcc"
        if (!product.product_type) {
            product.product_type = 'wcc';
        }
    });

    await browser.close();
    return products;
}

async function batterySolarScrapper(url, product_type) {
    const products = [];

    let pageNum = 1;
    const browser = await puppeteer.launch();

    while (true) {
        const page = await browser.newPage();
        await page.goto(`${url}?page=${pageNum}`);

        let hasProducts = false;  // Inicializar hasProducts en false

        for (let i = 1; ; i++) {
            const productNameXPath = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section[2]/div[2]/div/div[6]/div/div/div/div/section/div/ul/li[${i}]/div/div/div/a/div/div/div[1]/h3`;
            const productPriceXPath = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section[2]/div[2]/div/div[6]/div/div/div/div/section/div/ul/li[${i}]/div/div/div/a/div/div/div[2]/div/div/span[2]`;
            const innerProductPriceXPath = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section/div[2]/div/div[1]/div/div/article/div[1]/section[2]/div[5]/div/div/div/span[1]`
            const innerProductPriceXPath2 = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section/div[2]/div/div[1]/div/div/article/div[1]/section[2]/div[5]/div/div/div[2]/span[1]`;
            const productPriceXPath2 = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section/div[2]/div/div[6]/div/div/div/div/div/section/div/ul/li[${i}]/div/div/div/a/div/div/div[2]/div/div/span[2]`;
            const productUrlXPath = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section[2]/div[2]/div/div[6]/div/div/div/div/section/div/ul/li[${i}]/div/div/div/a`;

            let product_name = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent.trim() : null;
            }, productNameXPath);

            let product_price = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent.trim() : null;
            }, productPriceXPath);

            // Eliminar la palabra Desde del precio
            if (product_price != null && product_price.includes('Desde')) {
                product_price = product_price.replace('Desde', '');
            }

            if (product_price === null) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent.trim() : null;
                }, productPriceXPath2);
            }

            // Eliminar la palabra Desde del precio
            if (product_price != null && product_price.includes('Desde')) {
                product_price = product_price.replace('Desde', '');
            }

            if (product_price === null) {
                product_price = 'Agotado';
            }

            let product_url = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.getAttribute('href') : null;
            }, productUrlXPath);

            if((product_price === null || product_price == undefined || product_price == '') && product_url) {
                console.log('Navigating to inner page...')
                // Navigate to the url of the product to get the price from the inner page using the innerProductPriceXPath2 first and if it fails, use the innerProductPriceXPath
                await page.goto(product_url);
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent.trim() : null;
                }, innerProductPriceXPath2);

                if (product_price === null) {
                    product_price = await page.evaluate((xpath) => {
                        const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        return element ? element.textContent.trim() : null;
                    }, innerProductPriceXPath);
                }
            }

            if (!product_name) {
                // Salir del bucle si no hay un nombre de producto
                break;
            }

            products.push({
                product_name,
                product_price,
                product_url,
            });

            hasProducts = true;

        }

        if (!hasProducts) {
            break;
        }

        pageNum++;
    }

    // Añadir a cada elemento de products el campo "product_store" con el valor "wcc" y eliminar el signo de euro del precio y eliminar el punto de los miles y las comas de los decimales y convertirlo a float
    products.forEach(product => {
        product.product_store = 'wcc';
        product.product_type = product_type;
        if (typeof product.product_price === 'string') {
            product.product_price = parseFloat(product.product_price.replace('€', '').replace('.', '').replace(',', '.'));
        }

        //  Si queda cualquier producto sin product_type, asignarle el valor "wcc"
        if (!product.product_type) {
            product.product_type = 'wcc';
        }
    });

    await browser.close();
    return products;
}

async function kitsSolarScrapper(url, product_type) {
    const products = [];

    let pageNum = 1;
    const browser = await puppeteer.launch();

    while (true) {
        const page = await browser.newPage();
        await page.goto(`${url}?page=${pageNum}`);

        let hasProducts = false;  // Inicializar hasProducts en false

        for (let i = 1; ; i++) {
            const productNameXPath   =  `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section[4]/div[2]/div/div/div/div/div/div/section/div/ul/li[${i}]/div/div/div/a/div/div/div[1]/h3`;
            const productPriceXPath  = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section[4]/div[2]/div/div/div/div/div/div/section/div/ul/li[${i}]/div/div/div/a/div/div/div[2]/div/div/span[2]`;
            const innerProductPriceXPath = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section/div[2]/div/div[1]/div/div/article/div[1]/section[2]/div[5]/div/div/div/span[1]`
            const innerProductPriceXPath2 = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section/div[2]/div/div[1]/div/div/article/div[1]/section[2]/div[5]/div/div/div[2]/span[1]`;
            const productUrlXPath    =   `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section[4]/div[2]/div/div/div/div/div/div/section/div/ul/li[${i}]/div/div/div/a`;

            let product_name = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent.trim() : null;
            }, productNameXPath);

            let product_price = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent.trim() : null;
            }, productPriceXPath);

            // Eliminar la palabra Desde del precio
            if (product_price != null && product_price.includes('Desde')) {
                product_price = product_price.replace('Desde', '');
            }

            if (product_price === null) {
                product_price = 'Agotado';
            }

            let product_url = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.getAttribute('href') : null;
            }, productUrlXPath);

            if((product_price === null || product_price == undefined || product_price == '') && product_url) {
                console.log('Navigating to inner page...')
                // Navigate to the url of the product to get the price from the inner page using the innerProductPriceXPath2 first and if it fails, use the innerProductPriceXPath
                await page.goto(product_url);
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent.trim() : null;
                }, innerProductPriceXPath2);

                if (product_price === null) {
                    product_price = await page.evaluate((xpath) => {
                        const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        return element ? element.textContent.trim() : null;
                    }, innerProductPriceXPath);
                }
            }

            if (!product_name) {
                // Salir del bucle si no hay un nombre de producto
                break;
            }

            products.push({
                product_name,
                product_price,
                product_url,
            });

            hasProducts = true;

            
        }

        if (!hasProducts) {
            break;
        }

        pageNum++;
    }

    // Añadir a cada elemento de products el campo "product_store" con el valor "wcc" y eliminar el signo de euro del precio y eliminar el punto de los miles y las comas de los decimales y convertirlo a float
    products.forEach(product => {
        product.product_store = 'wcc';
        product.product_type = product_type;
        if (typeof product.product_price === 'string') {
            product.product_price = parseFloat(product.product_price.replace('€', '').replace('.', '').replace(',', '.'));
        }

        //  Si queda cualquier producto sin product_type, asignarle el valor "wcc"
        if (!product.product_type) {
            product.product_type = 'wcc';
        }
    });

    

    await browser.close();
    return products;
}

async function chargeRegulatorSolarScrapper(url, product_type) {
    const products = [];

    let pageNum = 1;
    const browser = await puppeteer.launch();

    while (true) {
        const page = await browser.newPage();
        await page.goto(`${url}?page=${pageNum}`);

        let hasProducts = false;  // Variable para verificar si hay productos en la página actual

        for (let i = 1; ; i++) {
            const productNameXPath  = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section[3]/div[2]/div/div[2]/div/div/div/div/section/div/ul/li[${i}]/div/div/div/a/div/div/div[1]/h3`;
            const productPriceXPath = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section[3]/div[2]/div/div[2]/div/div/div/div/section/div/ul/li[${i}]/div/div/div/a/div/div/div[2]/div/div/span[2]`;     
            const innerProductPriceXPath =  `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section/div[2]/div/div[1]/div/div/article/div[1]/section[2]/div[5]/div/div/div/span[1]`
            const innerProductPriceXPath2 =  `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section/div[2]/div/div[1]/div/div/article/div[1]/section[2]/div[5]/div/div/div[2]/span[1]`;
            const productUrlXPath   = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section[3]/div[2]/div/div[2]/div/div/div/div/section/div/ul/li[${i}]/div/div/div/a`;

            let product_name = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent.trim() : null;
            }, productNameXPath);

            let product_price = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent.trim() : null;
            }, productPriceXPath);

            // Eliminar la palabra Desde del precio
            if (product_price != null && product_price.includes('Desde')) {
                product_price = product_price.replace('Desde', '');
            }

            let product_url = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.getAttribute('href') : null;
            } , productUrlXPath);

            if((product_price === null || product_price == undefined || product_price == '') && product_url) {
                console.log('Navigating to inner page...')
                // Navigate to the url of the product to get the price from the inner page using the innerProductPriceXPath2 first and if it fails, use the innerProductPriceXPath
                await page.goto(product_url);
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent.trim() : null;
                }, innerProductPriceXPath2);

                if (product_price === null) {
                    product_price = await page.evaluate((xpath) => {
                        const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        return element ? element.textContent.trim() : null;
                    }, innerProductPriceXPath);
                }
            }

            if (product_price === null) {
                product_price = 'Agotado';
            }

            if (!product_name) {
                // Salir del bucle si no hay un nombre de producto
                break;
            }

            products.push({
                product_name,
                product_price,
                product_url,
            });

            hasProducts = true;
        }

        if (!hasProducts) {
            break;
        }

        pageNum++;

    }

    // Añadir a cada elemento de products el campo "product_store" con el valor "wcc" y eliminar el signo de euro del precio y eliminar el punto de los miles y las comas de los decimales y convertirlo a float
    products.forEach(product => {
        product.product_store = 'wcc';
        product.product_type = product_type;
        if (typeof product.product_price === 'string') {
            product.product_price = parseFloat(product.product_price.replace('€', '').replace(',', '.'));
        }

        //  Si queda cualquier producto sin product_type, asignarle el valor "wcc"
        if (!product.product_type) {
            product.product_type = 'wcc';
        }
    });

    

    await browser.close();
    return products;
}

async function structuresSolarScrapper(url, product_type) {
    const products = [];

    let pageNum = 1;
    const browser = await puppeteer.launch();

    while (true) {
        const page = await browser.newPage();
        await page.goto(`${url}?page=${pageNum}`);

        let hasProducts = false;  // Variable para verificar si hay productos en la página actual

        for (let i = 1; ; i++) {
            const productNameXPath  = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section[3]/div[2]/div/div[1]/div/div/div/div/section/div/ul/li[${i}]/div/div/div/a/div/div/div[1]/h3`;
            const productPriceXPath = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section[3]/div[2]/div/div[1]/div/div/div/div/section/div/ul/li[${i}]/div/div/div/a/div/div/div[2]/div/span[2]`;
            const productPriceXPath2 = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section/div[2]/div/div[3]/div/div/div/div/section/div/ul[1]/li[${i}]/div/div/div/a/div/div/div[2]/div/span[2]`;
            const innerProductPriceXPath = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section/div[2]/div/div[1]/div/div/article/div[1]/section[2]/div[5]/div/div/div/span[1]`
            const innerProductPriceXPath2 = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section/div[2]/div/div[1]/div/div/article/div[1]/section[2]/div[5]/div/div/div[2]/span[1]`;
            const productUrlXPath   = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section[3]/div[2]/div/div[1]/div/div/div/div/section/div/ul/li[${i}]/div/div/div/a`;

            let product_name = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent.trim() : null;
            }, productNameXPath);

            let product_price = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent.trim() : null;
            }, productPriceXPath);

            if (product_price === null) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent.trim() : null;
                }, productPriceXPath2);
            }
            // Eliminar la palabra Desde del precio
            if (product_price != null && product_price.includes('Desde')) {
                product_price = product_price.replace('Desde', '');
            }
            

            if (product_price === null) {
                product_price = 'Agotado';
            }

            let product_url = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.getAttribute('href') : null;
            } , productUrlXPath);

            if((product_price === null || product_price == undefined || product_price == '') && product_url) {
                console.log('Navigating to inner page...')
                // Navigate to the url of the product to get the price from the inner page using the innerProductPriceXPath2 first and if it fails, use the innerProductPriceXPath
                await page.goto(product_url);
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent.trim() : null;
                }, innerProductPriceXPath2);

                if (product_price === null) {
                    product_price = await page.evaluate((xpath) => {
                        const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        return element ? element.textContent.trim() : null;
                    }, innerProductPriceXPath);
                }
            }

            if (!product_name) {
                // Salir del bucle si no hay un nombre de producto
                break;
            }

            products.push({
                product_name,
                product_price,
                product_url,
            });

            hasProducts = true;

            

        }

        if (!hasProducts) {
            break;
        }

        pageNum++;

    }

    // Añadir a cada elemento de products el campo "product_store" con el valor "wcc" y eliminar el signo de euro del precio y eliminar el punto de los miles y las comas de los decimales y convertirlo a float
    products.forEach(product => {
        product.product_store = 'wcc';
        product.product_type = product_type;
        if (typeof product.product_price === 'string') {
            product.product_price = parseFloat(product.product_price.replace('€', '').replace('.', '').replace(',', '.'));
        }

        //  Si queda cualquier producto sin product_type, asignarle el valor "wcc"
        if (!product.product_type) {
            product.product_type = 'wcc';
        }
    });

    

    await browser.close();
    return products;
}

async function pumpingSystemsSolarScrapper(url, product_type) {
    const products = [];

    let pageNum = 1;
    const browser = await puppeteer.launch();

    while (true) {
        const page = await browser.newPage();
        await page.goto(`${url}?page=${pageNum}`);

        let hasProducts = false;  // Variable para verificar si hay productos en la página actual

        for (let i = 1; ; i++) {
            const productNameXPath  = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section[3]/div[2]/div/div[2]/div/div/div/div/section/div/ul/li[${i}]/div/div/div/a/div/div/div[1]/h3`;
            const productPriceXPath = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section[3]/div[2]/div/div[2]/div/div/div/div/section/div/ul/li[${i}]/div/div/div/a/div/div/div[2]/div/span[2]`;
            const productPriceXPath2 = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section/div[2]/div/div[3]/div/div/div/div/section/div/ul[1]/li[${i}]/div/div/div/a/div/div/div[2]/div/span[2]`;
            const innerProductPriceXPath =  `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section/div[2]/div/div[1]/div/div/article/div[1]/section[2]/div[5]/div/div/div/span[1]`
            const innerProductPriceXPath2 =  `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section/div[2]/div/div[1]/div/div/article/div[1]/section[2]/div[5]/div/div/div[2]/span[1]`;
            const productUrlXPath   = `/html/body/div[1]/div/div[3]/div/main/div/div/div/div[2]/div/div/div/section[3]/div[2]/div/div[2]/div/div/div/div/section/div/ul/li[${i}]/div/div/div/a`;

            let product_name = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent.trim() : null;
            }, productNameXPath);

            let product_price = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent.trim() : null;
            }, productPriceXPath);

            if (product_price === null) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent.trim() : null;
                }, productPriceXPath2);
            }

            // Eliminar la palabra Desde del precio
            if (product_price != null && product_price.includes('Desde')) {
                product_price = product_price.replace('Desde', '');
            }

            if (product_price === null) {
                product_price = 'Agotado';
            }

            let product_url = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.getAttribute('href') : null;
            } , productUrlXPath);

            if((product_price === null || product_price == undefined || product_price == '') && product_url) {
                console.log('Navigating to inner page...')
                // Navigate to the url of the product to get the price from the inner page using the innerProductPriceXPath2 first and if it fails, use the innerProductPriceXPath
                await page.goto(product_url);
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent.trim() : null;
                }, innerProductPriceXPath2);

                if (product_price === null) {
                    product_price = await page.evaluate((xpath) => {
                        const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        return element ? element.textContent.trim() : null;
                    }, innerProductPriceXPath);
                }
            }

            if (!product_name) {
                // Salir del bucle si no hay un nombre de producto
                break;
            }

            products.push({
                product_name,
                product_price,
                product_url,
            });

            hasProducts = true;

        }

        if (!hasProducts) {
            break;
        }

        pageNum++;

    }

    // Añadir a cada elemento de products el campo "product_store" con el valor "wcc" y eliminar el signo de euro del precio y eliminar el punto de los miles y las comas de los decimales y convertirlo a float
    products.forEach(product => {
        product.product_store = 'wcc';
        product.product_type = product_type;
        if (typeof product.product_price === 'string') {
            product.product_price = parseFloat(product.product_price.replace('€', '').replace('.', '').replace(',', '.'));
        }

        //  Si queda cualquier producto sin product_type, asignarle el valor "wcc"
        if (!product.product_type) {
            product.product_type = 'wcc';
        }
    });

    

    await browser.close();
    return products;
}



module.exports = wccSolarMain;
