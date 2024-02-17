
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
        const collection = db.collection('products_col_test');

        for (const product of products) {
            const productInDatabase = await collection
                .find({ product_name: product.product_name, product_store: product.product_store })
                .toArray();

            if (productInDatabase.length > 0) {
                // Exclude the _id and product_type fields when comparing products
                const { _id, product_type, ...productData } = productInDatabase[0];
                const { _id: productId, product_type: productType, ...currentProductData } = product;

                if (JSON.stringify(currentProductData) !== JSON.stringify(productData)) {
                    changes.updatedProducts.push({ old: productInDatabase[0], new: product });
                    await collection.updateOne(
                        { product_name: product.product_name, product_store: product.product_store },
                        { $set: { product_price: product.product_price } }
                    );
                }
            } else {
                // Exclude the _id and product_type fields when inserting a new product
                const { _id, product_type, ...insertProductData } = product;
                changes.newProducts.push(insertProductData);
                // Insert the product into the database
                await collection.insertOne(insertProductData);
            }
        }

        client.close();
    } catch (error) {
        console.error('Error sending products to the database', error);
    }

    console.log('Changes:', JSON.stringify(changes, null, 2));
}
module.exports = { connectToDatabase, sendToDatabase };