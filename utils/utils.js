// Archivo de utilidades
// utils.js
const stringSimilarity = require('string-similarity');

const normalizeText = (text, palabrasEliminar = []) => {
    if (text && typeof text === 'string') {
        let normalizedText = text.toLowerCase();
        palabrasEliminar.forEach(palabra => {
            normalizedText = normalizedText.replace(new RegExp(palabra, 'g'), '');
        });
        return normalizedText.replace(/[^a-z0-9]/g, '');
    }
    return text;
};

const isExcludedProduct = (name, excludedValues) => {
    const normalized = normalizeText(name, []);
    return excludedValues.includes(normalized);
};

const isSimilarProductName = (name1, name2, similarityThreshold, excludedValues) => {
    const normalized1 = normalizeText(name1, excludedValues);
    const normalized2 = normalizeText(name2, excludedValues);

    if (isExcludedProduct(name1, excludedValues) || isExcludedProduct(name2, excludedValues)) {
        console.log(`Estos productos "${normalized1}" y "${normalized2}" no son considerados similares.`);
        return false;
    }

    return stringSimilarity.compareTwoStrings(normalized1, normalized2) > similarityThreshold;
};

const findSimilarProduct = (tienda, allTiendasProductos, productoSolar, similarityThreshold) => {
    const matchingProductos = allTiendasProductos.filter(p =>
        p.product_store === tienda &&
        isSimilarProductName(p.product_name, productoSolar.product_name, similarityThreshold, [])
    );

    const selectedProducto = matchingProductos.find(p =>
        stringSimilarity.compareTwoStrings(p.product_name, productoSolar.product_name) > similarityThreshold
    );

    return selectedProducto;
};

const hasCompetitorPrice = (tiendasConfig, tiendaSolarProductos, allTiendasProductos) => {
    return tiendaSolarProductos.some(productoSolar => {
        const hasCompetitorPrice = Object.values(tiendasConfig).some(tienda => {
            if (tienda !== tiendasConfig.Tienda_Solar) {
                const selectedProducto = findSimilarProduct(
                    tienda,
                    allTiendasProductos,
                    productoSolar,
                    0.9
                );

                return selectedProducto && selectedProducto.product_price !== null && selectedProducto.product_price !== undefined;
            }
            return false;
        });

        return hasCompetitorPrice;
    });
};

module.exports = {
    normalizeText,
    isExcludedProduct,
    isSimilarProductName,
    findSimilarProduct,
    hasCompetitorPrice,
};
