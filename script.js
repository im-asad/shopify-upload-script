const read = require('read-excel-file/node');
const axios = require('axios');
const fs = require('fs');

const shopName = 'liporia-com';
const apiKey = 'ef3c04696b119c40f17e7a6909d86914';
const password = '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';

const url = `https://${apiKey}:${password}@${shopName}.myshopify.com/admin/api/2020-01`

const AWS = require('aws-sdk');
const imagemin = require("imagemin");
const mozjpeg = require("imagemin-mozjpeg");

const BUCKET_NAME = "liporiashopify-product-images";
const IAM_USER_KEY = 'AKIA34UZGOQY6YGHRQJZ';
const IAM_USER_SECRET = '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';

const update_product = async (product_id, product) => {
    const response = await axios.put(`${url}/products/${product_id}.json`, { product });
};

const create_product = async (product) => {
    const response = await axios.post(`${url}/products.json`, { product });
};

read('bulk_update.xlsx').then(async (records) => {
    const count_response = await axios.get(`${url}/products/count.json`);
    const response = await axios.get(`${url}/products.json?limit=250&fields=id,title,handle`);
    let existing_products = response.data.products;
    console.log("Getting products...");
    while (existing_products.length < count_response.data.count) {
        const since_id = existing_products[existing_products.length-1].id;
        const product_response = await axios.get(`${url}/products.json?limit=250&since_id=${since_id}&fields=id,title,handle`);
        if (product_response.data.products.length === 0) {
            break;
        }
        existing_products = existing_products.concat(product_response.data.products);
    }
    console.log("Number of total Shopify products retrieved: ", existing_products.length);
    console.log("Running script...");
    const products = [];
    const rows = records;
    for (let i = 1; i < rows.length; i++) {
        const product = {};
        product.handle = rows[i][0];
        product.title = rows[i][1];
        product.variants = [{ 
            price: rows[i][2],
            sku: rows[i][6],
            compare_at_price: rows[i][3],
        }],
        product.body_html = rows[i][4];
        product.tags = rows[i][5];
        product.cost = rows[i][7];
        product.images = (rows[i][8] !== '' && rows[i][8]) ? [{ src: rows[i][8] }] : [];

        // Check if product exists in existing products
        let product_exists = false, product_id = null;
        for (let j = 0; j < existing_products.length; j++) {
            if (existing_products[j].title === product.title || existing_products[j].handle === product.handle) {
                product_exists = true;
                product_id = existing_products[j].id;
                break;
            }
        }

        if (product_exists) {
            if (product.handle === '' || !product.handle) {
                delete product.handle;
            }
            if (product.title === '' || !product.title) {
                delete product.title;
            }
            if (product.variants[0].price === '' || !product.variants[0].price) {
                delete product.variants[0].price;
            }
            if (product.variants[0].sku === '' || !product.variants[0].sku) {
                delete product.variants[0].sku;
            }
            if (product.variants[0].compare_at_price === '' || !product.variants[0].compare_at_price) {
                delete product.variants[0].compare_at_price;
            }
            if (product.body_html === '' || !product.body_html) {
                delete product.body_html;
            }
            if (product.tags === '' || !product.tags) {
                delete product.tags;
            }
            if (product.cost === '' || !product.cost) {
                delete product.cost;
            }
            if (product.images.length === 0) {
                delete product.images;
            }
            await update_product(product_id, product);
        } else {
            await create_product(product);
        }

        products.push(product);
    }

    console.log("Done.")
});