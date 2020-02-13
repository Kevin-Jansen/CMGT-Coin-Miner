const figlet = require('figlet');
const chalk = require('chalk');
const spinner = require('cli-spinner').Spinner;

const axios = require('axios');
const crypto = require('crypto');

const inquirer = require('./modules/inquirer');
const helpers = require('./modules/helpers');
const hash = require('./modules/hash.js');

let fetchSpinner = new spinner('%s Blok ophalen');
let workingSpinner = new spinner('%s Bezig met minen');
let sessionBlocksMined = 0;

const start = async () => {
    console.clear();
    console.log(
        chalk.red(
            figlet.textSync('CMGT Coin Miner v1.0', {
                horizontalLayout: 'full'
            })
        )
    );

    // await countMyRecords();

    const command = await inquirer.askToStartMiner();

    if (command.start) {
        console.log(chalk.green('Starting CMGT Coin Miner'));
        mine();
    }
}

function mine() {
    fetchSpinner.start();

    axios.get('https://programmeren9.cmgt.hr.nl:8000/api/blockchain/next')
        .then(res => {

            fetchSpinner.stop(true);

            if (res.data.open) {
                workingSpinner.start();

                let string = hashFunc(hash.createLastBlockString(res.data));
                let newString = hash.createNewBlockString(string, res.data);

                doHash(newString)
            } else {
                console.log(chalk.yellow(`Block locked. Going idle for ${res.data.countdown}ms`));
                setTimeout(() => mine(), res.data.countdown)
            }
        })
        .catch(err => console.error(err));
}

function hashFunc(string) {

    // Replace spaces
    let arr = helpers.stringToArray(helpers.replaceWhitespaces(string));

    // Convert string to chars in array
    // let arr = s.split("");

    // Convert chars to ascii
    let ascii = [];
    for (let char of arr) {
        if (!isNaN(parseInt(char))) {
            ascii.push(char)
        } else {
            ascii.push(char.charCodeAt(0));
        }
    }

    // Split numbers
    let splitAscii = [];
    for (let num of ascii) {
        const nums = num.toString().split("");
        for (let n of nums) {
            splitAscii.push(parseInt(n))
        }
    }

    // Add till mod of 10
    let left = 10 - (splitAscii.length % 10);
    for (let i = 0; i < left; i++) {
        splitAscii.push(i)
    }

    // Make mod 10 arrays
    let multipleArrays = [];
    for (let i = 0; i < splitAscii.length; i += 10) {
        multipleArrays.push(splitAscii.slice(i, i + 10))
    }

    let finalArray = mod10(multipleArrays, ...multipleArrays.splice(0, 1));

    // Create string && hash that string
    const nonHashString = finalArray.toString().replace(/,/g, '');
    return crypto.createHash('sha256').update(nonHashString).digest('hex');
}

function doHash(string) {
    let nonce = 0;
    let hashed = hashFunc(string + nonce);

    while (hashed.substr(0, 4) !== '0000') {
        nonce++
        hashed = hashFunc(string + nonce);
    }
    axios.post('https://programmeren9.cmgt.hr.nl:8000/api/blockchain', {
        nonce: nonce,
        user: '0944552'
    }).then(res => {
        workingSpinner.stop(true);
        if (res.data.message === 'blockchain accepted, user awarded') {
            console.log('Acccepted hash: ', hashed);
            console.log('Status: ', res.data.message);
            console.log('Accepted nonce', nonce);

            goIdle();
        } else if (res.data.message = 'nonce not correct') {
            console.log(chalk.red(res.data.message))
            goIdle();
        } else {
            console.log(chalk.red(res.data.message))
            mine()
        }
    })
}

function goIdle() {
    axios.get('https://programmeren9.cmgt.hr.nl:8000/api/blockchain/next').then(res => {
        console.log(chalk.yellow(`Going idle for ${res.data.countdown}ms`))
        setTimeout(() => mine(), res.data.countdown)
    })
}

function mod10(collection, summary) {
    if (collection.length === 0) {
        return summary
    }
    return mod10(collection, addition(summary, ...collection.splice(0, 1)))
}

function addition(arr1, arr2) {
    let arr = [];

    for (let i = 0; i < 10; i++) {
        arr.push((arr1[i] + arr2[i]) % 10)
    }
    return arr;
}

function countMyRecords() {
    let recordCount = 0;

    axios.get('https://programmeren9.cmgt.hr.nl:8000/api/blockchain').then(res => {
        for (let item of res.data) {
            for (let transaction of item.data) {

                if (transaction.to === '0944552') {
                    recordCount++
                }
            }
        }
        console.log(chalk.green(`U heeft ${recordCount} CMGT Coins op uw naam staan.`))
    })

}

start();

