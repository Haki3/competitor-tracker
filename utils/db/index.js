const mongodb = require('mongodb');
const { DEV_DB } = process.env;

async function connectToDatabase() {
    const client = new mongodb.MongoClient(DEV_DB);
    try {
        await client.connect();
        console.log('Connected to the database');
        return client.db(); // Devuelve la instancia de la base de datos
    } catch (error) {
        console.error('Error connecting to the database', error);
        throw error; // Relanza el error para que se pueda manejar en el código de llamada
    }
}


async function sendToDatabase(products) {
    console.log('Sending products to the database...');
    const changes = { newProducts: [], updatedProducts: [] };
    try {
        const client = await mongodb.MongoClient.connect(DEV_DB);
        const db = client.db('products_db_test');
        const collection = db.collection('products_col_prod_1');

        // Eliminar palabras que no sean el modelo y codigos de producto en el nombre del producto y eliminar espacios al principio y al final , cualquier palabra que este en el diccionario español : Inversor, Panel, Bateria, Regulador, Cargador, Kit, Estructura, Bomba, Solar, Fotovoltaico, Placa
        products = products.map(product => {
            product.product_name = product.product_name.replace(/(Inversor|de Alto Voltaje|Alto Voltaje|de|Panel|Bateria|Batería|Regulador|Cargador|Kit|Estructura|Bomba|Solar|Fotovoltaico|Placa|Fotovoltaica)/gi, '').trim();
            return product;
        });

        for (const product of products) {
            const productInDatabase = await collection
                .find({ product_name: product.product_name, product_store: product.product_store })
                .toArray();

            if (productInDatabase.length > 0) {
                // Exclude the _id field when comparing products
                const { _id, ...productData } = productInDatabase[0];
                const { _id: productId, ...currentProductData } = product;

                if (JSON.stringify(currentProductData) !== JSON.stringify(productData)) {
                    changes.updatedProducts.push({ old: productInDatabase[0], new: product });
                    await collection.updateOne(
                        { product_name: product.product_name, product_store: product.product_store },
                        { $set: { ...product, product_type: product.product_type || productInDatabase[0].product_type } }
                    );
                }
            } else {
                // Exclude the _id field when inserting a new product
                const { _id, ...insertProductData } = product;
                changes.newProducts.push(insertProductData);
                // Insert the product into the database
                await collection.insertOne(insertProductData);
            }
        }

        client.close();
    } catch (error) {
        console.error('Error sending products to the database', error);
    }
}
module.exports = { connectToDatabase, sendToDatabase };