type MarketName  = 'binance' | 'bittrex' | 'poloniex';

export const getUrl = (market: MarketName, pairName: string, count_clines: number, interval: number) => {
    let symbol: string;
    if (market === 'binance') {
        symbol = pairBittrexToBinance(pairName);
    }
    if (market === 'bittrex') {
        symbol = pairName;
    }
    if (market === 'poloniex') {
        symbol = pairName.replace('-', '_');
    }

    console.log(pairName, symbol);
    var url;
    let Interval = getInterval(market, interval);
    switch (market) {
        case ('binance'):

            url = 'https://api.binance.com/api/v1/klines?limit=' + count_clines + '&symbol=' + symbol + '&interval=' + Interval;

            break;

        case ('bittrex'):

            var convert = false;
            if (Interval == 'Min15') {
                Interval = 'fiveMin';
                convert = true;
            }

            url = 'https://bittrex.com/Api/v2.0/pub/market/GetTicks?marketName=' + symbol + '&tickInterval=' + Interval + '&_=' + new Date().getTime();
            break;

        case ('poloniex'):

            let start = +(new Date().getTime() / 1000).toFixed(0) - count_clines * interval - 20 * 3600;

            url = 'https://poloniex.com/public?command=returnChartData&currencyPair=' + symbol + '&start=' + start + '&end=9999999999&period=' + Interval;

            break;
    }

    return {
        url: url,
        convert: convert
    };
}



function pairBittrexToBinance(pair: string) {
    if (~pair.indexOf('USDT'))
        return pair.replace('USDT-', '') + 'USDT';
    if (~pair.indexOf('BTC'))
        return pair.replace('BTC-', '') + 'BTC';
    if (~pair.indexOf('ETH'))
        return pair.replace('ETH-', '') + 'ETH';
    if (~pair.indexOf('BNB'))
        return pair.replace('BNB-', '') + 'BNB';
}

function fiveTo15(array: any[]) {
    let newarr = [];
    while (array.length > 3) {
        let tree = array.splice(-3);
        let newCl = {
            T: tree[0].T,
            O: +tree[0].O,
            C: +tree[2].C,
            H: 0,
            L: Infinity
        };
        tree.forEach(cl => {
            if (newCl.H < cl.H)
                newCl.H = cl.H;

            if (newCl.L > cl.L)
                newCl.L = cl.L;
        });

        newarr.unshift(newCl);

    }

    return newarr;
}

function getInterval(market: MarketName, tf: number) {
    switch (market) {

        case ('bittrex'):
            if (tf == 1)
                return 'oneMin';
            if (tf == 5)
                return 'fiveMin';
            if (tf == 30)
                return 'thirtyMin';
            if (tf == 60)
                return 'hour';
            if (tf == 1440)
                return 'day';
            break;

        case ('binance'):
            if (tf == 1)
                return '1m';

            if (tf == 3)
                return '3m';

            if (tf == 5)
                return '5m';

            if (tf == 15)
                return '15m';

            if (tf == 30)
                return '30m';

            if (tf == 60)
                return '1h';

            if (tf == 120)
                return '2h';

            if (tf == 240)
                return '4h';

            if (tf == 360)
                return '6h';

            if (tf == 480)
                return '8h';

            if (tf == 720)
                return '12h';

            if (tf == 4320)
                return '3d';

            if (tf == 10080)
                return '1w';

            break;

        case ('poloniex'):
            if (tf == 5)
                return 300;
            if (tf == 15)
                return 900;
            if (tf == 30)
                return 1800;
            if (tf == 120)
                return 7200;
            break;

    }
}


export async function getClines(market: MarketName, pairName: string, count_clines: number, interval: number) {// ('binance','BTC-USDT', 14, 15) баржа, пара, период, TF в минутах

    let URL = getUrl(market, pairName, count_clines, interval);
    console.log(URL)
    const response = await fetch(URL.url);
    const json = await response.json();

    return convertClines(market, json, URL.convert, interval, count_clines);
}

function convertClines(market: MarketName, Clines: any, convert: boolean, interval: number, count_clines: number) {
    var convertedClines: any[] = [];
    if (market == 'bittrex') {
        if (!Clines.success) {
            console.log(Clines);
            return;
        }
        Clines = Clines.result;
        Clines = Clines.splice(-count_clines);
        if (convert) { // делаем 15ти минутки
            Clines = fiveTo15(Clines);
        }
        Clines.forEach((cl: any, i: number) => {
            var open_time = + (Date.parse(cl.T) / 1000).toFixed(0);
            convertedClines.push({
                open_time: +open_time,
                close_time: +open_time + interval * 60,
                open: +cl.O,
                close: +cl.C,
                max: +cl.H,
                min: +cl.L,
                volume: +cl.V,
                index: i
            });
        });

    }

    if (market == 'binance') {
        Clines.splice(-count_clines).forEach((cl: any, i: number) => {
            convertedClines.push({
                open_time: +(cl[0] / 1000).toFixed(0),
                close_time: +(cl[6] / 1000).toFixed(0),
                open: +cl[1],
                close: +cl[4],
                max: +cl[2],
                min: +cl[3],
                volume: +cl[5],
                index: i
            });
        });
    }

    if (market == 'poloniex') {

        Clines.splice(-count_clines).forEach((cl: any, i: number) => {
            convertedClines.push({
                open_time: +cl.date,
                close_time: +cl.date + Number(interval),
                open: +cl.open,
                close: +cl.close,
                max: +cl.high,
                min: +cl.low,
                index: i
            });
        });
    }

    return convertedClines;
}