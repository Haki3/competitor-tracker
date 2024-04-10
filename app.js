const dotenv = require('dotenv');
dotenv.config();
const TelegramBot = require('node-telegram-bot-api');
const ExcelJS = require('exceljs');
const fs = require('fs');
const stringSimilarity = require('string-similarity');
const { MongoClient } = require('mongodb');
const { updateCompetitor } = require('./utils/logic/updateCompetitorPrices');
const { exec } = require('child_process');

const { DEV_DB, PROD_DB, TELEGRAM_TOKEN, TELEGRAM_CHAT_ID } = process.env;

const bot = new TelegramBot(TELEGRAM_TOKEN);
const url = process.env.NODE_ENV === 'development' ? DEV_DB : PROD_DB;
const dbName = process.env.DB_NAME;
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


// Funciones utils
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



// Función para enviar el documento XLSX a través de Telegram
const sendExcelViaTelegram = async (chatId, filePath) => {
    try {
        const data = fs.readFileSync(filePath);
        await bot.sendDocument(
            TELEGRAM_CHAT_ID,
            fs.readFileSync(filePath),
            {
                caption: 'Aqui tienes el informe de precios de competidores! ☀',
            },
            {
                filename: 'Informe de precios de competidores - ' + new Date().toISOString().split('T')[0] + '.xlsx',
                contentType: 'application/application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            })
            .then(() => {
                console.log('File has been sent');
            });
        console.log('File sent via Telegram');
        // Eliminar el archivo después de enviarlo
        fs.unlinkSync(filePath);
    } catch (error) {
        console.error('Error sending file via Telegram:', error);
    }
};

// Función para actualizar competidores periódicamente
const updateCompetitorPeriodically = async () => {
    try {
        console.log('Updating competitors...');
        for (const tienda of Object.values(tiendasConfig)) {
            await updateCompetitor(tienda);
        }
        await genReportOnStart();
        console.log('Competitors updated and sent via Telegram');
    } catch (error) {
        console.error('Error updating competitors:', error);
    }
};

// Llamar a la función para actualizar competidores cada 6 horas
updateCompetitorPeriodically();
setInterval(updateCompetitorPeriodically, 6 * 60 * 60 * 1000);

// Iniciar el bot de Telegram
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

const genReportOnStart = async () => {
    const chatId = TELEGRAM_CHAT_ID; // Obtener el chatId del archivo .env
    // Generando informe de precios de competidores mensaje telegram
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

                        // Establecer umbral de similitud para casos específicos
                        if(normalizeText(productoSolar.product_name).includes('huawei') || normalizeText(productoSolar.product_name).includes('pylontech') || normalizeText(productoSolar.product_name).includes('hyundai')) {
                            similarityThreshold = .55; // Umbral de similitud para productos
                        } else if (normalizeText(productoSolar.product_name).includes('hyundai')) {
                            similarityThreshold = .55;
                        } else if(normalizeText(productoSolar.product_name).includes('fronius') || normalizeText(productoSolar.product_name).includes('symo') || normalizeText(productoSolar.product_name).includes('primo')){
                            similarityThreshold = .8;
                        } else if(normalizeText(productoSolar.product_name).includes('victron') || normalizeText(productoSolar.product_name).includes('mppt')){
                            similarityThreshold = .75;
                        } else{
                            similarityThreshold = .45;
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
        const filePath = `productos_comp_${new Date().toISOString().replace(/[-:]/g, '_').replace(/\.\d+/, '')}.xlsx`;

        const pythonScript = 'apply_style.py';
        exec(`python3 ${pythonScript} ${filePath}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error applying styles: ${stderr}`);
                res.status(500).send('Error en el servidor al aplicar estilos');
                return;
            }

            sendExcelViaTelegram(chatId, filePath); // Pasar el chatId como primer argumento
        });

        await workbook.xlsx.writeFile(filePath);
        console.log('File written');


    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, 'Error en el servidor: ' + error); // Enviar mensaje de error al mismo chat
    } finally {
        await client.close();
    }
}

// Iniciar el bot de Telegram
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});
