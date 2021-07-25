import * as _ from 'underscore';
import axios from 'axios';
type MarketName = 'binance' | 'bittrex' | 'poloniex';



function formatDate(date: number) {
    return new Date(date).toLocaleString();
}

export type Set = {
    set: {
        input: number[];
        output: number[];
    },
    price: number;
    unix: number;
    time: string;
};

export type LastInput = { inp: number[], unix: number, price: number };
const separateArr = <Type>(arr: Type[], period: number) => {
    const inputs: Type[][] = [];
    let i = 0;
    while (i <= arr.length - period) {
      inputs.push(arr.slice(i, period + i));
      i++;
    }
    return inputs;
};
const prepInputFromCandels = (candels: Candel[]) => {
    const change1 = $u.mathChangedLast2Candels($u.resizeCandels(candels, 2), 1);
    const change2 = $u.mathChangedLast2Candels($u.resizeCandels(candels, 4), 1);
    const change3 = $u.mathChangedLast2Candels($u.resizeCandels(candels, 6), 1);
    const change4 = $u.mathChangedLast2Candels($u.resizeCandels(candels, 8), 1);
    const change5 = $u.mathChangedLast2Candels($u.resizeCandels(candels, 10), 1);
    const change6 = $u.mathChangedLast2Candels($u.resizeCandels(candels, 12), 1);
    const change7 = $u.mathChangedLast2Candels($u.resizeCandels(candels, 14), 1);
    // const input = normalizeArr([
    //   change1.price, change2.price, change3.price, change4.price, change5.price, change6.price,
    // ]).concat(normalizeArr([change1.volume, change2.volume, change3.volume, change4.volume, change5.volume, change6.volume]));
    return { inp: [change1.price, change2.price, change3.price, change4.price, change5.price, change6.price], unix: candels[candels.length - 1].close_time * 1000, time: formatDate(candels[candels.length - 1].close_time * 1000) };
};
// window.percentChange = percentChange;
const prepSet = (candels_: Candel[], offset = 1) => {
    const arrCandels = separateArr(candels_.slice(), 28);
    const set: Set[] = [];
    let lastInput: LastInput = { inp: [], unix: 0, price: 0 };
    arrCandels.forEach((currentCandels, i) => {
        const input = prepInputFromCandels(currentCandels).inp;
        if (!arrCandels[i + offset]) {
            const lastCandel = candels_[candels_.length - 1];
            lastInput = { inp: input, unix: lastCandel.close_time * 1000, price: lastCandel.max }; // for predict!
            return;
        }
        // const change5 = $u.mathChangedLast2Candels($u.resizeCandels(e, 10), 1);
        // console.log('',change3);
        const { close, max, close_time } = currentCandels[currentCandels.length - 1];

        // TODO: НЕ УДАЛЯТЬ! МАГИЯ!
        // const nextMaxClose = Math.max(arrCandels[i + 1][arrCandels[i + 1].length - 1].close, arrCandels[i + 1][arrCandels[i + 2].length - 2].close); //TODO:!!!!????
        // ФИТЧА: берем текущую и следующую цены и из них максимальную.
        // удобно тк если максимум равен текущей цене, то percentChange 0! Это более однозначно характеризует отношение текушщей и сл цены

        // const nextMaxClose = Math.max(arrCandels[i + 1][arrCandels[i + 1].length - 1].close, close);

        const arrNextOffsetPrices: number[] = [close];
        let p = 1;
        while (p <= offset){
            arrNextOffsetPrices.push(arrCandels[i + p][arrCandels[i + p].length - 1].close);
            p++;
        }
        const nextMaxClose = Math.max(...arrNextOffsetPrices);

        const output = $u.percentChange(close, nextMaxClose);
        set.push({
            set: {
                input,
                // input: normalizeArr([change1.price, change2.price, change3.price, change4.price, change5.price]),
                // output: [Number(output > 3)]
                output: [output]
            },
            price: close,
            unix: close_time * 1000,
            time: formatDate(close_time * 1000)
        });
    });

    const positive = _.shuffle(set.filter(e => e.set.output[0] > .5));
    // const flet = _.shuffle(set.filter(e => e.set.output[0] > .45 && e.set.output[0] < .55));
    // const flet = [];
    const negative = _.shuffle(set.filter(e => e.set.output[0] < .5));
    const count = Math.min(positive.length, negative.length);
    console.log({ positive, negative, count });
    // const filterred = _.shuffle(positive.concat(negative, flet));
    const filterred = set;
    // const allInputs = filterred
    //   .map(e => e.set.input)
    //   .reduce((s, a) => {
    //     return s.concat(a);
    //   }, []);

    const allOutputs = filterred
        .map(e => e.set.output[0]);
    // const maxInput = Math.max(...allInputs);
    // const minInput = Math.min(...allInputs);
    const maxOut = Math.max(...allOutputs);
    const minOut = Math.min(...allOutputs);
    // return;
    // console.log(changesOfPrices);
    // const max = Math.max(...changesOfPrices);
    // const min = Math.min(...changesOfPrices);
    const maxPrice = Math.max(...set.map(e => e.price));
    const minPrice = Math.min(...set.map(e => e.price));
    set.forEach(s => {
        // s.set.input = s.set.input.map(i => $u.normalise(i, minInput, maxInput));
        s.set.output = s.set.output.map(o => $u.normalise(o, minOut, maxOut));
        // s.price = $u.normalise(s.price, minPrice, maxPrice);
    });
    console.log('All set', set);
    // return _.shuffle(set);
    return { set, lastInput };
    // const positive = _.shuffle(set.filter(e => e.input.length && e.output[0]));
    // const negative = _.shuffle(set.filter(e => e.input.length && !e.output[0]));
    // const count = Math.min(positive.length, negative.length);
    // console.log(positive.length, negative.length, {count});
    // return _.shuffle(positive.splice(-count).concat(negative.splice(-count)));
    // return _.shuffle(positive.concat(negative));
};

export const getUrl = (market: MarketName, pairName: string, count_candels: number, interval: number) => {
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

    // console.log(pairName, symbol);
    let url;
    let Interval = getInterval(market, interval);
    let convert = false;

    switch (market) {
        case ('binance'):

            url = 'https://api.binance.com/api/v1/klines?limit=' + count_candels + '&symbol=' + symbol + '&interval=' + Interval;

            break;

        case ('bittrex'):
            if (Interval === 'Min15') {
                Interval = 'fiveMin';
                convert = true;
            }

            url = 'https://bittrex.com/Api/v2.0/pub/market/GetTicks?marketName=' + symbol + '&tickInterval=' + Interval + '&_=' + new Date().getTime();
            break;

        case ('poloniex'):

            const start = +(new Date().getTime() / 1000).toFixed(0) - count_candels * interval - 20 * 3600;

            url = 'https://poloniex.com/public?command=returnChartData&currencyPair=' + symbol + '&start=' + start + '&end=9999999999&period=' + Interval;

            break;
    }

    return {
        url,
        convert
    };
};

const normalizeArr = (data: number[]) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    console.log({max, min});
    return data.map(e => $u.normalise(e, min, max));
};
function mathChangedLast2Candels(candels: Candel[], round = 8) {
    const pred = candels[candels.length - 2];
    const last = candels[candels.length - 1];
    let volume = percentChange(pred.volume, last.volume);
    let price = percentChange(last.open, last.close);
    volume = +(volume.toFixed(round));
    price = +(price.toFixed(round));
    return {
        volume,
        price
    };
}

function resizeCandels(Candels: Candel[], crat: number) {
    const newCandels: Candel[] = [];
    const candels: Candel[] = JSON.parse(JSON.stringify(Candels));
    while (candels.length >= crat) {
        const cl = candels.splice(-crat);
        // console.log(cl[0], cl[crat-1])
        const open_time = cl[0].open_time;
        const close_time = cl[crat - 1].close_time;
        const open = cl[0].open;
        const close = cl[crat - 1].close;
        let volume = 0;

        const prices: number[] = [];
        cl.forEach(el => {
            prices.push(el.min, el.max);
            // console.log(volume, el.volume)
            volume += el.volume;
        });

        newCandels.push({
            open_time,
            close_time,
            open,
            close,
            volume,
            max: Math.max(...prices),
            min: Math.min(...prices)
        });

    }
    newCandels.reverse();
    return newCandels;
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
    const newarr = [];
    while (array.length > 3) {
        const tree = array.splice(-3);
        const newCl = {
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
            if (tf === 1)
                return 'oneMin';
            if (tf === 5)
                return 'fiveMin';
            if (tf === 30)
                return 'thirtyMin';
            if (tf === 60)
                return 'hour';
            if (tf === 1440)
                return 'day';
            break;

        case ('binance'):
            if (tf === 1)
                return '1m';

            if (tf === 3)
                return '3m';

            if (tf === 5)
                return '5m';

            if (tf === 15)
                return '15m';

            if (tf === 30)
                return '30m';

            if (tf === 60)
                return '1h';

            if (tf === 120)
                return '2h';

            if (tf === 240)
                return '4h';

            if (tf === 360)
                return '6h';

            if (tf === 480)
                return '8h';

            if (tf === 720)
                return '12h';

            if (tf === 4320)
                return '3d';

            if (tf === 10080)
                return '1w';

            break;

        case ('poloniex'):
            if (tf === 5)
                return 300;
            if (tf === 15)
                return 900;
            if (tf === 30)
                return 1800;
            if (tf === 120)
                return 7200;
            break;

    }
}

export type Candel = {
    close: number;
    close_time: number;
    index?: number;
    max: number;
    min: number;
    open: number;
    open_time: number;
    volume: number;
};
export async function getCandels(market: MarketName, pairName: string, count_candels: number, interval: number) {// ('binance','BTC-USDT', 14, 15) баржа, пара, период, TF в минутах

    const URL = getUrl(market, pairName, count_candels, interval);
    console.log(URL);

    const response = await axios(URL.url);
    const json = response.data;

    // const json = require('./candelsMap').default;
    // console.log('JS:', json);
    return convertCandels(market, json, URL.convert, interval, count_candels) as Candel[];
}

function convertCandels(market: MarketName, Candels: any, convert: boolean, interval: number, count_candels: number) {
    const convertedCandels: any[] = [];
    if (market === 'bittrex') {
        if (!Candels.success) {
            console.log(Candels);
            return;
        }
        Candels = Candels.result;
        Candels = Candels.splice(-count_candels);
        if (convert) { // делаем 15ти минутки
            Candels = fiveTo15(Candels);
        }
        Candels.forEach((cl: any, i: number) => {
            const open_time = + (Date.parse(cl.T) / 1000).toFixed(0);
            convertedCandels.push({
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

    if (market === 'binance') {
        Candels.splice(-count_candels).forEach((cl: any, i: number) => {
            convertedCandels.push({
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

    if (market === 'poloniex') {

        Candels.splice(-count_candels).forEach((cl: any, i: number) => {
            convertedCandels.push({
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

    return convertedCandels;
}

const percentChange = (a: number, b: number) => (b - a) / (a / 100);


const $u = {
    prepInputFromCandels,
    normalizeArr,
    separateArr,
    prepSet,
    mathChangedLast2Candels,
    resizeCandels,
    percentChange,
    formatDate,
    normalise(numb: number, min: number, max: number) {
        let res = Number(((numb - min) / (max - min)).toFixed(5));
        if (res > 1) res = 1;
        if (res < 0) res = 0;
        return res;
    },
    getCandels,
    unix(): number {
        return +(new Date().getTime());
    },
    wait: (s: number) => new Promise(r => setTimeout(r, s * 1000)),

    unixToStringHM(u: number) {
        const time = new Date(u);
        return addZero(time.getHours()) + ':' + addZero(time.getMinutes() + 1);
    },
    unixToStringDMY(u: number) {
        const time = new Date(u);
        return addZero(time.getDate()) + '/' + addZero(time.getMonth() + 1) + '/' + String(time.getFullYear()).slice(-2);
    },
    format(num: number) {
        if (!num) {
            num = 0;
        }
        let fixed = 2;
        if (num <= 0.00001) {
            fixed = 8;
        } else if (num <= 0.001) {
            fixed = 6;
        } else if (num <= 0.09) {
            fixed = 4;
        }
        if (+num === 0) {
            return '0.00';
        }

        const parts = num.toFixed(fixed).split('.');
        const main = parts[0];
        const len = main.length;
        let output = '';
        let i = len - 1;
        while (i >= 0) {
            output = main.charAt(i) + output;
            if ((len - i) % 3 === 0 && i > 0) {
                output = ',' + output;
            }
            --i;
        }
        if (parts.length > 1) {
            output = `${output}.${parts[1]}`;
        }
        return output;
    },
    throttle(func: () => void, ms: number) {

        let isThrottled = false;
        let savedArgs: any;
        let savedThis: any;
        function wrapper() {
            if (isThrottled) { // (2)
                savedArgs = arguments;
                savedThis = this;
                return;
            }
            func.apply(this, arguments); // (1)
            isThrottled = true;

            setTimeout(() => {
                isThrottled = false; // (3)
                if (savedArgs) {
                    wrapper.apply(savedThis, savedArgs);
                    savedArgs = savedThis = null;
                }
            }, ms);
        }

        return wrapper;
    }
};


function addZero(num: number) {
    if (num < 10) {
        return '0' + num;
    }
    return num;
}
export default $u;