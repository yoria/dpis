const functions = require('firebase-functions');
const express = require('express');
const app = express();
const fs = require('fs');
const moment = require('moment');

// 'bucket' is an object defined in the @google-cloud/storage library.
// See https://googlecloudplatform.github.io/google-cloud-node/#/docs/storage/latest/storage/bucket
// for more details.
app.set('view engine', 'ejs');
app.engine('ejs', require('ejs').__express);
// respond with "hello world" when a GET request is made to the homepage

app.get("/", (req, res) => {
    const productsObj = getIndexPageData();
    res.render("index", {
        products: productsObj.products,
        horizontalLineCardNumber: productsObj.horizontalLineCardNumber,
        verticalLineAnything: productsObj.verticalLineAnything
    });
});

app.get("/search", (req, res) => {
    res.render("search", {
        products: getSearchPageData(req.query.keyword)
    });
});

app.get("/product/:cardNumber", (req, res) => {
    const productPageObj = getProductPageData(req.params.cardNumber);
    res.set("Cache-Control", "public, max-age=300, s-maxage=600")
    res.render("product", {
        labelArray: getDateArray(),
        averagePrices: productPageObj.averagePrices,
        regressionLineArray: productPageObj.regressionLineArray,
        products: productPageObj.products
    });
})

app.get("/tos", (req, res) => {
    res.render("tos");
})

app.get("/privacypolicy", (req, res) => {
    res.render("privacypolicy");
})

app.get("/specification", (req, res) => {
    res.render("specification");
})

function getIndexPageData() {
    const originProductsObj = JSON.parse(fs.readFileSync(`./json_data/products/products_${currentDate()}.json`, 'utf8'));
    originProductsObj.sort(function (a, b) {
        if (a.average_price < b.average_price) {
            return 1;
        } else {
            return -1;
        }
    });
    const returnProductsObj = {
        products: [],
        horizontalLineCardNumber: [],
        verticalLineAnything: []
    }
    for (let i = 0; i < 50; i++) {
        returnProductsObj.products.push(originProductsObj[i]);
        returnProductsObj.horizontalLineCardNumber.push(originProductsObj[i].product_id);
        returnProductsObj.verticalLineAnything.push(originProductsObj[i].average_price);
    }
    return returnProductsObj;
}

function getSearchPageData(keyword) {
    const products = JSON.parse(fs.readFileSync(`./json_data/products/products_${currentDate()}.json`, 'utf8'));
    const searchResultProducts = [];
    for (let i = 0; i < products.length; i++) {
        if (products[i]['name'].match(new RegExp(keyword, "i")) !== null
            || products[i]['product_id'].match(new RegExp(keyword, "i")) !== null) {
            searchResultProducts.push(products[i]);
        }
    }
    return searchResultProducts;
}

function getProductPageData(cardNumber) {
    const cards = JSON.parse(fs.readFileSync(`./json_data/products/products_${currentDate()}.json`, 'utf8'));
    const target = cards.find((card) => {
        return (card.product_id === cardNumber);
    });
    cardId = target['id'];

    const allHistories = JSON.parse(fs.readFileSync(`./json_data/histories/histories_${currentDate()}.json`, 'utf8'));
    let histories = [];
    histories['yafuoku'] = allHistories.filter((history) => {
        return (history.product_id === cardId
            && history.flea_market_name === 'yafuoku'
            && (history.sample_num === 10 || history.sample_num === 0));
    });
    histories['rakuma'] = allHistories.filter((history) => {
        return (history.product_id === cardId
            && history.flea_market_name === 'rakuma'
            && (history.sample_num === 10 || history.sample_num === 0));
    });


    // 配列データや回帰直線を求める

    const times = getDateArray();
    let historiesCreatedAtArray = [];
    let averagePrices = [];
    let regressionLineArray = [];
    historiesCreatedAtArray['yafuoku'] = getCreatedAtArray(histories['yafuoku']);
    historiesCreatedAtArray['rakuma'] = getCreatedAtArray(histories['rakuma']);
    averagePrices['yafuoku'] = getVerticalLineArray(
        times, historiesCreatedAtArray['yafuoku'], histories['yafuoku']);
    averagePrices['rakuma'] = getVerticalLineArray(
        times, historiesCreatedAtArray['rakuma'], histories['rakuma']);
    regressionLineArray['yafuoku'] = getRegressionLine(times, averagePrices['yafuoku']);
    regressionLineArray['rakuma'] = getRegressionLine(times, averagePrices['rakuma']);

    // このカードのフリマ商品
    const flemaProducts = JSON.parse(fs.readFileSync(`./json_data/history_details/history_details_${currentDate()}.json`, 'utf8'));
    const successProducts = {
        'yafuoku': [],
        'rakuma': []
    }
    var start = new Date()
    for (let i = 0; i < flemaProducts.length; i++) {
        if (flemaProducts[i].product_id === cardId && flemaProducts[i].status === 1) {
            successProducts[flemaProducts[i].flema].push(flemaProducts[i]);
        }
    }
    var delta = new Date() - start;
    successProducts.yafuoku.sort(function (a, b) {
        if (a.oldest_to_latest_number < b.oldest_to_latest_number) {
            return 1;
        } else {
            return -1;
        }
    });
    successProducts.rakuma.sort(function (a, b) {
        if (a.oldest_to_latest_number < b.oldest_to_latest_number) {
            return 1;
        } else {
            return -1;
        }
    });
    const tenSuccessProducts = {
        'yafuoku': [],
        'rakuma': []
    }
    for (let j = 0; j < successProducts.yafuoku.length; j++) {
        tenSuccessProducts.yafuoku.push(successProducts.yafuoku[j]);
        if (tenSuccessProducts.yafuoku.length === 10) {
            break;
        }
    }
    for (let k = 0; k < successProducts.rakuma.length; k++) {
        tenSuccessProducts.rakuma.push(successProducts.rakuma[k]);
        if (tenSuccessProducts.rakuma.length === 10) {
            break;
        }
    }
    const returnObj = {
        averagePrices: averagePrices,
        regressionLineArray: regressionLineArray,
        products: tenSuccessProducts
    }
    return returnObj;
}



function isSmartPhone() {
    if (navigator.userAgent.match(/iPhone|Android.+Mobile/)) {
        return true;
    } else {
        return false;
    }
}

function getDateArray() {
    const dateArray = [];
    const start = moment('2020-08-19');
    const end = moment();
    while (start.diff(end) <= 0) {
        dateArray.push(start.format('MM/DD'));
        start.add(1, 'days');
    }
    return dateArray;
}

function getVerticalLineArray(baseHorizontalLineArray, actualHorizontalLineArray, recordArray) {
    let verticalLineArray = [];
    let index
    baseHorizontalLineArray.forEach(function (date) {
        index = actualHorizontalLineArray.indexOf(date);
        if (index !== -1) {
            verticalLineArray.push(recordArray[index]['average_price']);
        } else {
            verticalLineArray.push(null);
        }
    });
    return verticalLineArray;
}

function getCreatedAtArray(histories) {
    let productHistoriesCreatedAtArray = [];
    histories.forEach(function (history) {
        let createdAt = moment(history['created_at']);
        productHistoriesCreatedAtArray.push(createdAt.format('MM/DD'));
    });
    return productHistoriesCreatedAtArray;
}

function getRegressionLine(horizontalLineArray, verticalLineArray) {
    let startRegressionLineIndex = -1;
    let endRegressionLineIndex = -1;
    let jjj = 0;
    verticalLineArray.forEach(function (verticalLine) {
        if (verticalLine !== null && startRegressionLineIndex === -1) {
            startRegressionLineIndex = jjj;
        }
        if (verticalLine !== null) {
            endRegressionLineIndex = jjj;
        }
        jjj++;
    });
    const RegressionLineDataNum = endRegressionLineIndex
        - startRegressionLineIndex + 1;
    const horizontalLineArrayNum = horizontalLineArray.length;

    let xAverage = 0;
    let yAverage = 0;
    let xyAverage = 0;
    let xSquareAverage = 0;

    for (let i = startRegressionLineIndex; i <= endRegressionLineIndex; i++) {
        if (verticalLineArray[i] !== null) {
            xAverage += (i / RegressionLineDataNum);
            yAverage += (verticalLineArray[i] / RegressionLineDataNum);
            xyAverage += ((i * verticalLineArray[i])
                / RegressionLineDataNum);
            xSquareAverage += (i ** 2 / RegressionLineDataNum);
        }
    }

    const slope = (xyAverage - xAverage * yAverage) /
        (xSquareAverage - xAverage ** 2);
    const yIntercept = - slope * xAverage + yAverage;

    let regressionLine = [];
    for (let i = 0; i < horizontalLineArrayNum; i++) {
        if (startRegressionLineIndex <= i && i <= endRegressionLineIndex) {
            regressionLine.push(yIntercept + slope * i);
        } else {
            regressionLine.push(null);
        }
    }
    return regressionLine;
}

function currentDate() {
    const date = moment();
    let i = 0;
    while (true) {
        i++;
        if (i === 100) {
            return 0;
        }
        const dateStr = date.format('YYYY-MM-DD');
        if (fs.existsSync(`./json_data/products/products_${dateStr}.json`)) {
            return dateStr;
        } else {
            date.subtract(1, 'days');
        };
    }
}
exports.app = functions.https.onRequest(app);