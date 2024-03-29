const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const bodyParser = require('body-parser');
const ExcelJS = require('exceljs');
const fs = require('fs');
const stringSimilarity = require('string-similarity');
const { MongoClient } = require('mongodb');
const { updateCompetitor } = require('./utils/logic/updateCompetitorPrices');
const { exec } = require('child_process');

const { DEV_DB, PROD_DB } = process.env;

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));

const url = process.env.NODE_ENV === 'development' ? DEV_DB : PROD_DB;
const dbName = process.env.DB_NAME
const collectionName = process.env.DB_COLLECTION;

const client = new MongoClient(url);
const tiendasConfig = {
    Tienda_Solar: 'tienda_solar',
    Atersa: 'atersa',
    Autosolar: 'autosolar',
    SupermercadoSolar: 'supermercadosolar',
    WccSolar: 'wcc',
    AlmacenFotovoltaico: 'almacen_fotovoltaico',
    rebacas: 'rebacas',
    Energy_Levante: 'energy_levante'
};

const palabrasEliminar = ['Panel','Alto Voltaje', 'Inversor', 'Híbrido', 'Bateria', 'Batería', 'Solar', 'Fotovoltaico', 'Fotovoltaica', 'Fotovoltaicos', 'Fotovoltaicas','Módulo', 'Monocristalino', 'Policristalino', 'Monocristalina', 'Policristalina', 'Monocristalinos', 'Policristalinos', 'Monocristalinas', 'Policristalinas', 'Regulador', 'Reguladores', 'Regulador de carga', 'Reguladores de carga', 'Cargador', 'Cargadores', 'Cargador de batería', 'Cargadores de batería', 'Cargador solar', 'Cargadores solares', 'Cargador de batería solar', 'Cargadores de batería solar', 'Cargador de batería fotovoltaico', 'Cargadores de batería fotovoltaico', 'Cargador fotovoltaico', 'Cargadores fotovoltaico', 'Cargador solar fotovoltaico', 'Cargadores solares fotovoltaico', 'Cargador de batería solar fotovoltaico', 'Cargadores de batería solar fotovoltaico', 'Cargador de batería fotovoltaico solar', 'Cargadores de batería fotovoltaico solar', 'Cargador fotovoltaico solar', 'Cargadores fotovoltaico solar', 'Cargador solar fotovoltaico solar', 'Cargadores solares fotovoltaico solar', 'Cargador de batería solar fotovoltaico solar', 'Cargadores de batería solar fotovoltaico solar', 'Cargador de batería fotovoltaico solar fotovoltaico solar', 'Cargadores de batería fotovoltaico solar fotovoltaico solar', 'Cargador fotovoltaico solar fotovoltaico solar', 'Cargadores fotovoltaico solar fotovoltaico solar', 'Cargador solar fotovoltaico solar fotovoltaico solar', 'Cargadores solares fotovoltaico solar fotovoltaico solar', 'Cargador de batería solar fotovoltaico solar fotovoltaico solar', 'Cargadores de batería solar fotovoltaico solar fotovoltaico solar', 'Cargador de batería fotovoltaico solar fotovoltaico solar fotovoltaico solar', 'Cargadores de batería fotovoltaico solar fotovoltaico solar fotovoltaico solar', 'Cargador fotovoltaico solar fotovoltaico solar fotovoltaico solar', 'Cargadores fotovoltaico solar fotovoltaico solar fotovoltaico solar', 'Cargador solar fotovoltaico solar fotovoltaico solar fotovoltaico solar', 'Cargadores solares fotovoltaico solar fotovoltaico solar fotovoltaico solar'];

const normalizeText = (text) => {
    if (text && typeof text === 'string') {
        let normalizedText = text.toLowerCase();
        palabrasEliminar.forEach(palabra => {
            normalizedText = normalizedText.replace(new RegExp(palabra, 'g'), '');
        });
        return normalizedText.replace(/[^a-z0-9]/g, '');
    }
    return text;
};

const isExcludedProduct = (name) => {
    const normalized = normalizeText(name);
    const excludedValues = ["150/100", "100/15"];
    return excludedValues.includes(normalized);
};

const isSimilarProduct = (name1, name2) => {
    const normalized1 = name1;
    const normalized2 = name2;

    if (isExcludedProduct(name1) || isExcludedProduct(name2)) {
        return false;
    }

    // Extraer números del modelo de ambos nombres
    const numbersName1 = normalized1.match(/\d+/g);
    const numbersName2 = normalized2.match(/\d+/g);

    // Verificar si ambos nombres tienen números de modelo
    if (numbersName1 && numbersName2) {
        // Convertir números a cadenas y comparar si son iguales
        if (numbersName1.join('') === numbersName2.join('')) {
            return true;
        }
    }

    // Convertir los nombres a listas de palabras clave
    const keywords1 = normalized1.split(' ');
    const keywords2 = normalized2.split(' ');

    // Calcular la intersección de palabras clave
    const commonKeywords = keywords1.filter(keyword => keywords2.includes(keyword));

    // Calcular la proporción de palabras clave compartidas
    const similarityScore = commonKeywords.length / Math.min(keywords1.length, keywords2.length);
    
    const similarityThreshold = 0.9;
    
    // Si el nombre contiene huawei console log
    if(normalized1.includes('huawei') || normalized2.includes('huawei')){
        console.log('Similarity Score:', similarityScore, 'Name 1:', normalized1, 'Name 2:', normalized2);
    }

    // Establecer un umbral de similitud deseado
    

    return similarityScore > similarityThreshold;
};

let lastUpdateDate = null;

// Function to update competitors every 30 seconds
const updateCompetitorPeriodically = async () => {
    try {
        console.log('Updating competitors...');
        for (const tienda of Object.values(tiendasConfig)) {
            await updateCompetitor(tienda);
        }
        lastUpdateDate = new Date();
        console.log('Competitors updated at:', lastUpdateDate);
    } catch (error) {
        console.error('Error updating competitors:', error);
    }
};

// Call the function to update competitors every 6 hours , first time after 10 min after the server starts
setTimeout(updateCompetitorPeriodically, 10 * 60 * 1000);
setInterval(updateCompetitorPeriodically, 6 * 60 * 60 * 1000);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/ui/dashboard/index.html');
});

// Endpoint to get the last update date
app.get('/last_update', (req, res) => {
    res.json({ lastUpdateDate });
});

app.post('/descarga/', async (req, res) => {
    console.log('Request received');
    try {
        await client.connect();

        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        const tiendaSolar = tiendasConfig.Tienda_Solar.toLowerCase();
        const cursor = collection.find({ product_store: tiendaSolar });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`Competidores ${new Date().toISOString().split('T')[0]}`);

        const columns = [
            { header: 'Productos', key: 'Product_Name' },
            { header: tiendaSolar, key: tiendaSolar },
            ...Object.values(tiendasConfig).filter(tienda => tienda !== tiendaSolar).map(tienda => ({ header: tienda, key: tienda }))
        ];

        worksheet.columns = columns;

        const allTiendasProductos = await collection.find({}).toArray();

        const processProduct = async (productoSolar) => {
            const rowData = { Product_Name: productoSolar.product_name };
            rowData[tiendaSolar] = {
                text: productoSolar.product_price,
                hyperlink: productoSolar.product_url
            };

            const hasCompetitorPrice = Object.values(tiendasConfig).some(tienda => {
                if (tienda !== tiendaSolar) {
                    const matchingProductos = allTiendasProductos.filter(p =>
                        p.product_store === tienda &&
                        isSimilarProduct(p.product_name, productoSolar.product_name)
                    );
                    const similarityThreshold = normalizeText(productoSolar.product_name).includes('victron') && normalizeText(productoSolar.product_name).includes('mppt') && normalizeText(productoSolar.product_name).includes('Mono') && normalizeText(productoSolar.product_name).includes('Panel') ? 0.99 : 0.8;
                    const selectedProducto = matchingProductos.find(p =>
                        stringSimilarity.compareTwoStrings(normalizeText(p.product_name), normalizeText(productoSolar.product_name)) > similarityThreshold
                    );

                    return selectedProducto && selectedProducto.product_price !== null && selectedProducto.product_price !== undefined;
                }
                return false;
            });

            if (hasCompetitorPrice) {
                for (const tienda of Object.values(tiendasConfig)) {
                    if (tienda !== tiendaSolar) {
                        const matchingProductos = allTiendasProductos.filter(p =>
                            p.product_store === tienda &&
                            isSimilarProduct(p.product_name, productoSolar.product_name)
                        );

                        let similarityThreshold = 0;

                        // SI el producto contiene la palabra huawei o pylontech, se establece un umbral de similitud mayor
                        if(normalizeText(productoSolar.product_name).includes('huawei') || normalizeText(productoSolar.product_name).includes('pylontech') || normalizeText(productoSolar.product_name).includes('hyundai')) {
                            similarityThreshold = .55; // Umbral de similitud para productos
                        
                        } else if(normalizeText(productoSolar.product_name).includes('fronius') || normalizeText(productoSolar.product_name).includes('symo') || normalizeText(productoSolar.product_name).includes('primo')){
                            similarityThreshold = .85;
                        } else if(normalizeText(productoSolar.product_name).includes('victron') || normalizeText(productoSolar.product_name).includes('mppt')){
                            similarityThreshold = .75;
                        } else{
                            similarityThreshold = .2;
                        }
                        const selectedProducto = matchingProductos.find(p =>
                            stringSimilarity.compareTwoStrings(normalizeText(p.product_name), normalizeText(productoSolar.product_name)) > similarityThreshold
                        );

                        if (selectedProducto && selectedProducto.product_price !== null && selectedProducto.product_price !== undefined) {
                            // Si selectedProducto.product_price es un número, se agrega como un hipervínculo
                            rowData[tienda] = {
                                text: selectedProducto.product_price ? selectedProducto.product_price : 'Sin precio / Stock',
                                hyperlink: selectedProducto.product_url ? selectedProducto.product_url : ''
                            };
                        }
                    }
                }

                worksheet.addRow(rowData);
            }
        };

        const tiendaSolarProductos = await cursor.toArray();
        await Promise.all(tiendaSolarProductos.map(processProduct));

        console.log('Writing file...');
        const filePath = `./output/productos_comp_${new Date().toISOString().replace(/[-:]/g, '_').replace(/\.\d+/, '')}.xlsx`;
        await workbook.xlsx.writeFile(filePath);

        console.log('File written');
        console.log('Applying styles...');

        const pythonScript = 'apply_style.py';
        exec(`python3 ${pythonScript} ${filePath}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error applying styles: ${stderr}`);
                res.status(500).send('Error en el servidor al aplicar estilos');
                return;
            }

            res.download(filePath, `Informe_Competidores_${new Date().toISOString().replace(/[-:T]/g, '_').replace(/\.\d+/, '')}.xlsx`, (err) => {
                fs.unlinkSync(filePath);
            });
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor : ' + error);
    } finally {
        await client.close();
    }
});

app.listen(port, () => {
    console.log(`************* Competitor Tracker started at: http://localhost:${port} *************`);
});
