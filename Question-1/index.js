const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const BASE_URL = "http://20.244.56.144/test/companies";
const COMPANIES = ["AMZ", "FLP", "SNP", "MYN", "AZO"];
const PAGE_SIZE = 10;
const fetchProducts = async (company, category,n, minPrice, maxPrice,ACCESS_TOKEN) => {
    const url = `${BASE_URL}/${company}/categories/${category}/products?top=${n}&minPrice=${minPrice}&maxPrice=${maxPrice}`;
    try {
        const response = await axios.get(url, {
            headers: {
                Authorization:` Bearer ${ACCESS_TOKEN}`,
            }
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching products from ${company}:`, error);
        return [];
    }
};
const generateProductId = (product) => {
    const uniqueString = `${product.productName}${product.price}${product.company}`;
    return crypto.createHash('md5').update(uniqueString).digest('hex');
};

app.get('/categories/:categoryname/products', async (req, res) => {
    const { categoryname } = req.params;
    const n = parseInt(req.query.n) || 10;
    const minPrice = req.query.minPrice || 0;
    const maxPrice = req.query.maxPrice || 1000000;
    const sortBy = req.query.sortBy || 'price';
    const order = req.query.order || 'asc';
    const page = parseInt(req.query.page) || 1;
    const ACCESS_TOKEN=req.headers.authorization.split(" ")[1];
    let products = [];
    for (const company of COMPANIES) {
        const companyProducts = await fetchProducts(company, categoryname,n, minPrice, maxPrice,ACCESS_TOKEN );
        companyProducts.forEach(product => product.company = company);
        products = products.concat(companyProducts);
    }

    products.forEach(product => product.id = generateProductId(product));

    if (['price', 'rating', 'discount'].includes(sortBy)) {
        products.sort((a, b) => {
            return order === 'asc' ? a[sortBy] - b[sortBy] : b[sortBy] - a[sortBy];
        });
    } else if (sortBy === 'company') {
        products.sort((a, b) => {
            return order === 'asc' ? a.company.localeCompare(b.company) : b.company.localeCompare(a.company);
        });
    }

    const totalProducts = products.length;
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const paginatedProducts = products.slice(start, end);

    res.json({
        total: totalProducts,
        page: page,
        page_size: PAGE_SIZE,
        products: paginatedProducts
    });
});

app.get('/categories/:categoryname/products/:productid', async (req, res) => {
    const { categoryname, productid } = req.params;
    const ACCESS_TOKEN=req.headers.authorization.split(" ")[1]; 
    const n = parseInt(req.query.n) || 10;
    const minPrice = req.query.minPrice || 0;
    const maxPrice = req.query.maxPrice || 1000000;
    const sortBy="price";
    let products=[]
    for (const company of COMPANIES) {
        const companyProducts = await fetchProducts(company, categoryname,n, minPrice, maxPrice,ACCESS_TOKEN );
        companyProducts.forEach(product => product.company = company);
        products = products.concat(companyProducts);
    }

    products.forEach(product => product.id = generateProductId(product));
    products.sort((a, b) => {
        return  a[sortBy] - b[sortBy];
    });
    products=products.slice(0,n);
    console.log(products)
    const product = products.find(p => p.id === productid);
    if (product) {
        return res.json(product);
    }

    res.status(404).json({ error: "Product not found" });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});