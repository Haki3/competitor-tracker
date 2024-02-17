const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const bodyParser = require('body-parser');
const ExcelJS = require('exceljs');
const fs = require('fs');
const stringSimilarity = require('string-similarity');
const { MongoClient } = require('mongodb');
const { updateCompetitor } = require('./utils/logic/updateCompetitorPrices');

const { DEV_DB, PROD_DB } = process.env;

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));

const url = process.env.NODE_ENV === 'development' ? DEV_DB : PROD_DB;
const dbName = process.env.DB_NAME
const collectionName = process.env.COLLECTION_NAME;

const client = new MongoClient(url);
const tiendasConfig = {
    Tienda_Solar: 'tienda_solar',
    Atersa: 'atersa',
    Autosolar: 'autosolar',
    SupermercadoSolar: 'supermercadosolar',
    // Agrega más tiendas según sea necesario
};

const palabrasEliminar = ['Panel', 'Inversor', 'Híbrido', 'Bateria', 'Batería', 'Solar', 'Fotovoltaico', 'Fotovoltaica', 'Fotovoltaicos', 'Fotovoltaicas','Módulo', 'Monocristalino', 'Policristalino', 'Monocristalina', 'Policristalina', 'Monocristalinos', 'Policristalinos', 'Monocristalinas', 'Policristalinas', 'Regulador', 'Reguladores', 'Regulador de carga', 'Reguladores de carga', 'Cargador', 'Cargadores', 'Cargador de batería', 'Cargadores de batería', 'Cargador solar', 'Cargadores solares', 'Cargador de batería solar', 'Cargadores de batería solar', 'Cargador de batería fotovoltaico', 'Cargadores de batería fotovoltaico', 'Cargador fotovoltaico', 'Cargadores fotovoltaico', 'Cargador solar fotovoltaico', 'Cargadores solares fotovoltaico', 'Cargador de batería solar fotovoltaico', 'Cargadores de batería solar fotovoltaico', 'Cargador de batería fotovoltaico solar', 'Cargadores de batería fotovoltaico solar', 'Cargador fotovoltaico solar', 'Cargadores fotovoltaico solar', 'Cargador solar fotovoltaico solar', 'Cargadores solares fotovoltaico solar', 'Cargador de batería solar fotovoltaico solar', 'Cargadores de batería solar fotovoltaico solar', 'Cargador de batería fotovoltaico solar fotovoltaico solar', 'Cargadores de batería fotovoltaico solar fotovoltaico solar', 'Cargador fotovoltaico solar fotovoltaico solar', 'Cargadores fotovoltaico solar fotovoltaico solar', 'Cargador solar fotovoltaico solar fotovoltaico solar', 'Cargadores solares fotovoltaico solar fotovoltaico solar', 'Cargador de batería solar fotovoltaico solar fotovoltaico solar', 'Cargadores de batería solar fotovoltaico solar fotovoltaico solar', 'Cargador de batería fotovoltaico solar fotovoltaico solar fotovoltaico solar', 'Cargadores de batería fotovoltaico solar fotovoltaico solar fotovoltaico solar', 'Cargador fotovoltaico solar fotovoltaico solar fotovoltaico solar', 'Cargadores fotovoltaico solar fotovoltaico solar fotovoltaico solar', 'Cargador solar fotovoltaico solar fotovoltaico solar fotovoltaico solar', 'Cargadores solares fotovoltaico solar fotovoltaico solar fotovoltaico solar'];

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

const isSimilarProductName = (name1, name2) => {
    const similarityThreshold = 0.88;
    const normalized1 = normalizeText(name1);
    const normalized2 = normalizeText(name2);

    if (isExcludedProduct(name1) || isExcludedProduct(name2)) {
        console.log(`Estos productos "${normalized1}" y "${normalized2}" no son considerados similares.`);
        return false;
    }

    return stringSimilarity.compareTwoStrings(normalized1, normalized2) > similarityThreshold;
};

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/ui/dashboard/index.html');
});

app.post('/generar_excel/', async (req, res) => {
    try {
        await client.connect();
        // Actualizar precios de competidores
        for (const tienda of Object.values(tiendasConfig)) {
            await updateCompetitor(tienda);
        }

        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        // Obtener productos con el tag correspondiente a la tienda solar
        const cursor = collection.find({ product_store: tiendasConfig.Tienda_Solar.toLowerCase() });

        // Crear un nuevo workbook de Excel
        const workbook = new ExcelJS.Workbook();
        // Ponerle un nombre a la hoja de trabajo con formato "comp_prod_YYYY-MM-DD_HH:MM:SS"
        const worksheet = workbook.addWorksheet(`comp_prod_${new Date().toISOString().replace(/[-:]/g, '_').replace(/\.\d+/, '')}`);

        // Definir encabezados de columnas
        const columns = [
            { header: 'Productos', key: 'Product_Name' },
            { header: tiendasConfig.Tienda_Solar, key: tiendasConfig.Tienda_Solar },
            ...Object.values(tiendasConfig).filter(tienda => tienda !== tiendasConfig.Tienda_Solar).map(tienda => ({ header: tienda, key: tienda }))
        ];

        worksheet.columns = columns;

        // Llenar el worksheet con datos
        const tiendaSolarProductos = await cursor.toArray();
        const allTiendasProductos = await collection.find({}).toArray();

        await Promise.all(tiendaSolarProductos.map(async productoSolar => {
            const rowData = { Product_Name: productoSolar.product_name };
            rowData[tiendasConfig.Tienda_Solar] = productoSolar.product_price;

            // Verificar si hay al menos un competidor con precio definido
            const hasCompetitorPrice = Object.values(tiendasConfig).some(tienda => {
                if (tienda !== tiendasConfig.Tienda_Solar) {
                    const matchingProductos = allTiendasProductos.filter(p =>
                        p.product_store === tienda &&
                        isSimilarProductName(normalizeText(p.product_name), normalizeText(productoSolar.product_name))
                    );

                    const similarityThreshold = 0.9;
                    const selectedProducto = matchingProductos.find(p =>
                        stringSimilarity.compareTwoStrings(normalizeText(p.product_name), normalizeText(productoSolar.product_name)) > similarityThreshold
                    );

                    return selectedProducto && selectedProducto.product_price !== null && selectedProducto.product_price !== undefined;
                }
                return false;
            });

            // Si el producto tiene al menos un precio de competidor, se agrega al excel
            if (hasCompetitorPrice) {
                Object.values(tiendasConfig).forEach(tienda => {
                    if (tienda !== tiendasConfig.Tienda_Solar) {
                        const matchingProductos = allTiendasProductos.filter(p =>
                            p.product_store === tienda &&
                            isSimilarProductName(normalizeText(p.product_name), normalizeText(productoSolar.product_name))
                        );

                        const similarityThreshold = 0.9;
                        const selectedProducto = matchingProductos.find(p =>
                            stringSimilarity.compareTwoStrings(normalizeText(p.product_name), normalizeText(productoSolar.product_name)) > similarityThreshold
                        );

                        rowData[tienda] = selectedProducto && selectedProducto.product_price ? selectedProducto.product_price : null;
                    }
                });

                // Agregar la fila al worksheet
                worksheet.addRow(rowData);
            }
        }));

        // Crear un archivo Excel con el nombre "productos_comp_YYYY-MM-DD_HH:MM:SS.xlsx"
        const filePath = `productos_comp_${new Date().toISOString().replace(/[-:]/g, '_').replace(/\.\d+/, '')}.xlsx`;
        await workbook.xlsx.writeFile(filePath);

        res.download(filePath, `productos_comp_${new Date().toISOString().replace(/[-:]/g, '_').replace(/\.\d+/, '')}.xlsx`, (err) => {
            // Eliminar el archivo después de la descarga
            fs.unlinkSync(filePath);
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor');
    } finally {
        await client.close();
    }
});

app.listen(port, () => {
    console.log(`************* Competitor Tracker started at: http://localhost:${port} *************`);
});
